import { describe, expect, it } from 'vitest';
import type { TrainingProgramExercisePrescription } from './trainingProgram';
import type {
  TrainingProgramGeneratorCandidate,
  TrainingProgramGeneratorProfile,
} from './trainingProgramGenerator';
import { findTrainingProgramSubstitution } from './trainingProgramSubstitution';

const profile: TrainingProgramGeneratorProfile = {
  goal: 'BALANCED',
  sessionsPerWeek: 4,
  accessMode: 'COMMERCIAL_GYM',
  equipmentKeys: [],
  revision: 5,
};

const original: TrainingProgramExercisePrescription = {
  exerciseId: 'lat-pulldown',
  canonicalName: 'Lat Pulldown',
  targetMuscleGroup: 'LATS',
  targetContributionRole: 'DIRECT',
  selectionIntent: 'ACCESSORY',
  measurementType: 'WEIGHT_REPS',
  orderIndex: 0,
  workingSets: 3,
  repsMin: 8,
  repsMax: 12,
  targetWeightKg: null,
  bodyweightMode: null,
  supersetGroupIndex: null,
  supersetOrder: null,
};

function candidate(
  exerciseId: string,
  canonicalName: string,
  role: 'DIRECT' | 'INDIRECT' = 'DIRECT',
  workoutType = 'CABLE',
): TrainingProgramGeneratorCandidate {
  return {
    exerciseId,
    canonicalName,
    measurementType: 'WEIGHT_REPS',
    primaryMuscleGroup: 'BACK',
    workoutType,
    supportsAddedWeight: false,
    supportsAssisted: false,
    volumeEligible: true,
    contributions: [{
      muscleGroup: 'LATS',
      role,
      weight: role === 'DIRECT' ? 1 : 0.5,
    }],
  };
}

const candidates = [
  candidate('lat-pulldown', 'Lat Pulldown'),
  candidate('straight-arm', 'Straight-Arm Pulldown'),
  candidate('pullover', 'Machine Pullover', 'DIRECT', 'MACHINE'),
  candidate('indirect-row', 'Upper Back Row', 'INDIRECT', 'MACHINE'),
];

describe('training program substitution', () => {
  it('preserves granular target, contribution role, intent, and measurement type', () => {
    const result = findTrainingProgramSubstitution({
      original,
      profile,
      constraints: { revision: 2, entries: [] },
      candidates,
      history: [],
      occupiedExerciseIds: [],
    });

    expect(result).not.toBeNull();
    expect(result?.replacement).toEqual(expect.objectContaining({
      targetMuscleGroup: 'LATS',
      targetContributionRole: 'DIRECT',
      selectionIntent: 'ACCESSORY',
      measurementType: 'WEIGHT_REPS',
    }));
    expect(result?.replacement.exerciseId).not.toBe('lat-pulldown');
  });

  it('will not replace direct lat work with indirect-only lat work', () => {
    const result = findTrainingProgramSubstitution({
      original,
      profile,
      constraints: { revision: 1, entries: [] },
      candidates: [
        candidate('lat-pulldown', 'Lat Pulldown'),
        candidate('indirect-row', 'Upper Back Row', 'INDIRECT'),
      ],
      history: [],
      occupiedExerciseIds: [],
    });

    expect(result).toBeNull();
  });

  it('honours hard, occupied, and temporary exclusions', () => {
    const result = findTrainingProgramSubstitution({
      original,
      profile,
      constraints: {
        revision: 3,
        entries: [{
          exerciseId: 'straight-arm',
          kind: 'EXCLUDE',
          reason: 'PHYSICAL_LIMITATION',
        }],
      },
      candidates,
      history: [],
      occupiedExerciseIds: ['pullover'],
      temporaryExcludedExerciseIds: ['indirect-row'],
    });

    expect(result).toBeNull();
  });

  it('uses a compatible soft preference as a bounded tie-break signal', () => {
    const result = findTrainingProgramSubstitution({
      original,
      profile,
      constraints: {
        revision: 4,
        entries: [{
          exerciseId: 'pullover',
          kind: 'PREFER',
          reason: 'PREFERENCE',
        }],
      },
      candidates,
      history: [],
      occupiedExerciseIds: [],
    });

    expect(result?.replacement.exerciseId).toBe('pullover');
  });

  it('fails closed when equipment does not support a valid substitute', () => {
    const result = findTrainingProgramSubstitution({
      original,
      profile: {
        ...profile,
        accessMode: 'CUSTOM',
        equipmentKeys: [],
      },
      constraints: { revision: 1, entries: [] },
      candidates,
      history: [],
      occupiedExerciseIds: [],
    });

    expect(result).toBeNull();
  });
});
