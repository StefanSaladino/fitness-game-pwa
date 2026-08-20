import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkoutMutationExecutor } from '../mutations/workoutMutationModel';
import type { WorkoutSetService } from '../workoutSetService';
import { useWorkoutSets } from './useWorkoutSets';

const setRow = {
  id: 'set-1', workoutExerciseId: 'we-1', setNumber: 1, setType: 'WORKING' as const,
  weightKg: 100, reps: 5, bodyweightMode: null, completed: false, completedAt: null,
};

function service(): WorkoutSetService {
  return {
    loadWorkoutSets: vi.fn(async () => [setRow]),
    addSet: vi.fn(async () => 'set-2'),
    copySet: vi.fn(async () => 'set-2'),
    saveSet: vi.fn(async () => 'set-1'),
    removeSet: vi.fn(async () => undefined),
  };
}

describe('useWorkoutSets', () => {
  it('loads persisted sets for the current exercise identities', async () => {
    const injected = service();
    const { result } = renderHook(() => useWorkoutSets(['we-1'], injected));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.sets).toEqual([setRow]);
    expect(injected.loadWorkoutSets).toHaveBeenCalledWith(['we-1']);
  });

  it('reloads after set mutations so independent row state remains authoritative', async () => {
    const injected = service();
    const { result } = renderHook(() => useWorkoutSets(['we-1'], injected));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.saveSet('set-1', { setType: 'WORKING', weightKg: 105, reps: 4, bodyweightMode: null, completed: true });
    });

    expect(injected.saveSet).toHaveBeenCalledWith('set-1', expect.objectContaining({ weightKg: 105, reps: 4, completed: true }));
    expect(injected.loadWorkoutSets).toHaveBeenCalledTimes(2);
  });


  it('routes queued saves through the mutation executor and keeps the local row current', async () => {
    const injected = service();
    const executor: WorkoutMutationExecutor = {
      execute: vi.fn(async () => ({ state: 'queued' as const, idempotencyKey: '11111111-1111-4111-8111-111111111111' })),
    };
    const { result } = renderHook(() => useWorkoutSets(['we-1'], injected, executor));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let saved = true;
    await act(async () => {
      saved = await result.current.saveSet('set-1', { setType: 'WORKING', weightKg: 107.5, reps: 3, bodyweightMode: null, completed: false });
    });

    expect(saved).toBe(false);
    expect(executor.execute).toHaveBeenCalledWith({
      kind: 'SAVE_SET',
      payload: { workoutSetId: 'set-1', setType: 'WORKING', weightKg: 107.5, reps: 3, bodyweightMode: null, completed: false },
    });
    expect(injected.saveSet).not.toHaveBeenCalled();
    expect(result.current.sets[0]).toEqual(expect.objectContaining({ weightKg: 107.5, reps: 3 }));
    expect(injected.loadWorkoutSets).toHaveBeenCalledTimes(1);
  });

  it('stays ready without making a request when the workout has no exercises', async () => {
    const injected = service();
    const { result } = renderHook(() => useWorkoutSets([], injected));
    expect(result.current.status).toBe('ready');
    expect(result.current.sets).toEqual([]);
    expect(injected.loadWorkoutSets).not.toHaveBeenCalled();
  });
});
