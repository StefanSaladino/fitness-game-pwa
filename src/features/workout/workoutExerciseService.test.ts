import { describe, expect, it, vi } from 'vitest';
import { createWorkoutExerciseService } from './workoutExerciseService';

function query(data: unknown, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(async () => ({ data, error }));
  chain.in = vi.fn(async () => ({ data, error }));
  return chain;
}

describe('workoutExerciseService', () => {
  it('loads ordered workout exercise rows and resolves canonical catalog identity', async () => {
    const workoutRows = query([
      { id: 'we-1', workout_id: 'workout-1', exercise_id: 'exercise-1', order_index: 0, superset_group_id: '11111111-1111-4111-8111-111111111111', superset_order: 0, revision: 7 },
    ]);
    const catalogRows = query([
      { id: 'exercise-1', canonical_name: 'Barbell Bench Press', measurement_type: 'WEIGHT_REPS' },
    ]);
    const from = vi.fn((table: string) => table === 'workout_exercises' ? workoutRows : catalogRows);
    const client = { from, rpc: vi.fn() } as never;

    const result = await createWorkoutExerciseService(client).loadWorkoutExercises('workout-1');

    expect(result).toEqual([
      expect.objectContaining({
        id: 'we-1',
        canonicalName: 'Barbell Bench Press',
        orderIndex: 0,
        supersetGroupId: '11111111-1111-4111-8111-111111111111',
        supersetOrder: 0,
        revision: 7,
      }),
    ]);
    expect(workoutRows.select).toHaveBeenCalledWith('id, workout_id, exercise_id, order_index, superset_group_id, superset_order, revision');
    expect(workoutRows.order).toHaveBeenCalledWith('order_index', { ascending: true });
    expect(catalogRows.in).toHaveBeenCalledWith('id', ['exercise-1']);
  });

  it('falls back to the legacy exercise projection only when the Superset columns are not deployed yet', async () => {
    const missingColumns = query(null, {
      code: '42703',
      message: 'column workout_exercises.superset_group_id does not exist',
    });
    const legacyRows = query([
      { id: 'we-1', workout_id: 'workout-1', exercise_id: 'exercise-1', order_index: 0, revision: 2 },
    ]);
    const catalogRows = query([
      { id: 'exercise-1', canonical_name: 'Barbell Bench Press', measurement_type: 'WEIGHT_REPS' },
    ]);
    const workoutQueries = [missingColumns, legacyRows];
    const from = vi.fn((table: string) => table === 'workout_exercises' ? workoutQueries.shift() : catalogRows);
    const client = { from, rpc: vi.fn() } as never;

    const result = await createWorkoutExerciseService(client).loadWorkoutExercises('workout-1');

    expect(result).toEqual([
      expect.objectContaining({
        id: 'we-1',
        supersetGroupId: null,
        supersetOrder: null,
        revision: 2,
      }),
    ]);
    expect(missingColumns.select).toHaveBeenCalledWith('id, workout_id, exercise_id, order_index, superset_group_id, superset_order, revision');
    expect(legacyRows.select).toHaveBeenCalledWith('id, workout_id, exercise_id, order_index, revision');
  });

  it('does not hide unrelated workout exercise query failures behind the compatibility fallback', async () => {
    const failingRows = query(null, { code: '42501', message: 'permission denied' });
    const from = vi.fn(() => failingRows);
    const client = { from, rpc: vi.fn() } as never;

    await expect(createWorkoutExerciseService(client).loadWorkoutExercises('workout-1')).rejects.toMatchObject({
      code: '42501',
    });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('adds canonical exercises only through the guarded RPC', async () => {
    const rpc = vi.fn(async () => ({ data: 'we-1', error: null }));
    const service = createWorkoutExerciseService({ from: vi.fn(), rpc } as never);

    await expect(service.addExercise('workout-1', 'exercise-1')).resolves.toBe('we-1');
    expect(rpc).toHaveBeenCalledWith('add_lifting_workout_exercise', {
      p_workout_id: 'workout-1',
      p_exercise_id: 'exercise-1',
    });
  });

  it('removes and moves exercise rows only through composition RPCs', async () => {
    const rpc = vi.fn(async () => ({ data: 'we-1', error: null }));
    const service = createWorkoutExerciseService({ from: vi.fn(), rpc } as never);

    await service.removeExercise('we-1');
    await service.moveExercise('we-2', 0);

    expect(rpc).toHaveBeenNthCalledWith(1, 'remove_lifting_workout_exercise', { p_workout_exercise_id: 'we-1' });
    expect(rpc).toHaveBeenNthCalledWith(2, 'move_lifting_workout_exercise', { p_workout_exercise_id: 'we-2', p_new_order_index: 0 });
  });
});
