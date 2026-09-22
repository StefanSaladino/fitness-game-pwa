import { describe, expect, it } from 'vitest';
import {
  generateTrainingProgram,
  TrainingProgramGenerationError,
  type GenerateTrainingProgramInput,
  type TrainingProgramGeneratorCandidate,
  type TrainingProgramMuscleGroup,
} from './trainingProgramGenerator';
import { validateTrainingProgramDefinition } from './trainingProgram';

function candidate(
  id: string,
  canonicalName: string,
  muscleGroup: TrainingProgramMuscleGroup,
  workoutType = 'MACHINE',
  measurementType = 'WEIGHT_REPS',
  indirect: TrainingProgramMuscleGroup[] = [],
): TrainingProgramGeneratorCandidate {
  return {
    exerciseId: id,
    canonicalName,
    measurementType,
    primaryMuscleGroup: muscleGroup,
    workoutType,
    supportsAddedWeight: measurementType === 'BODYWEIGHT_REPS',
    supportsAssisted: false,
    volumeEligible: true,
    contributions: [
      { muscleGroup, role: 'DIRECT', weight: 1 },
      ...indirect.map((group) => ({
        muscleGroup: group,
        role: 'INDIRECT' as const,
        weight: 0.5,
      })),
    ],
  };
}

const candidates: TrainingProgramGeneratorCandidate[] = [
  candidate('squat', 'Back Squat', 'QUADS', 'BARBELL', 'WEIGHT_REPS', ['GLUTES']),
  candidate('leg-press', 'Leg Press', 'QUADS'),
  candidate('leg-ext', 'Leg Extension', 'QUADS'),
  candidate('rdl', 'Romanian Deadlift', 'HAMSTRINGS', 'BARBELL', 'WEIGHT_REPS', ['GLUTES']),
  candidate('leg-curl', 'Lying Leg Curl', 'HAMSTRINGS'),
  candidate('hip-thrust', 'Barbell Hip Thrust', 'GLUTES', 'BARBELL'),
  candidate('glute-machine', 'Machine Glute Kickback', 'GLUTES'),
  candidate('bench', 'Barbell Bench Press', 'CHEST', 'BARBELL', 'WEIGHT_REPS', ['TRICEPS']),
  candidate('chest-press', 'Machine Chest Press', 'CHEST'),
  candidate('pushup', 'Push-Up', 'CHEST', 'BODYWEIGHT', 'BODYWEIGHT_REPS', ['TRICEPS']),
  candidate('row', 'Barbell Row', 'BACK', 'BARBELL', 'WEIGHT_REPS', ['BICEPS']),
  candidate('pulldown', 'Lat Pulldown', 'BACK'),
  candidate('machine-row', 'Machine Seated Row', 'BACK'),
  candidate('ohp', 'Overhead Press', 'SHOULDERS', 'BARBELL', 'WEIGHT_REPS', ['TRICEPS']),
  candidate('machine-shoulder', 'Machine Shoulder Press', 'SHOULDERS'),
  candidate('lateral', 'Machine Lateral Raise', 'SHOULDERS'),
  candidate('curl', 'Machine Biceps Curl', 'BICEPS'),
  candidate('curl-2', 'Single-Arm Machine Biceps Curl', 'BICEPS'),
  candidate('triceps', 'Machine Triceps Extension', 'TRICEPS'),
  candidate('triceps-2', 'Machine Triceps Press', 'TRICEPS'),
  candidate('calf', 'Standing Calf Raise Machine', 'CALVES'),
  candidate('calf-2', 'Seated Calf Raise Machine', 'CALVES'),
  candidate('core', 'Crunch', 'CORE', 'BODYWEIGHT', 'BODYWEIGHT_REPS'),
  candidate('core-2', 'Dead Bug', 'CORE', 'BODYWEIGHT', 'BODYWEIGHT_REPS'),
  candidate('forearm', 'Wrist Curl Machine', 'FOREARMS_GRIP'),
];

function input(): GenerateTrainingProgramInput {
  return {
    profile: {
      goal: 'BALANCED',
      sessionsPerWeek: 4,
      accessMode: 'COMMERCIAL_GYM',
      equipmentKeys: [],
      revision: 5,
    },
    candidates,
    history: [],
    volumeSignals: [],
    generatedAt: '2026-09-22T21:00:00.000Z',
    historyThroughDate: '2026-09-22',
    muscleVolumeMethodologyVersion: 'muscle-volume-v1',
  };
}

