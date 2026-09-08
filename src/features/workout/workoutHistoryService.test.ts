import { describe, expect, it, vi } from 'vitest';
import { createWorkoutHistoryService } from './workoutHistoryService';

function queryResult(data: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn> | ((resolve: (value: unknown) => unknown) => unknown)> = {};

  for (const method of ['select', 'eq', 'in', 'order', 'limit']) {
    chain[method] = vi.fn(() => chain);
  }

  chain.then = (resolve: (value: unknown) => unknown) =>
  Promise.resolve(resolve({ data, error: null }));
  return chain;
}

describe('workoutHistoryService', () => {
  it('reconstructs completed workout exercises, Superset membership, and completed sets', async () => {
    const queries = {
      workout_sessions: queryResult([
        {
          id: 'workout-1',
          scoring_date: '2026-09-08',
          started_at: '2026-09-08T20:00:00Z',
          ended_at: '2026-09-08T21:00:00Z',
          active_duration_seconds: 3600,
        },
      ]),
      workout_exercises: queryResult([
        {
          id: 'we-1',
          workout_id: 'workout-1',
          exercise_id: 'exercise-1',
          order_index: 0,
          superset_group_id: 'group-a',
          superset_order: 0,
        },
        {
          id: 'we-2',
          workout_id: 'workout-1',
          exercise_id: 'exercise-2',
          order_index: 1,
          superset_group_id: 'group-a',
          superset_order: 1,
        },
      ]),
      exercise_catalog: queryResult([
        { id: 'exercise-1', canonical_name: 'Bench Press', measurement_type: 'WEIGHT_REPS' },
        { id: 'exercise-2', canonical_name: 'Cable Fly', measurement_type: 'WEIGHT_REPS' },
      ]),
      workout_sets: queryResult([
        {
          id: 'set-1',
          workout_exercise_id: 'we-1',
          set_number: 1,
          set_type: 'WORKING',
          weight_kg: '100',
          reps: 5,
          bodyweight_mode: null,
        },
      ]),
    };

    const client = {
      from: vi.fn((table: keyof typeof queries) => queries[table]),
    } as never;

    const history = await createWorkoutHistoryService(client).load('user-1');

    expect(history).toHaveLength(1);
    expect(history[0]?.exercises).toEqual([
      expect.objectContaining({
        canonicalName: 'Bench Press',
        supersetGroupId: 'group-a',
        supersetOrder: 0,
        sets: [expect.objectContaining({ weightKg: 100, reps: 5 })],
      }),
      expect.objectContaining({
        canonicalName: 'Cable Fly',
        supersetGroupId: 'group-a',
        supersetOrder: 1,
      }),
    ]);

    const sessionQuery = queries.workout_sessions as Record<string, ReturnType<typeof vi.fn>>;
    expect(sessionQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(sessionQuery.eq).toHaveBeenCalledWith('status', 'COMPLETED');

    const setQuery = queries.workout_sets as Record<string, ReturnType<typeof vi.fn>>;
    expect(setQuery.eq).toHaveBeenCalledWith('completed', true);
  });
});
