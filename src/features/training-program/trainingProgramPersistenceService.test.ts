import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TrainingProgramDefinition } from '../../domain/trainingProgram';
import { createTrainingProgramPersistenceService } from './trainingProgramPersistenceService';

function definition(): TrainingProgramDefinition {
  return {
    version: 'training-program-v1',
    goal: 'BALANCED',
    weeks: 4,
    sessionsPerWeek: 1,
    source: {
      generatorVersion: 'training-program-v1',
      generatedAt: '2026-09-24T01:00:00Z',
      historyThroughDate: '2026-09-23',
      muscleVolumeMethodologyVersion: 'muscle-volume-v2',
      profileRevision: 4,
      constraintRevision: 2,
      durationWeeks: 4,
      startDate: '2026-09-24',
      trainingDays: ['THURSDAY'],
      requestedSplit: 'AUTO',
      resolvedSplit: 'FULL_BODY',
    },
    workouts: [
      '2026-09-24',
      '2026-10-01',
      '2026-10-08',
      '2026-10-15',
    ].map((scheduledDate, weekIndex) => ({
      weekIndex,
      sessionIndex: 0,
      scheduledDate,
      title: 'Full Body',
      exercises: [{
        exerciseId: 'squat',
        canonicalName: 'Back Squat',
        targetMuscleGroup: 'QUADS',
        targetContributionRole: 'DIRECT',
        selectionIntent: 'COMPOUND',
        measurementType: 'WEIGHT_REPS',
        orderIndex: 0,
        workingSets: 3,
        repsMin: 5,
        repsMax: 8,
        targetWeightKg: null,
        bodyweightMode: null,
        supersetGroupIndex: null,
        supersetOrder: null,
      }],
    })),
  };
}

function createQuery(data: unknown) {
  const promise = Promise.resolve({ data, error: null });
  const query: Record<string, unknown> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    single: vi.fn(() => promise),
    then: promise.then.bind(promise),
  };
  return query;
}

describe('training program persistence service', () => {
  it('validates before persisting and sends the complete definition atomically', async () => {
    const rpc = vi.fn(async () => ({
      data: 'program-1',
      error: null,
    }));

    const service = createTrainingProgramPersistenceService({
      rpc,
    } as unknown as SupabaseClient);

    await expect(service.create(definition())).resolves.toBe('program-1');
    expect(rpc).toHaveBeenCalledWith('create_my_training_program', {
      p_program: definition(),
    });
  });

  it('rejects an invalid definition before calling Supabase', async () => {
    const rpc = vi.fn();
    const service = createTrainingProgramPersistenceService({
      rpc,
    } as unknown as SupabaseClient);

    const invalid = definition();
    invalid.workouts[0].scheduledDate = '2026-09-25';

    await expect(service.create(invalid)).rejects.toThrow(
      'Cannot persist an invalid training program',
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it('maps lifecycle, launch, own-workout, and missed RPCs', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'set_my_training_program_status') {
        return {
          data: { programId: 'program-1', status: 'ACTIVE', revision: 2 },
          error: null,
        };
      }
      if (name === 'launch_my_training_program_workout') {
        return {
          data: {
            id: 'session-1',
            programWorkoutId: 'planned-1',
            programExecutionStatus: 'STARTED_PROGRAMMED',
          },
          error: null,
        };
      }
      if (name === 'link_my_training_program_own_workout') {
        return {
          data: {
            workoutSessionId: 'session-2',
            programWorkoutId: 'planned-2',
            programExecutionStatus: 'COMPLETED_OWN_WORKOUT',
          },
          error: null,
        };
      }
      return {
        data: {
          programWorkoutId: 'planned-3',
          programExecutionStatus: 'MISSED',
        },
        error: null,
      };
    });

    const service = createTrainingProgramPersistenceService({
      rpc,
    } as unknown as SupabaseClient);

    await expect(
      service.setStatus('program-1', 'ACTIVE', 1),
    ).resolves.toEqual({
      programId: 'program-1',
      status: 'ACTIVE',
      revision: 2,
    });

    await expect(
      service.launchProgrammedWorkout('planned-1'),
    ).resolves.toEqual({
      workoutSessionId: 'session-1',
      programWorkoutId: 'planned-1',
      programExecutionStatus: 'STARTED_PROGRAMMED',
    });

    await expect(
      service.linkOwnWorkout('planned-2', 'session-2'),
    ).resolves.toEqual({
      workoutSessionId: 'session-2',
      programWorkoutId: 'planned-2',
      programExecutionStatus: 'COMPLETED_OWN_WORKOUT',
    });

    await expect(service.markMissed('planned-3')).resolves.toBeUndefined();
  });

  it('reconstructs a persisted program and preserves execution lineage separately', async () => {
    const program = definition();
    const programRow = {
      id: 'program-1',
      version: program.version,
      goal: program.goal,
      duration_weeks: program.weeks,
      sessions_per_week: program.sessionsPerWeek,
      source_snapshot: program.source,
      status: 'ACTIVE',
      revision: 2,
    };

    const workoutRows = program.workouts.map((workout, index) => ({
      id: `planned-${index}`,
      program_id: 'program-1',
      week_index: workout.weekIndex,
      session_index: workout.sessionIndex,
      scheduled_date: workout.scheduledDate,
      title: workout.title,
      execution_status: index === 0
        ? 'COMPLETED_PROGRAMMED'
        : 'PLANNED',
      workout_session_id: index === 0 ? 'session-1' : null,
      revision: index === 0 ? 2 : 0,
    }));

    const exerciseRows = workoutRows.map((workout, index) => ({
      program_workout_id: workout.id,
      exercise_id: 'squat',
      canonical_name: 'Back Squat',
      target_muscle_group: 'QUADS',
      target_contribution_role: 'DIRECT',
      selection_intent: 'COMPOUND',
      measurement_type: 'WEIGHT_REPS',
      order_index: 0,
      working_sets: 3,
      reps_min: 5,
      reps_max: 8,
      target_weight_kg: null,
      bodyweight_mode: null,
      superset_group_index: null,
      superset_order: null,
    }));

    const queries = {
      training_programs: createQuery(programRow),
      training_program_workouts: createQuery(workoutRows),
      training_program_exercises: createQuery(exerciseRows),
    };

    const client = {
      from: vi.fn((table: keyof typeof queries) => queries[table]),
      rpc: vi.fn(),
    } as unknown as SupabaseClient;

    const service = createTrainingProgramPersistenceService(client);
    const loaded = await service.load('program-1');

    expect(loaded.status).toBe('ACTIVE');
    expect(loaded.revision).toBe(2);
    expect(loaded.definition).toEqual(program);
    expect(loaded.workouts[0]).toEqual(expect.objectContaining({
      id: 'planned-0',
      executionStatus: 'COMPLETED_PROGRAMMED',
      workoutSessionId: 'session-1',
    }));
  });
});