describe('training-program-v1 generator', () => {
  it('builds a deterministic valid four-week program', () => {
    const first = generateTrainingProgram(input());
    const second = generateTrainingProgram(input());

    expect(first).toEqual(second);
    expect(first.workouts).toHaveLength(16);
    expect(first.workouts.every((workout) => workout.exercises.length >= 4)).toBe(true);
    expect(validateTrainingProgramDefinition(first)).toEqual([]);
  });

  it('records the exact source profile revision and history cutoff', () => {
    const program = generateTrainingProgram(input());
    expect(program.source).toEqual(expect.objectContaining({
      generatorVersion: 'training-program-v1',
      profileRevision: 5,
      constraintRevision: 0,
      historyThroughDate: '2026-09-22',
      muscleVolumeMethodologyVersion: 'muscle-volume-v1',
    }));
  });

  it('reuses an established same-exercise reference load when reps already match', () => {
    const data = input();
    data.history = [{
      exerciseId: 'bench',
      metricType: 'E1RM',
      bestValue: 120,
      referenceWeightKg: 80,
      referenceReps: 6,
      sessionCount: 8,
      observationCount: 12,
      achievedAt: '2026-09-18T12:00:00.000Z',
      lastPerformedAt: '2026-09-20T12:00:00.000Z',
    }];

    const program = generateTrainingProgram(data);
    const bench = program.workouts
      .flatMap((workout) => workout.exercises)
      .find((exercise) => exercise.exerciseId === 'bench');

    expect(bench).toBeDefined();
    expect(bench?.targetWeightKg).toBe(80);
  });

  it('does not fabricate load from sparse same-exercise history', () => {
    const data = input();
    data.history = [{
      exerciseId: 'bench',
      metricType: 'E1RM',
      bestValue: 120,
      referenceWeightKg: 80,
      referenceReps: 6,
      sessionCount: 1,
      observationCount: 1,
      achievedAt: '2026-09-18T12:00:00.000Z',
      lastPerformedAt: '2026-09-20T12:00:00.000Z',
    }];

    const program = generateTrainingProgram(data);
    const bench = program.workouts
      .flatMap((workout) => workout.exercises)
      .find((exercise) => exercise.exerciseId === 'bench');

    expect(bench?.targetWeightKg).toBeNull();
  });

  it('uses Phase 19 corrective signals only as bounded set-count changes', () => {
    const data = input();
    data.volumeSignals = [{
      muscleGroup: 'CHEST',
      action: 'ADD_VOLUME_CAUTIOUSLY',
      suggestedEffectiveSetChange: 1,
    }];

    const program = generateTrainingProgram(data);
    const chest = program.workouts[0]!.exercises.find(
      (exercise) => ['bench', 'chest-press', 'pushup'].includes(exercise.exerciseId),
    );

    expect(chest?.workingSets).toBeGreaterThanOrEqual(3);
    expect(chest?.workingSets).toBeLessThanOrEqual(4);
  });

  it('fails honestly when equipment leaves too few compatible exercises', () => {
    const data = input();
    data.profile = {
      ...data.profile,
      accessMode: 'CUSTOM',
      equipmentKeys: [],
      sessionsPerWeek: 4,
    };

    expect(() => generateTrainingProgram(data)).toThrow(TrainingProgramGenerationError);

    try {
      generateTrainingProgram(data);
    } catch (error) {
      expect(error).toEqual(expect.objectContaining({
        code: 'INSUFFICIENT_CANDIDATES',
      }));
    }
  });

  it('never uses a Phase 19 ineligible exercise for a generated muscle slot', () => {
    const data = input();
    data.candidates = [
      ...data.candidates,
      {
        ...candidate('excluded', 'Excluded Chest Press', 'CHEST'),
        volumeEligible: false,
      },
    ];

    const program = generateTrainingProgram(data);
    expect(
      program.workouts
        .flatMap((workout) => workout.exercises)
        .map((exercise) => exercise.exerciseId),
    ).not.toContain('excluded');
  });
});
