import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutMutationService } from '../mutations/workoutMutationService';
import { createWorkoutMutationStorage } from '../mutations/workoutMutationStorage';
import { useWorkoutMutationQueue } from './useWorkoutMutationQueue';

afterEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
});

const request = {
  kind: 'SAVE_SET' as const,
  payload: { workoutSetId: 'set-1', setType: 'WORKING' as const, weightKg: 100, reps: 5, bodyweightMode: null, completed: true, expectedRevision: 0 },
};

describe('useWorkoutMutationQueue', () => {
  it('writes offline mutations to durable storage before any network attempt and replays on reconnect', async () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    const apply = vi.fn(async () => undefined);
    const service = { apply } as WorkoutMutationService;
    const storage = createWorkoutMutationStorage(window.localStorage);
    const { result } = renderHook(() => useWorkoutMutationQueue('user-1', 'workout-1', service, storage));

    await act(async () => {
      const outcome = await result.current.executor.execute(request);
      expect(outcome.state).toBe('queued');
    });

    expect(apply).not.toHaveBeenCalled();
    expect(storage.load('user-1')).toHaveLength(1);
    expect(result.current.pendingCount).toBe(1);

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    await act(async () => { window.dispatchEvent(new Event('online')); });

    await waitFor(() => expect(result.current.pendingCount).toBe(0));
    expect(apply).toHaveBeenCalledTimes(1);
    expect(storage.load('user-1')).toEqual([]);
    expect(result.current.appliedRevision).toBeGreaterThan(0);
  });

  it('keeps retryable failures queued but returns terminal online failures immediately', async () => {
    const apply = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(undefined);
    const service = { apply } as WorkoutMutationService;
    const { result } = renderHook(() => useWorkoutMutationQueue('user-1', 'workout-1', service));

    await act(async () => {
      const outcome = await result.current.executor.execute(request);
      expect(outcome.state).toBe('queued');
    });
    expect(result.current.pendingCount).toBe(1);

    await act(async () => { await result.current.replay(); });
    await waitFor(() => expect(result.current.pendingCount).toBe(0));

    apply.mockRejectedValueOnce({ code: '22023', message: 'Weight is out of range' });
    await act(async () => {
      const outcome = await result.current.executor.execute(request);
      expect(outcome.state).toBe('failed');
      expect(outcome.error).toContain('Weight is out of range');
    });
    expect(result.current.pendingCount).toBe(0);
  });

  it('allows an explicitly blocked persisted mutation to be retried without changing its idempotency key', async () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    const storage = createWorkoutMutationStorage(window.localStorage);
    const seedService = { apply: vi.fn(async () => undefined) } as WorkoutMutationService;
    const seeded = renderHook(() => useWorkoutMutationQueue('user-1', 'workout-1', seedService, storage));

    await act(async () => { await seeded.result.current.executor.execute(request); });
    const [queued] = storage.load('user-1');
    expect(queued).toBeDefined();
    storage.save('user-1', [{ ...queued!, status: 'failed', lastError: 'Active lifting workout not found' }]);
    seeded.unmount();

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    const apply = vi.fn(async () => undefined);
    const { result } = renderHook(() => useWorkoutMutationQueue('user-1', 'workout-1', { apply } as WorkoutMutationService, storage));
    await waitFor(() => expect(result.current.status).toBe('blocked'));

    await act(async () => { await result.current.retryBlocked(); });

    await waitFor(() => expect(result.current.pendingCount).toBe(0));
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: queued!.idempotencyKey }));
  });

  it('keeps stale writes as explicit conflicts until the user chooses the server version', async () => {
    const apply = vi.fn(async () => { throw { code: 'P0001', message: 'WORKOUT_CONFLICT: Set changed on the server.' }; });
    const storage = createWorkoutMutationStorage(window.localStorage);
    const { result } = renderHook(() => useWorkoutMutationQueue('user-1', 'workout-1', { apply } as WorkoutMutationService, storage));

    await act(async () => {
      const outcome = await result.current.executor.execute(request);
      expect(outcome.state).toBe('conflict');
      expect(outcome.error).toContain('WORKOUT_CONFLICT');
    });

    expect(result.current.status).toBe('conflict');
    expect(result.current.pendingCount).toBe(1);
    expect(storage.load('user-1')[0]?.status).toBe('conflict');

    await act(async () => { await result.current.discardConflictingWorkout(); });

    expect(result.current.pendingCount).toBe(0);
    expect(result.current.status).toBe('idle');
    expect(storage.load('user-1')).toEqual([]);
  });
});
