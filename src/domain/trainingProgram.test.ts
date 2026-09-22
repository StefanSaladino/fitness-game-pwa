import { describe, expect, it } from 'vitest';
import { TRAINING_PROGRAM_VERSION, type TrainingProgramDefinition, validateTrainingProgramDefinition } from './trainingProgram';

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
      muscleVolumeMethodologyVersion: 'muscle-volume-v1',
      profileRevision: 1,
      constraintRevision: 1,
    },
    workouts: Array.from({ length: 8 }, (_, index) => ({
      weekIndex: Math.floor(index / 2),
      sessionIndex: index % 2,
      title: index % 2 === 0 ? 'Full Body A' : 'Full Body B',
      exercises: [
        { exerciseId: `exercise-${index}-1`, canonicalName: 'Back Squat', measurementType: 'WEIGHT_REPS', orderIndex: 0, workingSets: 3, repsMin: 5, repsMax: 8, targetWeightKg: null, bodyweightMode: null, supersetGroupIndex: null, supersetOrder: null },
        { exerciseId: `exercise-${index}-2`, canonicalName: 'Pull-Up', measurementType: 'BODYWEIGHT_REPS', orderIndex: 1, workingSets: 3, repsMin: 5, repsMax: 10, targetWeightKg: null, bodyweightMode: 'BODYWEIGHT', supersetGroupIndex: null, supersetOrder: null },
      ],
    })),
  };
}

describe('trainingProgram domain contract', () => {
  it('accepts a complete four-week deterministic program shape', () => expect(validateTrainingProgramDefinition(program())).toEqual([]));

  it('requires exactly four weeks of requested weekly sessions', () => {
    const candidate = program();
    candidate.workouts.pop();
    expect(validateTrainingProgramDefinition(candidate)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'WORKOUT_COUNT' })]));
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
