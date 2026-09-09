import { describe, expect, it, vi } from 'vitest';
import { createWorkoutHistoryService } from './workoutHistoryService';

function queryResult(data: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn> | ((resolve: (value: unknown) => unknown) => unknown)> = {};
  for (const method of ['select', 'eq', 'in', 'order', 'limit']) chain[method] = vi.fn(() => chain);
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data, error: null }));
  return chain;
}

describe('workoutHistoryService', () => {
  it('reconstructs completed Supersets and keeps advanced stages inside one logical set', async () => {
    const queries = {
      workout_sessions: queryResult([
        { id: 'workout-1', scoring_date: '2026-09-08', started_at: '2026-09-08T20:00:00Z', ended_at: '2026-09-08T21:00:00Z', active_duration_seconds: 3600 },
      ]),
      workout_exercises: queryResult([
        { id: 'we-1', workout_id: 'workout-1', exercise_id: 'exercise-1', order_index: 0, superset_group_id: 'group-a', superset_order: 0 },
      ]),
      exercise_catalog: queryResult([
        { id: 'exercise-1', canonical_name: 'Bench Press', measurement_type: 'WEIGHT_REPS' },
      ]),
      workout_sets: queryResult([
        {
          id: 'set-1', workout_exercise_id: 'we-1', set_number: 1, set_type: 'WORKING', set_variant: 'FULL_PYRAMID',
          weight_kg: '100', reps: 5, bodyweight_mode: null,
        },
      ]),
      workout_set_segments: queryResult([
        { id: 'seg-1', workout_set_id: 'set-1', segment_index: 0, weight_kg: '80', reps: 8 },
        { id: 'seg-2', workout_set_id: 'set-1', segment_index: 1, weight_kg: '100', reps: 5 },
        { id: 'seg-3', workout_set_id: 'set-1', segment_index: 2, weight_kg: '80', reps: 8 },
      ]),
    };

    const client = { from: vi.fn((table: keyof typeof queries) => queries[table]) } as never;
    const history = await createWorkoutHistoryService(client).load('user-1');

    expect(history).toHaveLength(1);
    expect(history[0]?.exercises[0]).toEqual(expect.objectContaining({
      canonicalName: 'Bench Press',
      supersetGroupId: 'group-a',
      sets: [expect.objectContaining({
        setVariant: 'FULL_PYRAMID',
        segments: [
          expect.objectContaining({ segmentIndex: 0, weightKg: 80, reps: 8 }),
          expect.objectContaining({ segmentIndex: 1, weightKg: 100, reps: 5 }),
          expect.objectContaining({ segmentIndex: 2, weightKg: 80, reps: 8 }),
        ],
      })],
    }));

    const segmentQuery = queries.workout_set_segments as Record<string, ReturnType<typeof vi.fn>>;
    expect(segmentQuery.in).toHaveBeenCalledWith('workout_set_id', ['set-1']);
  });
});
