import { describe, expect, it } from 'vitest';
import {
  buildTrainingProgramAdaptationPlan,
  type TrainingProgramAdaptationActualExerciseEvidence,
  type TrainingProgramAdaptationContext,
  type TrainingProgramAdaptationFutureExercise,
  type TrainingProgramAdaptationVolumeSignal,
} from './trainingProgramAdaptation';

function actual(
  overrides: Partial<TrainingProgramAdaptationActualExerciseEvidence> = {},
): TrainingProgramAdaptationActualExerciseEvidence {
  return {
    exerciseId: 'squat',
    canonicalName: 'Back Squat',
    measurementType: 'WEIGHT_REPS',
    plannedWorkingSets: 2,
    standardWorkingSetCount: 2,
    nonstandardCompletedSetCount: 0,
    minCompletedReps: 8,
    maxCompletedReps: 8,
    minWeightKg: 100,
    maxWeightKg: 100,
    plainBodyweightSetCount: 0,
    addedWeightSetCount: 0,
    assistedSetCount: 0,
    ...overrides,
  };
}

function future(
  id: string,
  overrides: Partial<TrainingProgramAdaptationFutureExercise> = {},
): TrainingProgramAdaptationFutureExercise {
  return {
    programExerciseId: id,
    programWorkoutId: `workout-${id}`,
    scheduledDate: id === 'future-1' ? '2026-10-01' : '2026-10-08',
    exerciseId: 'squat',
    canonicalName: 'Back Squat',
    targetMuscleGroup: 'QUADS',
    targetContributionRole: 'DIRECT',
    selectionIntent: 'COMPOUND',
    measurementType: 'WEIGHT_REPS',
    workingSets: 2,
    repsMin: 5,
    repsMax: 8,
    targetWeightKg: 100,
    bodyweightMode: null,
    orderIndex: 0,
    currentlyExcluded: false,
    ...overrides,
  };
}

function context(
  overrides: Partial<TrainingProgramAdaptationContext> = {},
): TrainingProgramAdaptationContext {
  return {
    programId: 'program-1',
    programRevision: 2,
    triggerProgramWorkoutId: 'trigger-plan',
    triggerWorkoutSessionId: 'trigger-session',
    triggerScheduledDate: '2026-09-24',
    triggerScoringDate: '2026-09-24',
    triggerExecutionStatus: 'COMPLETED_PROGRAMMED',
    alreadyAdapted: false,
    existingAdaptation: null,
    actualExercises: [actual()],
    futureExercises: [future('future-1'), future('future-2')],
    ...overrides,
  };
}

function signal(
  overrides: Partial<TrainingProgramAdaptationVolumeSignal> = {},
): TrainingProgramAdaptationVolumeSignal {
  return {
    muscleGroup: 'QUADS',
    action: 'ADD_VOLUME_CAUTIOUSLY',
    suggestedEffectiveSetChange: 2,
    volumeStatus: 'BELOW_TARGET',
    performanceTrend: 'PLATEAU',
    performancePersistence: 'SUSTAINED',
    performanceConfidence: 'MODERATE',
    ...overrides,
  };
}

