import { describe, expect, it, vi } from 'vitest';
import { createWorkoutSetService } from './workoutSetService';

function query(data: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.order = vi.fn(async () => ({ data, error: null }));
  return chain;
}

describe('workoutSetService', () => {
  it('loads independent ordered set rows with canonical kilogram values', async () => {
    const rows = query([
      { id: 's-2', workout_exercise_id: 'we-1', set_number: 2, set_type: 'WORKING', weight_kg: '84.5', reps: 6, bodyweight_mode: null, completed: true, completed_at: '2026-08-20T01:00:00Z', revision: 4 },
      { id: 's-1', workout_exercise_id: 'we-1', set_number: 1, set_type: 'WARMUP', weight_kg: 60, reps: 10, bodyweight_mode: null, completed: true, completed_at: '2026-08-20T00:59:00Z', revision: 2 },
    ]);
    const service = createWorkoutSetService({ from: vi.fn(() => rows), rpc: vi.fn() } as never);

    const result = await service.loadWorkoutSets(['we-1']);

    expect(result.map((set) => [set.setNumber, set.weightKg, set.reps, set.revision])).toEqual([[1, 60, 10, 2], [2, 84.5, 6, 4]]);
    expect(rows.in).toHaveBeenCalledWith('workout_exercise_id', ['we-1']);
  });

  it('writes set composition only through guarded RPCs', async () => {
    const rpc = vi.fn(async () => ({ data: 'set-1', error: null }));
    const service = createWorkoutSetService({ from: vi.fn(), rpc } as never);

    await service.addSet('we-1', 'WARMUP');
    await service.copySet('set-1');
    await service.saveSet('set-1', { setType: 'WORKING', weightKg: 100, reps: 5, bodyweightMode: null, completed: true });
    await service.removeSet('set-1');

    expect(rpc).toHaveBeenNthCalledWith(1, 'add_lifting_workout_set', { p_workout_exercise_id: 'we-1', p_set_type: 'WARMUP' });
    expect(rpc).toHaveBeenNthCalledWith(2, 'copy_lifting_workout_set', { p_workout_set_id: 'set-1' });
    expect(rpc).toHaveBeenNthCalledWith(3, 'save_lifting_workout_set', {
      p_workout_set_id: 'set-1', p_set_type: 'WORKING', p_weight_kg: 100, p_reps: 5,
      p_bodyweight_mode: null, p_completed: true,
    });
    expect(rpc).toHaveBeenNthCalledWith(4, 'remove_lifting_workout_set', { p_workout_set_id: 'set-1' });
  });

  it('does not query the set table when no workout exercises exist', async () => {
    const from = vi.fn();
    const service = createWorkoutSetService({ from, rpc: vi.fn() } as never);
    await expect(service.loadWorkoutSets([])).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
