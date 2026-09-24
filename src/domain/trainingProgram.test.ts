import { describe, expect, it } from 'vitest';
import {
  TRAINING_PROGRAM_VERSION,
  isValidTrainingProgramExecutionLineage,
  type TrainingProgramDefinition,
  validateTrainingProgramDefinition,
} from './trainingProgram';

function program(): TrainingProgramDefinition {
  return {
    version: TRAINING_PROGRAM_VERSION,
    goal: 'BALANCED',
    weeks: 4,
    sessionsPerWeek: 2,
    source: {
      generatorVersion: TRAINING_PROGRAM_VERSION,
      generatedAt: '2026-09-22T20:00:00.000Z',
      historyThroughDate: '2026-09-22',
      muscleVolumeMethodologyVersion: 'muscle-volume-v2',
      profileRevision: 1,
      constraintRevision: 1,
      durationWeeks: 4,
      startDate: '2026-09-24',
      trainingDays: ['MONDAY', 'THURSDAY'],
      requestedSplit: 'AUTO',
      resolvedSplit: 'FULL_BODY_AB',
    },
    workouts: Array.from({ length: 8 }, (_, index) => ({
      weekIndex: Math.floor(index / 2),
      sessionIndex: index % 2,
      scheduledDate: [
        '2026-09-24',
        '2026-09-28',
        '2026-10-01',
        '2026-10-05',
        '2026-10-08',
        '2026-10-12',
        '2026-10-15',
        '2026-10-19',
      ][index]!,
      title: index % 2 === 0 ? 'Full Body A' : 'Full Body B',
      exercises: [
        { exerciseId: `exercise-${index}-1`, canonicalName: 'Back Squat', targetMuscleGroup: 'QUADS', targetContributionRole: 'DIRECT', selectionIntent: 'COMPOUND', measurementType: 'WEIGHT_REPS', orderIndex: 0, workingSets: 3, repsMin: 5, repsMax: 8, targetWeightKg: null, bodyweightMode: null, supersetGroupIndex: null, supersetOrder: null },
        { exerciseId: `exercise-${index}-2`, canonicalName: 'Pull-Up', targetMuscleGroup: 'LATS', targetContributionRole: 'DIRECT', selectionIntent: 'COMPOUND', measurementType: 'BODYWEIGHT_REPS', orderIndex: 1, workingSets: 3, repsMin: 5, repsMax: 10, targetWeightKg: null, bodyweightMode: 'BODYWEIGHT', supersetGroupIndex: null, supersetOrder: null },
      ],
    })),
  };
}

describe('trainingProgram domain contract', () => {
  it('accepts a complete scheduled four-week deterministic program shape', () => expect(validateTrainingProgramDefinition(program())).toEqual([]));

  it('requires the full requested duration of weekly sessions', () => {
    const candidate = program();
    candidate.workouts.pop();
    expect(validateTrainingProgramDefinition(candidate)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'WORKOUT_COUNT' })]));
  });

  it('allows the locked eight-week duration', () => {
    const candidate = program();
    candidate.weeks = 8;
    candidate.source.durationWeeks = 8;
    const scheduledDates = [
      '2026-09-24', '2026-09-28',
      '2026-10-01', '2026-10-05',
      '2026-10-08', '2026-10-12',
      '2026-10-15', '2026-10-19',
      '2026-10-22', '2026-10-26',
      '2026-10-29', '2026-11-02',
      '2026-11-05', '2026-11-09',
      '2026-11-12', '2026-11-16',
    ];
    candidate.workouts = Array.from({ length: 16 }, (_, index) => {
      const source = program().workouts[index % 8]!;
      return {
        ...source,
        weekIndex: Math.floor(index / 2),
        sessionIndex: index % 2,
        scheduledDate: scheduledDates[index]!,
        exercises: source.exercises.map((exercise) => ({ ...exercise })),
      };
    });

    expect(validateTrainingProgramDefinition(candidate)).toEqual([]);
  });

  it('rejects a workout date that does not match the immutable schedule', () => {
    const candidate = program();
    candidate.workouts[0].scheduledDate = '2026-09-25';

    expect(validateTrainingProgramDefinition(candidate)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'SCHEDULE_DATE' }),
      ]),
    );
  });

  it('keeps generated sessions within the existing eight-exercise preset boundary', () => {
    const candidate = program();
    candidate.workouts[0].exercises = Array.from({ length: 9 }, (_, index) => ({ ...candidate.workouts[0].exercises[0], exerciseId: `exercise-extra-${index}`, canonicalName: `Exercise ${index}`, orderIndex: index }));
    expect(validateTrainingProgramDefinition(candidate)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'EXERCISE_COUNT' })]));
  });

  it('rejects duplicate exercise identities inside one generated session', () => {
    const candidate = program();
    candidate.workouts[0].exercises[1].exerciseId = candidate.workouts[0].exercises[0].exerciseId;
    expect(validateTrainingProgramDefinition(candidate)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'DUPLICATE_EXERCISE' })]));
  });

  it('does not allow weighted exercises to carry bodyweight load modes', () => {
    const candidate = program();
    candidate.workouts[0].exercises[0].bodyweightMode = 'ADDED_WEIGHT';
    expect(validateTrainingProgramDefinition(candidate)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'LOAD_MODE' })]));
  });

  it('keeps plain bodyweight prescriptions free of invented external load', () => {
    const candidate = program();
    candidate.workouts[0].exercises[1].targetWeightKg = 10;
    expect(validateTrainingProgramDefinition(candidate)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'LOAD_VALUE' })]));
  });

  it('allows explicit added-weight mode without fabricating a load', () => {
    const candidate = program();
    candidate.workouts[0].exercises[1].bodyweightMode = 'ADDED_WEIGHT';
    candidate.workouts[0].exercises[1].targetWeightKg = null;
    expect(validateTrainingProgramDefinition(candidate)).toEqual([]);
  });

  it('requires auditable granular target, contribution role, and selection intent', () => {
    const candidate = program();
    candidate.workouts[0].exercises[0].targetMuscleGroup = 'BACK' as 'QUADS';
    expect(validateTrainingProgramDefinition(candidate)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'SELECTION_METADATA' }),
      ]),
    );
  });

  it('keeps planned-vs-actual execution lineage explicit', () => {
    expect(isValidTrainingProgramExecutionLineage({
      sourceProgramId: 'program-1',
      sourceProgramWorkoutId: 'planned-1',
      workoutSessionId: 'session-1',
      status: 'COMPLETED_OWN_WORKOUT',
    })).toBe(true);

    expect(isValidTrainingProgramExecutionLineage({
      sourceProgramId: 'program-1',
      sourceProgramWorkoutId: 'planned-1',
      workoutSessionId: null,
      status: 'MISSED',
    })).toBe(true);

    expect(isValidTrainingProgramExecutionLineage({
      sourceProgramId: 'program-1',
      sourceProgramWorkoutId: 'planned-1',
      workoutSessionId: null,
      status: 'COMPLETED_PROGRAMMED',
    })).toBe(false);
  });

  it('requires Superset metadata to form a complete group', () => {
    const candidate = program();
    candidate.workouts[0].exercises[0].supersetGroupIndex = 0;
    candidate.workouts[0].exercises[0].supersetOrder = 0;
    expect(validateTrainingProgramDefinition(candidate)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'SUPERSET' })]));

    candidate.workouts[0].exercises[1].supersetGroupIndex = 0;
    candidate.workouts[0].exercises[1].supersetOrder = 1;
    expect(validateTrainingProgramDefinition(candidate)).toEqual([]);
  });
});
