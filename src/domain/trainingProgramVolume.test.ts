import { describe, expect, it } from 'vitest';
import type {
  TrainingProgramExercisePrescription,
} from './trainingProgram';
import type {
  TrainingProgramGeneratorCandidate,
} from './trainingProgramGenerator';
import {
  buildTrainingProgramVolumeAdjustment,
  type TrainingProgramVolumeGuidance,
} from './trainingProgramVolume';

function exercise(
  id: string,
  target: TrainingProgramExercisePrescription['targetMuscleGroup'],
  sets = 3,
  intent: TrainingProgramExercisePrescription['selectionIntent'] = 'COMPOUND',
): TrainingProgramExercisePrescription {
  return {
    exerciseId: id,
    canonicalName: id === 'bench' ? 'Bench Press' : 'Leg Extension',
    targetMuscleGroup: target,
    targetContributionRole: 'DIRECT',
    selectionIntent: intent,
    measurementType: 'WEIGHT_REPS',
    orderIndex: id === 'bench' ? 0 : 1,
    workingSets: sets,
    repsMin: 6,
    repsMax: 10,
    targetWeightKg: null,
    bodyweightMode: null,
    supersetGroupIndex: null,
    supersetOrder: null,
  };
}

const candidates: TrainingProgramGeneratorCandidate[] = [
  {
    exerciseId: 'bench',
    canonicalName: 'Bench Press',
    measurementType: 'WEIGHT_REPS',
    primaryMuscleGroup: 'CHEST',
    workoutType: 'BARBELL',
    supportsAddedWeight: false,
    supportsAssisted: false,
    volumeEligible: true,
    contributions: [
      { muscleGroup: 'CHEST', role: 'DIRECT', weight: 1 },
      { muscleGroup: 'TRICEPS', role: 'INDIRECT', weight: 0.5 },
    ],
  },
  {
    exerciseId: 'legs',
    canonicalName: 'Leg Extension',
    measurementType: 'WEIGHT_REPS',
    primaryMuscleGroup: 'QUADS',
    workoutType: 'MACHINE',
    supportsAddedWeight: false,
    supportsAssisted: false,
    volumeEligible: true,
    contributions: [
      { muscleGroup: 'QUADS', role: 'DIRECT', weight: 1 },
    ],
  },
];

function guidance(
  muscleGroup: TrainingProgramVolumeGuidance['muscleGroup'],
  action: TrainingProgramVolumeGuidance['action'],
  overrides: Partial<TrainingProgramVolumeGuidance> = {},
): TrainingProgramVolumeGuidance {
  return {
    muscleGroup,
    action,
    effectiveSets: 7,
    targetMin: 10,
    targetMax: 14,
    highReviewAbove: 18,
    volumeEvidenceLimited: false,
    performanceTrend: 'PLATEAU',
    ...overrides,
  };
}

describe('training program total-volume editor', () => {
  it('adds a set where the current evidence most supports adding volume', () => {
    const result = buildTrainingProgramVolumeAdjustment({
      exercises: [
        exercise('bench', 'CHEST'),
        exercise('legs', 'QUADS', 3, 'ACCESSORY'),
      ],
      candidates,
      guidance: [
        guidance('CHEST', 'ADD_VOLUME_CAUTIOUSLY'),
        guidance('QUADS', 'REDUCE_VOLUME_CAUTIOUSLY', {
          effectiveSets: 16,
          performanceTrend: 'DECLINING',
        }),
      ],
      direction: 'ADD',
    });

    expect(result).toEqual(expect.objectContaining({
      currentTotalWorkingSets: 6,
      nextTotalWorkingSets: 7,
      changedExerciseId: 'bench',
      overrides: [{ exerciseId: 'bench', workingSets: 4 }],
    }));
  });

  it('removes a set where the current evidence supports reducing volume', () => {
    const result = buildTrainingProgramVolumeAdjustment({
      exercises: [
        exercise('bench', 'CHEST'),
        exercise('legs', 'QUADS', 3, 'ACCESSORY'),
      ],
      candidates,
      guidance: [
        guidance('CHEST', 'ADD_VOLUME_CAUTIOUSLY'),
        guidance('QUADS', 'REDUCE_VOLUME_CAUTIOUSLY', {
          effectiveSets: 16,
          performanceTrend: 'DECLINING',
        }),
      ],
      direction: 'REMOVE',
    });

    expect(result?.changedExerciseId).toBe('legs');
    expect(result?.overrides).toEqual([
      { exerciseId: 'legs', workingSets: 2 },
    ]);
  });

  it('warns when removing work against a supported add-volume signal', () => {
    const result = buildTrainingProgramVolumeAdjustment({
      exercises: [exercise('bench', 'CHEST', 2)],
      candidates,
      guidance: [guidance('CHEST', 'ADD_VOLUME_CAUTIOUSLY')],
      direction: 'REMOVE',
    });

    expect(result?.warnings).toEqual([
      expect.objectContaining({
        muscleGroup: 'CHEST',
        tone: 'CAUTION',
        title: 'Lower than the current recommendation',
      }),
    ]);
  });

  it('warns strongly when adding work against a sustained negative reduce signal', () => {
    const result = buildTrainingProgramVolumeAdjustment({
      exercises: [exercise('legs', 'QUADS', 3, 'ACCESSORY')],
      candidates,
      guidance: [guidance('QUADS', 'REDUCE_VOLUME_CAUTIOUSLY', {
        effectiveSets: 16,
        performanceTrend: 'REGRESSING',
      })],
      direction: 'ADD',
    });

    expect(result?.warnings[0]).toEqual(expect.objectContaining({
      muscleGroup: 'QUADS',
      tone: 'HIGH',
      title: 'Current data supports less volume',
    }));
  });

  it('warns before adding volume into a current negative hold-and-review trend', () => {
    const result = buildTrainingProgramVolumeAdjustment({
      exercises: [exercise('bench', 'CHEST', 2)],
      candidates,
      guidance: [guidance('CHEST', 'HOLD_AND_REVIEW', {
        effectiveSets: 7,
        performanceTrend: 'DECLINING',
      })],
      direction: 'ADD',
    });

    expect(result?.warnings[0]).toEqual(expect.objectContaining({
      muscleGroup: 'CHEST',
      tone: 'HIGH',
      title: 'Current trend says hold before adding work',
    }));
  });

  it('does not turn a monitor signal into a warning while performance is improving', () => {
    const result = buildTrainingProgramVolumeAdjustment({
      exercises: [exercise('legs', 'QUADS', 3, 'ACCESSORY')],
      candidates,
      guidance: [guidance('QUADS', 'MONITOR', {
        effectiveSets: 15,
        performanceTrend: 'IMPROVING',
      })],
      direction: 'ADD',
    });

    expect(result?.warnings).toEqual([]);
  });

  it('stops at the domain set limits', () => {
    expect(buildTrainingProgramVolumeAdjustment({
      exercises: [exercise('bench', 'CHEST', 8)],
      candidates,
      guidance: [],
      direction: 'ADD',
    })).toBeNull();

    expect(buildTrainingProgramVolumeAdjustment({
      exercises: [exercise('bench', 'CHEST', 1)],
      candidates,
      guidance: [],
      direction: 'REMOVE',
    })).toBeNull();
  });
});
