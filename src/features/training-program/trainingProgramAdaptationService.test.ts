import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MusclePerformanceService } from '../progress/musclePerformanceService';
import type { ExerciseProgressService } from '../progress/progressService';
import type { PersonalVolumeHistoryService } from '../progress/personalVolumeHistoryService';
import { createTrainingProgramAdaptationService } from './trainingProgramAdaptationService';

function contextPayload(overrides: Record<string, unknown> = {}) {
  return {
    programId: 'program-1',
    programRevision: 2,
    triggerProgramWorkoutId: 'planned-0',
    triggerWorkoutSessionId: 'session-0',
    triggerScheduledDate: '2026-09-24',
    triggerScoringDate: '2026-09-24',
    triggerExecutionStatus: 'COMPLETED_PROGRAMMED',
    alreadyAdapted: false,
    existingAdaptation: null,
    actualExercises: [{
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
    }],
    futureExercises: [{
      programExerciseId: 'future-exercise',
      programWorkoutId: 'planned-1',
      scheduledDate: '2026-10-01',
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
    }],
    ...overrides,
  };
}

function dependencies() {
  return {
    progressService: {
      loadMuscleVolume: vi.fn(async () => []),
    } as unknown as ExerciseProgressService,
    performanceService: {
      loadObservations: vi.fn(async () => []),
    } as unknown as MusclePerformanceService,
    personalVolumeHistoryService: {
      load: vi.fn(async () => []),
    } as unknown as PersonalVolumeHistoryService,
  };
}

describe('training program adaptation service', () => {
  it('short-circuits an already-audited completed workout', async () => {
    const deps = dependencies();
    const rpc = vi.fn(async () => ({
      data: contextPayload({
        alreadyAdapted: true,
        existingAdaptation: {
          adaptationId: 'adaptation-1',
          outcome: 'APPLIED',
          sourceProgramRevision: 2,
          resultingProgramRevision: 3,
          reasonCodes: ['LOAD_PROGRESSED'],
        },
      }),
      error: null,
    }));

    const service = createTrainingProgramAdaptationService(
      { rpc } as unknown as SupabaseClient,
      deps,
    );

    await expect(
      service.adapt('program-1', 'planned-0'),
    ).resolves.toEqual({
      adaptationId: 'adaptation-1',
      outcome: 'APPLIED',
      sourceProgramRevision: 2,
      resultingProgramRevision: 3,
      changeCount: null,
      alreadyApplied: true,
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(deps.progressService.loadMuscleVolume).not.toHaveBeenCalled();
    expect(deps.performanceService.loadObservations).not.toHaveBeenCalled();
  });

  it('builds from completed evidence and atomically applies future changes', async () => {
    const deps = dependencies();
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === 'get_my_training_program_adaptation_context') {
        return { data: contextPayload(), error: null };
      }

      expect(name).toBe('apply_my_training_program_adaptation');
      expect(args).toEqual(expect.objectContaining({
        p_program_id: 'program-1',
        p_trigger_program_workout_id: 'planned-0',
        p_expected_revision: 2,
        p_reason_codes: ['LOAD_PROGRESSED'],
        p_changes: [
          expect.objectContaining({
            programExerciseId: 'future-exercise',
            field: 'TARGET_WEIGHT_KG',
            oldValue: 100,
            newValue: 102.5,
            reasonCode: 'PROGRESS_LOAD_TOP_OF_RANGE',
          }),
        ],
      }));

      return {
        data: {
          adaptationId: 'adaptation-2',
          outcome: 'APPLIED',
          sourceProgramRevision: 2,
          resultingProgramRevision: 3,
          changeCount: 1,
          alreadyApplied: false,
        },
        error: null,
      };
    });

    const service = createTrainingProgramAdaptationService(
      { rpc } as unknown as SupabaseClient,
      deps,
    );

    await expect(
      service.adapt('program-1', 'planned-0'),
    ).resolves.toEqual({
      adaptationId: 'adaptation-2',
      outcome: 'APPLIED',
      sourceProgramRevision: 2,
      resultingProgramRevision: 3,
      changeCount: 1,
      alreadyApplied: false,
    });

    expect(deps.progressService.loadMuscleVolume).toHaveBeenCalledWith(
      '2026-09-24',
    );
    expect(deps.performanceService.loadObservations).toHaveBeenCalledWith(
      '2026-09-24',
      126,
    );
    expect(deps.personalVolumeHistoryService?.load).toHaveBeenCalledWith(
      '2026-09-24',
      126,
    );
  });

  it('persists a NO_CHANGE evaluation instead of reevaluating forever', async () => {
    const deps = dependencies();
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === 'get_my_training_program_adaptation_context') {
        return {
          data: contextPayload({
            actualExercises: [],
            futureExercises: [],
          }),
          error: null,
        };
      }

      expect(args).toEqual(expect.objectContaining({
        p_reason_codes: ['HOLD_NO_ADAPTIVE_SIGNAL'],
        p_changes: [],
      }));

      return {
        data: {
          adaptationId: 'adaptation-3',
          outcome: 'NO_CHANGE',
          sourceProgramRevision: 2,
          resultingProgramRevision: 2,
          changeCount: 0,
          alreadyApplied: false,
        },
        error: null,
      };
    });

    const service = createTrainingProgramAdaptationService(
      { rpc } as unknown as SupabaseClient,
      deps,
    );

    await expect(
      service.adapt('program-1', 'planned-0'),
    ).resolves.toEqual(expect.objectContaining({
      outcome: 'NO_CHANGE',
      changeCount: 0,
      resultingProgramRevision: 2,
    }));
  });
});
