import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTrainingProgramProductService } from './trainingProgramProductService';

function listQuery(data: unknown) {
  const promise = Promise.resolve({ data, error: null });
  const query: Record<string, unknown> = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => promise),
  };
  return query;
}

describe('training program product service', () => {
  it('lists persisted programs newest first', async () => {
    const query = listQuery([{
      id: 'program-1',
      status: 'ACTIVE',
      goal: 'BALANCED',
      duration_weeks: 4,
      sessions_per_week: 3,
      start_date: '2026-09-28',
      end_date: '2026-10-25',
      requested_split: 'AUTO',
      resolved_split: 'FULL_BODY_ABC',
      revision: 2,
      created_at: '2026-09-24T10:00:00Z',
      updated_at: '2026-09-24T10:05:00Z',
    }]);

    const client = {
      from: vi.fn(() => query),
      rpc: vi.fn(),
    } as unknown as SupabaseClient;

    await expect(createTrainingProgramProductService(client).list())
      .resolves.toEqual([
        expect.objectContaining({
          id: 'program-1',
          status: 'ACTIVE',
          durationWeeks: 4,
          sessionsPerWeek: 3,
        }),
      ]);
  });

  it('launches an own workout through the Phase 20.4 RPC', async () => {
    const rpc = vi.fn(async () => ({
      data: {
        id: 'session-1',
        programWorkoutId: 'planned-1',
        programExecutionStatus: 'STARTED_OWN_WORKOUT',
      },
      error: null,
    }));

    const client = {
      from: vi.fn(),
      rpc,
    } as unknown as SupabaseClient;

    await expect(
      createTrainingProgramProductService(client)
        .launchOwnWorkout('planned-1', '2026-09-24T10:00:00Z'),
    ).resolves.toEqual({
      workoutSessionId: 'session-1',
      programWorkoutId: 'planned-1',
      programExecutionStatus: 'STARTED_OWN_WORKOUT',
    });

    expect(rpc).toHaveBeenCalledWith(
      'launch_my_training_program_own_workout',
      {
        p_program_workout_id: 'planned-1',
        p_action_at: '2026-09-24T10:00:00Z',
      },
    );
  });

  it('persists a revision-guarded exercise replacement', async () => {
    const rpc = vi.fn(async () => ({
      data: {
        substitutionId: 'sub-1',
        programId: 'program-1',
        programWorkoutId: 'planned-1',
        programExerciseId: 'row-1',
        replacementExerciseId: 'replacement-1',
        replacementCanonicalName: 'Goblet Squat',
        programRevision: 4,
        workoutRevision: 2,
        constraintRevision: 3,
      },
      error: null,
    }));

    const client = {
      from: vi.fn(),
      rpc,
    } as unknown as SupabaseClient;

    await expect(
      createTrainingProgramProductService(client).replaceExercise({
        programExerciseId: 'row-1',
        replacementExerciseId: 'replacement-1',
        expectedProgramRevision: 3,
        expectedConstraintRevision: 3,
        targetWeightKg: 30,
      }),
    ).resolves.toEqual(expect.objectContaining({
      replacementCanonicalName: 'Goblet Squat',
      programRevision: 4,
    }));
  });
  it('persists a revision-guarded user volume override separately from the recommendation', async () => {
    const rpc = vi.fn(async () => ({
      data: {
        programId: 'program-1',
        programWorkoutId: 'planned-1',
        programRevision: 5,
        workoutRevision: 3,
        beforeTotalWorkingSets: 16,
        afterTotalWorkingSets: 17,
        changed: true,
      },
      error: null,
    }));

    const client = {
      from: vi.fn(),
      rpc,
    } as unknown as SupabaseClient;

    await expect(
      createTrainingProgramProductService(client).updateWorkoutVolume({
        programWorkoutId: 'planned-1',
        expectedProgramRevision: 4,
        expectedWorkoutRevision: 2,
        overrides: [{ exerciseId: 'bench', workingSets: 4 }],
      }),
    ).resolves.toEqual(expect.objectContaining({
      afterTotalWorkingSets: 17,
      changed: true,
    }));

    expect(rpc).toHaveBeenCalledWith(
      'set_my_training_program_workout_volume',
      {
        p_program_workout_id: 'planned-1',
        p_expected_program_revision: 4,
        p_expected_workout_revision: 2,
        p_overrides: [{ exerciseId: 'bench', workingSets: 4 }],
        p_restore_recommended: false,
      },
    );
  });

});
