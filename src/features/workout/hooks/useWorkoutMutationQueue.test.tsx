import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutMutationService } from '../mutations/workoutMutationService';
import { createWorkoutMutationStorage, type WorkoutMutationStorage } from '../mutations/workoutMutationStorage';
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
    const storage = createWorkoutMutationStorage(null, window.localStorage);
    const { result } = renderHook(() => useWorkoutMutationQueue('user-1', 'workout-1', service, storage));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(async () => {
      const outcome = await result.current.executor.execute(request);
      expect(outcome.state).toBe('queued');
    });

    expect(apply).not.toHaveBeenCalled();
    expect(await storage.load('user-1')).toHaveLength(1);
    expect(result.current.pendingCount).toBe(1);

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    await act(async () => { window.dispatchEvent(new Event('online')); });

    await waitFor(() => expect(result.current.pendingCount).toBe(0));
    expect(apply).toHaveBeenCalledTimes(1);
    expect(await storage.load('user-1')).toEqual([]);
    expect(result.current.appliedRevision).toBeGreaterThan(0);
  });

  it('keeps retryable failures queued through backoff but returns terminal online failures immediately', async () => {
    const apply = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(undefined);
    const service = { apply } as WorkoutMutationService;
    const { result } = renderHook(() => useWorkoutMutationQueue('user-1', 'workout-1', service));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    vi.useFakeTimers();
    try {
      vi.setSystemTime('2026-08-21T19:35:00.000Z');
      await act(async () => {
        const outcome = await result.current.executor.execute(request);
        expect(outcome.state).toBe('queued');
      });
      expect(result.current.pendingCount).toBe(1);
      expect(apply).toHaveBeenCalledTimes(1);

      await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
      expect(result.current.pendingCount).toBe(0);
      expect(apply).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }

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
    const storage = createWorkoutMutationStorage(null, window.localStorage);
    const seedService = { apply: vi.fn(async () => undefined) } as WorkoutMutationService;
    const seeded = renderHook(() => useWorkoutMutationQueue('user-1', 'workout-1', seedService, storage));
    await waitFor(() => expect(seeded.result.current.hydrated).toBe(true));

    await act(async () => { await seeded.result.current.executor.execute(request); });
    const [queued] = await storage.load('user-1');
    expect(queued).toBeDefined();
    await storage.save('user-1', [{ ...queued!, status: 'failed', lastError: 'Active lifting workout not found' }]);
    seeded.unmount();

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    const apply = vi.fn(async () => undefined);
    const { result } = renderHook(() => useWorkoutMutationQueue('user-1', 'workout-1', { apply } as WorkoutMutationService, storage));
    await waitFor(() => expect(result.current.status).toBe('blocked'));

    await act(async () => { await result.current.retryBlocked(); });

    await waitFor(() => expect(result.current.pendingCount).toBe(0));
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: queued!.idempotencyKey, attemptCount: 0 }));
  });

  it('keeps stale writes as explicit conflicts until the user chooses the server version', async () => {
    const apply = vi.fn(async () => { throw { code: 'P0001', message: 'WORKOUT_CONFLICT: Set changed on the server.' }; });
    const storage = createWorkoutMutationStorage(null, window.localStorage);
    const { result } = renderHook(() => useWorkoutMutationQueue('user-1', 'workout-1', { apply } as WorkoutMutationService, storage));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(async () => {
      const outcome = await result.current.executor.execute(request);
      expect(outcome.state).toBe('conflict');
      expect(outcome.error).toContain('WORKOUT_CONFLICT');
    });

    expect(result.current.status).toBe('conflict');
    expect(result.current.pendingCount).toBe(1);
    expect((await storage.load('user-1'))[0]?.status).toBe('conflict');

    await act(async () => { await result.current.discardConflictingWorkout(); });

    expect(result.current.pendingCount).toBe(0);
    expect(result.current.status).toBe('idle');
    expect(await storage.load('user-1')).toEqual([]);
  });

  it('does not attempt the network when the device cannot durably persist a mutation', async () => {
    const apply = vi.fn(async () => undefined);
    const failingStorage: WorkoutMutationStorage = {
      async load() { return []; },
      async save() { return false; },
      async clear() { return undefined; },
    };
    const { result } = renderHook(() => useWorkoutMutationQueue('user-1', 'workout-1', { apply } as WorkoutMutationService, failingStorage));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(async () => {
      const outcome = await result.current.executor.execute(request);
      expect(outcome.state).toBe('failed');
      expect(outcome.error).toContain('could not save');
    });

    expect(apply).not.toHaveBeenCalled();
    expect(result.current.pendingCount).toBe(0);
  });
  it('normalizes an exhausted persisted retry into an explicit blocked state after restart', async () => {
    const storage = createWorkoutMutationStorage(null, window.localStorage);
    const seedService = { apply: vi.fn(async () => undefined) } as WorkoutMutationService;
    const seeded = renderHook(() => useWorkoutMutationQueue('user-1', 'workout-1', seedService, storage));
    await waitFor(() => expect(seeded.result.current.hydrated).toBe(true));

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    await act(async () => { await seeded.result.current.executor.execute(request); });
    const [queued] = await storage.load('user-1');
    expect(queued).toBeDefined();
    await storage.save('user-1', [{ ...queued!, attemptCount: 4, lastAttemptAtMs: 1_000, status: 'pending' }]);
    seeded.unmount();

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    const apply = vi.fn(async () => undefined);
    const restarted = renderHook(() => useWorkoutMutationQueue('user-1', 'workout-1', { apply } as WorkoutMutationService, storage));
    await waitFor(() => expect(restarted.result.current.status).toBe('blocked'));

    expect(apply).not.toHaveBeenCalled();
    expect((await storage.load('user-1'))[0]).toEqual(expect.objectContaining({ attemptCount: 4, status: 'failed' }));
  });

});
