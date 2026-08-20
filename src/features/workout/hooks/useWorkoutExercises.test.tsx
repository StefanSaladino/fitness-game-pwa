import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkoutExercise } from '../model';
import type { WorkoutExerciseService } from '../workoutExerciseService';
import { useWorkoutExercises } from './useWorkoutExercises';

const bench: WorkoutExercise = {
  id: 'we-1', workoutId: 'workout-1', exerciseId: 'exercise-1', orderIndex: 0,
  canonicalName: 'Barbell Bench Press', measurementType: 'WEIGHT_REPS',
};

function service(overrides: Partial<WorkoutExerciseService> = {}): WorkoutExerciseService {
  return {
    loadWorkoutExercises: vi.fn(async () => [bench]),
    addExercise: vi.fn(async () => 'we-1'),
    removeExercise: vi.fn(async () => undefined),
    moveExercise: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('useWorkoutExercises', () => {
  it('recovers persisted exercise composition when an active workout is present', async () => {
    const api = service();
    const { result } = renderHook(() => useWorkoutExercises('workout-1', api));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.exercises[0]?.canonicalName).toBe('Barbell Bench Press');
  });

  it('does not query composition when there is no active workout', async () => {
    const api = service();
    const { result } = renderHook(() => useWorkoutExercises(null, api));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(api.loadWorkoutExercises).not.toHaveBeenCalled();
    expect(result.current.exercises).toEqual([]);
  });

  it('reloads authoritative order after a move', async () => {
    const row: WorkoutExercise = { ...bench, id: 'we-2', exerciseId: 'exercise-2', canonicalName: 'Barbell Row', orderIndex: 1 };
    const loadWorkoutExercises = vi.fn()
      .mockResolvedValueOnce([bench, row])
      .mockResolvedValueOnce([{ ...row, orderIndex: 0 }, { ...bench, orderIndex: 1 }]);
    const api = service({ loadWorkoutExercises });
    const { result } = renderHook(() => useWorkoutExercises('workout-1', api));
    await waitFor(() => expect(result.current.exercises).toHaveLength(2));

    await act(async () => { await result.current.moveExercise('we-2', 0); });
    expect(api.moveExercise).toHaveBeenCalledWith('we-2', 0);
    expect(result.current.exercises[0]?.id).toBe('we-2');
  });
});
