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
  it('loads logical sets with ordered advanced child segments in canonical kilograms', async () => {
    const setRows = query([
      {
        id: 's-1', workout_exercise_id: 'we-1', set_number: 1, set_type: 'WORKING', set_variant: 'FULL_PYRAMID',
        weight_kg: '100', reps: 5, bodyweight_mode: null, completed: true, completed_at: '2026-09-09T01:00:00Z', revision: 4,
      },
    ]);
    const segmentRows = query([
      { id: 'seg-2', workout_set_id: 's-1', segment_index: 1, weight_kg: '100', reps: 5 },
      { id: 'seg-1', workout_set_id: 's-1', segment_index: 0, weight_kg: '80', reps: 8 },
      { id: 'seg-3', workout_set_id: 's-1', segment_index: 2, weight_kg: '80', reps: 8 },
    ]);
    const from = vi.fn((table: string) => table === 'workout_sets' ? setRows : segmentRows);
    const service = createWorkoutSetService({ from, rpc: vi.fn() } as never);

    const result = await service.loadWorkoutSets(['we-1']);

    expect(result[0]).toEqual(expect.objectContaining({ setVariant: 'FULL_PYRAMID', weightKg: 100, reps: 5 }));
    expect(result[0]?.segments?.map((segment) => [segment.segmentIndex, segment.weightKg, segment.reps])).toEqual([
      [0, 80, 8], [1, 100, 5], [2, 80, 8],
    ]);
    expect(setRows.in).toHaveBeenCalledWith('workout_exercise_id', ['we-1']);
    expect(segmentRows.in).toHaveBeenCalledWith('workout_set_id', ['s-1']);
  });

  it('writes standard and segmented set composition only through guarded RPCs', async () => {
    const rpc = vi.fn(async () => ({ data: 'set-1', error: null }));
    const service = createWorkoutSetService({ from: vi.fn(), rpc } as never);

    await service.addSet('we-1', 'WARMUP');
    await service.addAdvancedSet('we-1', 'DROP');
    await service.saveAdvancedSet('set-1', {
      variant: 'DROP',
      segments: [{ weightKg: 100, reps: 8 }, { weightKg: 80, reps: 10 }],
      completed: true,
    });
    await service.copySet('set-1');
    await service.saveSet('set-1', { setType: 'WORKING', weightKg: 100, reps: 5, bodyweightMode: null, completed: true });
    await service.removeSet('set-1');

    expect(rpc).toHaveBeenNthCalledWith(1, 'add_lifting_workout_set', { p_workout_exercise_id: 'we-1', p_set_type: 'WARMUP' });
    expect(rpc).toHaveBeenNthCalledWith(2, 'add_lifting_workout_advanced_set', { p_workout_exercise_id: 'we-1', p_variant: 'DROP' });
    expect(rpc).toHaveBeenNthCalledWith(3, 'save_lifting_workout_advanced_set', {
      p_workout_set_id: 'set-1',
      p_variant: 'DROP',
      p_segments: [{ weightKg: 100, reps: 8 }, { weightKg: 80, reps: 10 }],
      p_completed: true,
    });
    expect(rpc).toHaveBeenNthCalledWith(4, 'copy_lifting_workout_set', { p_workout_set_id: 'set-1' });
    expect(rpc).toHaveBeenNthCalledWith(5, 'save_lifting_workout_set', {
      p_workout_set_id: 'set-1', p_set_type: 'WORKING', p_weight_kg: 100, p_reps: 5,
      p_bodyweight_mode: null, p_completed: true,
    });
    expect(rpc).toHaveBeenNthCalledWith(6, 'remove_lifting_workout_set', { p_workout_set_id: 'set-1' });
  });

  it('does not query set tables when no workout exercises exist', async () => {
    const from = vi.fn();
    const service = createWorkoutSetService({ from, rpc: vi.fn() } as never);
    await expect(service.loadWorkoutSets([])).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
