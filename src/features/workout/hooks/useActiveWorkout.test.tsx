import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActiveWorkoutSession } from '../model';
import type { WorkoutService } from '../workoutService';
import { useActiveWorkout } from './useActiveWorkout';

const active: ActiveWorkoutSession = {
  id: 'workout-1',
  userId: 'user-1',
  status: 'IN_PROGRESS',
  startedAt: '2026-08-19T22:00:00.000Z',
  endedAt: null,
  activeDurationSeconds: 0,
  timezoneAtStart: 'America/Toronto',
  scoringDate: '2026-08-19',
  pausedAt: null,
  lastResumedAt: '2026-08-19T22:00:00.000Z',
};

function service(overrides: Partial<WorkoutService> = {}): WorkoutService {
  return {
    loadActiveWorkout: vi.fn(async () => null),
    startOrResumeWorkout: vi.fn(async () => active),
    pauseWorkout: vi.fn(async () => ({ ...active, activeDurationSeconds: 120, pausedAt: '2026-08-19T22:02:00.000Z', lastResumedAt: null })),
    resumeWorkout: vi.fn(async () => ({ ...active, activeDurationSeconds: 120, lastResumedAt: '2026-08-19T22:03:00.000Z' })),
    finishWorkout: vi.fn(async () => undefined),
    cancelWorkout: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('useActiveWorkout', () => {
  it('recovers an existing active session on mount', async () => {
    const api = service({ loadActiveWorkout: vi.fn(async () => active) });
    const { result } = renderHook(() => useActiveWorkout('user-1', api));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.activeWorkout?.id).toBe('workout-1');
  });

  it('forwards exact pause/resume button timestamps to the service', async () => {
    const api = service({ loadActiveWorkout: vi.fn(async () => active) });
    const { result } = renderHook(() => useActiveWorkout('user-1', api));
    await waitFor(() => expect(result.current.activeWorkout).not.toBeNull());

    await act(async () => { await result.current.pause(1_000); });
    expect(api.pauseWorkout).toHaveBeenCalledWith('workout-1', 1_000);
    await act(async () => { await result.current.resume(2_000); });
    expect(api.resumeWorkout).toHaveBeenCalledWith('workout-1', 2_000);
  });

  it('forwards the exact start button timestamp instead of waiting for the network', async () => {
    const api = service();
    const { result } = renderHook(() => useActiveWorkout('user-1', api));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => { await result.current.start(3_000); });
    expect(api.startOrResumeWorkout).toHaveBeenCalledWith(3_000);
  });

  it('clears local active state only after finish succeeds', async () => {
    const api = service({ loadActiveWorkout: vi.fn(async () => active) });
    const { result } = renderHook(() => useActiveWorkout('user-1', api));
    await waitFor(() => expect(result.current.activeWorkout).not.toBeNull());

    await act(async () => { await result.current.finish(); });
    expect(result.current.activeWorkout).toBeNull();
    expect(api.finishWorkout).toHaveBeenCalledWith('workout-1');
  });

  it('rechecks the server after a finish race so completed-elsewhere workouts do not stay editable', async () => {
    const loadActiveWorkout = vi.fn()
      .mockResolvedValueOnce(active)
      .mockResolvedValueOnce(null);
    const api = service({
      loadActiveWorkout,
      finishWorkout: vi.fn(async () => { throw new Error('Active lifting workout not found'); }),
    });
    const { result } = renderHook(() => useActiveWorkout('user-1', api));
    await waitFor(() => expect(result.current.activeWorkout).not.toBeNull());

    await act(async () => { await result.current.finish(); });

    expect(loadActiveWorkout).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('ready');
    expect(result.current.activeWorkout).toBeNull();
  });

});
