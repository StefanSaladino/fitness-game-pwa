import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('stays ready without making a request when the workout has no exercises', async () => {
    const injected = service();
    const { result } = renderHook(() => useWorkoutSets([], injected));
    expect(result.current.status).toBe('ready');
    expect(result.current.sets).toEqual([]);
    expect(injected.loadWorkoutSets).not.toHaveBeenCalled();
  });
});
