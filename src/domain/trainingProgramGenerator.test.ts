import { describe, expect, it } from 'vitest';
import {
  generateTrainingProgram,
  TrainingProgramGenerationError,
  type GenerateTrainingProgramInput,
  type TrainingProgramGeneratorCandidate,
  type TrainingProgramMuscleGroup,
} from './trainingProgramGenerator';
import { validateTrainingProgramDefinition } from './trainingProgram';

function primaryGroupFor(
  muscleGroup: TrainingProgramMuscleGroup,
): string {
  if (
    muscleGroup === 'LATS'
    || muscleGroup === 'UPPER_BACK'
    || muscleGroup === 'TRAPS'
    || muscleGroup === 'SPINAL_ERECTORS'
  ) return 'BACK';

  if (
    muscleGroup === 'ANTERIOR_DELTS'
    || muscleGroup === 'LATERAL_DELTS'
    || muscleGroup === 'POSTERIOR_DELTS'
  ) return 'SHOULDERS';

  return muscleGroup;
}

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
    primaryMuscleGroup: primaryGroupFor(muscleGroup),
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
  candidate('row', 'Barbell Row', 'UPPER_BACK', 'BARBELL', 'WEIGHT_REPS', ['LATS', 'BICEPS']),
  candidate('pulldown', 'Lat Pulldown', 'LATS'),
  candidate('machine-row', 'Machine Seated Row', 'UPPER_BACK', 'MACHINE', 'WEIGHT_REPS', ['LATS']),
  candidate('ohp', 'Overhead Press', 'ANTERIOR_DELTS', 'BARBELL', 'WEIGHT_REPS', ['LATERAL_DELTS', 'TRICEPS']),
  candidate('machine-shoulder', 'Machine Shoulder Press', 'ANTERIOR_DELTS', 'MACHINE', 'WEIGHT_REPS', ['LATERAL_DELTS']),
  candidate('lateral', 'Machine Lateral Raise', 'LATERAL_DELTS'),
  candidate('rear-delt', 'Reverse Pec Deck Fly', 'POSTERIOR_DELTS'),
  candidate('shrug', 'Machine Shrug', 'TRAPS'),
  candidate('erector', 'Back Extension', 'SPINAL_ERECTORS', 'SPECIALTY'),
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
    constraints: {
      revision: 0,
      entries: [],
    },
    durationWeeks: 4,
    startDate: '2026-09-24',
    trainingDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY', 'SATURDAY'],
    requestedSplit: 'AUTO',
    generatedAt: '2026-09-22T21:00:00.000Z',
    historyThroughDate: '2026-09-22',
    muscleVolumeMethodologyVersion: 'muscle-volume-v2',
  };
}

describe('training-program-v1 generator', () => {
  it('builds a deterministic valid four-week program', () => {
    const first = generateTrainingProgram(input());
    const second = generateTrainingProgram(input());

    expect(first).toEqual(second);
    expect(first.workouts).toHaveLength(16);
    expect(first.source).toEqual(expect.objectContaining({
      durationWeeks: 4,
      startDate: '2026-09-24',
      trainingDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY', 'SATURDAY'],
      requestedSplit: 'AUTO',
      resolvedSplit: 'UPPER_LOWER_X2',
    }));
    expect(first.workouts.slice(0, 4).map(
      (workout) => workout.scheduledDate,
    )).toEqual([
      '2026-09-25',
      '2026-09-26',
      '2026-09-28',
      '2026-09-30',
    ]);
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
      muscleVolumeMethodologyVersion: 'muscle-volume-v2',
    }));
  });

  it('supports an eight-week program without fabricating progression', () => {
    const data = input();
    data.durationWeeks = 8;

    const program = generateTrainingProgram(data);

    expect(program.weeks).toBe(8);
    expect(program.workouts).toHaveLength(32);
    expect(program.workouts[0]?.exercises).toEqual(
      program.workouts[16]?.exercises,
    );
    expect(validateTrainingProgramDefinition(program)).toEqual([]);
  });

  it('honours a compatible explicit split', () => {
    const data = input();
    data.requestedSplit = 'PUSH_PULL_UPPER_LOWER';

    const program = generateTrainingProgram(data);

    expect(program.source.requestedSplit).toBe('PUSH_PULL_UPPER_LOWER');
    expect(program.source.resolvedSplit).toBe('PUSH_PULL_UPPER_LOWER');
    expect(
      program.workouts
        .filter((workout) => workout.weekIndex === 0)
        .map((workout) => workout.title),
    ).toEqual(['Push', 'Pull', 'Upper', 'Lower']);
  });

  it('fails closed on incompatible split or weekday configuration', () => {
    const invalidSplit = input();
    invalidSplit.requestedSplit = 'PUSH_PULL_LEGS';

    try {
      generateTrainingProgram(invalidSplit);
      throw new Error('Expected incompatible split generation to fail.');
    } catch (error) {
      expect(error).toEqual(expect.objectContaining({
        code: 'INVALID_PROFILE',
      }));
    }

    const invalidDays = input();
    invalidDays.trainingDays = ['MONDAY', 'WEDNESDAY'];

    try {
      generateTrainingProgram(invalidDays);
      throw new Error('Expected invalid weekday generation to fail.');
    } catch (error) {
      expect(error).toEqual(expect.objectContaining({
        code: 'INVALID_PROFILE',
      }));
    }
  });

  it('records the real independent constraint revision', () => {
    const data = input();
    data.constraints = {
      revision: 7,
      entries: [],
    };

    const program = generateTrainingProgram(data);
    expect(program.source.constraintRevision).toBe(7);
  });

  it('hard-excludes constrained exercises from every generated week', () => {
    const data = input();
    data.constraints = {
      revision: 2,
      entries: [{
        exerciseId: 'row',
        kind: 'EXCLUDE',
        reason: 'PHYSICAL_LIMITATION',
      }],
    };

    const program = generateTrainingProgram(data);
    expect(
      program.workouts
        .flatMap((workout) => workout.exercises)
        .map((exercise) => exercise.exerciseId),
    ).not.toContain('row');
  });

  it('uses a compatible soft preference as a bounded ranking signal', () => {
    const data = input();
    data.constraints = {
      revision: 1,
      entries: [{
        exerciseId: 'machine-row',
        kind: 'PREFER',
        reason: 'PREFERENCE',
      }],
    };

    const program = generateTrainingProgram(data);
    const firstUpper = program.workouts.find(
      (workout) => workout.weekIndex === 0 && workout.sessionIndex === 0,
    );
    const upperBack = firstUpper?.exercises.find(
      (exercise) => exercise.targetMuscleGroup === 'UPPER_BACK',
    );

    expect(upperBack?.exerciseId).toBe('machine-row');
  });

  it('records granular target and contribution-role selection metadata', () => {
    const program = generateTrainingProgram(input());
    expect(
      program.workouts.flatMap((workout) => workout.exercises),
    ).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetMuscleGroup: expect.any(String),
        targetContributionRole: expect.stringMatching(/DIRECT|INDIRECT/),
        selectionIntent: expect.stringMatching(/COMPOUND|ACCESSORY/),
      }),
    ]));
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