describe('training program adaptive progression', () => {
  it('progresses successful top-of-range weighted work conservatively', () => {
    const plan = buildTrainingProgramAdaptationPlan(context(), []);

    expect(plan.reasonCodes).toEqual(['LOAD_PROGRESSED']);
    expect(plan.changes).toEqual([
      expect.objectContaining({
        programExerciseId: 'future-1',
        field: 'TARGET_WEIGHT_KG',
        oldValue: 100,
        newValue: 102.5,
        reasonCode: 'PROGRESS_LOAD_TOP_OF_RANGE',
      }),
      expect.objectContaining({
        programExerciseId: 'future-2',
        field: 'TARGET_WEIGHT_KG',
        oldValue: 100,
        newValue: 102.5,
        reasonCode: 'PROGRESS_LOAD_TOP_OF_RANGE',
      }),
    ]);
  });

  it('establishes a previously open load from successful completed work', () => {
    const plan = buildTrainingProgramAdaptationPlan(
      context({
        actualExercises: [actual({
          minCompletedReps: 6,
          maxCompletedReps: 7,
          minWeightKg: 82.5,
          maxWeightKg: 82.5,
        })],
        futureExercises: [
          future('future-1', { targetWeightKg: null }),
        ],
      }),
      [],
    );

    expect(plan.reasonCodes).toEqual(['LOAD_ESTABLISHED']);
    expect(plan.changes).toEqual([
      expect.objectContaining({
        field: 'TARGET_WEIGHT_KG',
        oldValue: null,
        newValue: 82.5,
        reasonCode: 'ESTABLISH_LOAD_FROM_COMPLETED_SETS',
      }),
    ]);
  });

  it('never automatically lowers load after reps fall below the top', () => {
    const plan = buildTrainingProgramAdaptationPlan(
      context({
        actualExercises: [actual({
          minCompletedReps: 6,
          maxCompletedReps: 7,
        })],
      }),
      [],
    );

    expect(plan.changes).toEqual([]);
    expect(plan.reasonCodes).toContain('HOLD_REPS_BELOW_TOP');
  });

  it('holds progression when required standard sets were not completed', () => {
    const plan = buildTrainingProgramAdaptationPlan(
      context({
        actualExercises: [actual({
          plannedWorkingSets: 3,
          standardWorkingSetCount: 2,
        })],
      }),
      [],
    );

    expect(plan.changes).toEqual([]);
    expect(plan.reasonCodes).toContain('HOLD_INCOMPLETE_SETS');
  });

  it('does not use advanced-set edits as automatic load progression evidence', () => {
    const plan = buildTrainingProgramAdaptationPlan(
      context({
        actualExercises: [actual({
          nonstandardCompletedSetCount: 1,
        })],
      }),
      [],
    );

    expect(plan.changes).toEqual([]);
    expect(plan.reasonCodes).toContain('HOLD_ADVANCED_SET_EDIT');
  });

  it('progresses a plain-bodyweight repetition range as an atomic pair', () => {
    const plan = buildTrainingProgramAdaptationPlan(
      context({
        actualExercises: [actual({
          exerciseId: 'pullup',
          canonicalName: 'Pull-Up',
          measurementType: 'BODYWEIGHT_REPS',
          minCompletedReps: 10,
          maxCompletedReps: 11,
          minWeightKg: null,
          maxWeightKg: null,
          plainBodyweightSetCount: 2,
        })],
        futureExercises: [
          future('future-1', {
            exerciseId: 'pullup',
            canonicalName: 'Pull-Up',
            targetMuscleGroup: 'LATS',
            measurementType: 'BODYWEIGHT_REPS',
            repsMin: 6,
            repsMax: 10,
            targetWeightKg: null,
            bodyweightMode: 'BODYWEIGHT',
          }),
        ],
      }),
      [],
    );

    expect(plan.reasonCodes).toEqual(['BODYWEIGHT_REPS_PROGRESSED']);
    expect(plan.changes).toEqual([
      expect.objectContaining({
        field: 'REPS_MAX',
        oldValue: 10,
        newValue: 11,
      }),
      expect.objectContaining({
        field: 'REPS_MIN',
        oldValue: 6,
        newValue: 7,
      }),
    ]);
  });

  it('defers added-weight or assisted bodyweight auto progression', () => {
    const plan = buildTrainingProgramAdaptationPlan(
      context({
        actualExercises: [actual({
          exerciseId: 'pullup',
          canonicalName: 'Pull-Up',
          measurementType: 'BODYWEIGHT_REPS',
          minCompletedReps: 10,
          maxCompletedReps: 10,
          minWeightKg: 10,
          maxWeightKg: 10,
          plainBodyweightSetCount: 0,
          addedWeightSetCount: 2,
        })],
        futureExercises: [
          future('future-1', {
            exerciseId: 'pullup',
            canonicalName: 'Pull-Up',
            targetMuscleGroup: 'LATS',
            measurementType: 'BODYWEIGHT_REPS',
            targetWeightKg: 10,
            bodyweightMode: 'ADDED_WEIGHT',
          }),
        ],
      }),
      [],
    );

    expect(plan.changes).toEqual([]);
    expect(plan.reasonCodes).toContain('HOLD_UNSUPPORTED_LOAD_MODE');
  });

  it('adds at most one set to each of two direct future prescriptions', () => {
    const plan = buildTrainingProgramAdaptationPlan(
      context({
        actualExercises: [],
        futureExercises: [
          future('future-2'),
          future('future-1'),
          future('future-3', {
            programWorkoutId: 'workout-3',
            scheduledDate: '2026-10-15',
          }),
        ],
      }),
      [signal()],
    );

    expect(plan.reasonCodes).toEqual(['VOLUME_ADDED']);
    expect(plan.changes).toHaveLength(2);
    expect(plan.changes).toEqual([
      expect.objectContaining({
        programExerciseId: 'future-1',
        field: 'WORKING_SETS',
        oldValue: 2,
        newValue: 3,
      }),
      expect.objectContaining({
        programExerciseId: 'future-2',
        field: 'WORKING_SETS',
        oldValue: 2,
        newValue: 3,
      }),
    ]);
  });

  it('reduces volume by one set while respecting the two-set floor', () => {
    const plan = buildTrainingProgramAdaptationPlan(
      context({
        actualExercises: [],
        futureExercises: [
          future('future-1', { workingSets: 3 }),
          future('future-2', { workingSets: 2 }),
        ],
      }),
      [signal({
        action: 'REDUCE_VOLUME_CAUTIOUSLY',
        suggestedEffectiveSetChange: -2,
        volumeStatus: 'ABOVE_TARGET',
      })],
    );

    expect(plan.reasonCodes).toEqual(['VOLUME_REDUCED']);
    expect(plan.changes).toEqual([
      expect.objectContaining({
        programExerciseId: 'future-1',
        oldValue: 3,
        newValue: 2,
        reasonCode: 'REDUCE_VOLUME_PHASE19',
      }),
    ]);
  });

  it('does not stack a volume-set change onto a row already progressing load', () => {
    const plan = buildTrainingProgramAdaptationPlan(
      context({
        futureExercises: [
          future('future-1'),
          future('future-2'),
          future('future-3', {
            programWorkoutId: 'workout-3',
            scheduledDate: '2026-10-15',
          }),
        ],
      }),
      [signal()],
    );

    expect(
      plan.changes.filter((change) => change.field === 'WORKING_SETS'),
    ).toEqual([]);
    expect(
      plan.changes.filter((change) => change.field === 'TARGET_WEIGHT_KG'),
    ).toHaveLength(3);
  });

  it('skips a currently excluded future prescription', () => {
    const plan = buildTrainingProgramAdaptationPlan(
      context({
        actualExercises: [],
        futureExercises: [
          future('future-1', { currentlyExcluded: true }),
        ],
      }),
      [signal()],
    );

    expect(plan.changes).toEqual([]);
    expect(plan.reasonCodes).toContain(
      'HOLD_NO_MATCHING_FUTURE_EXERCISE',
    );
  });

  it('holds fractional Phase 19 changes smaller than one whole set', () => {
    const plan = buildTrainingProgramAdaptationPlan(
      context({ actualExercises: [] }),
      [signal({ suggestedEffectiveSetChange: 0.5 })],
    );

    expect(plan.changes).toEqual([]);
    expect(plan.reasonCodes).toContain('HOLD_PHASE19_SMALL_CHANGE');
  });

  it('records a compact deterministic evidence snapshot', () => {
    const inputContext = context();
    const inputs = [signal()];

    const first = buildTrainingProgramAdaptationPlan(inputContext, inputs);
    const second = buildTrainingProgramAdaptationPlan(inputContext, inputs);

    expect(first).toEqual(second);
    expect(first.evidenceSnapshot).toEqual(expect.objectContaining({
      policyVersion: 'training-program-adaptation-v1',
      triggerWorkoutSessionId: 'trigger-session',
      generatedChangeCount: first.changes.length,
    }));
  });

  it('refuses to build a second plan for an already-adapted workout', () => {
    expect(() => buildTrainingProgramAdaptationPlan(
      context({ alreadyAdapted: true }),
      [],
    )).toThrow('already has an adaptation');
  });
});
