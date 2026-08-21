import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActiveWorkoutSession, WorkoutExercise, WorkoutSet } from '../model';
import type { ActiveWorkoutRecoverySnapshot } from '../recovery/workoutRecoveryModel';
import type { WorkoutRecoveryStorage } from '../recovery/workoutRecoveryStorage';
import { useWorkoutRecovery } from './useWorkoutRecovery';

function memoryRecovery(initial: ActiveWorkoutRecoverySnapshot | null = null) {
  let value = initial;
  const storage: WorkoutRecoveryStorage = {
    load: vi.fn(async () => value),
    save: vi.fn(async (snapshot) => { value = snapshot; }),
    clear: vi.fn(async () => { value = null; }),
  };
  return { storage, read: () => value };
}

const session: ActiveWorkoutSession = {
  id: 'workout-1', userId: 'user-1', status: 'IN_PROGRESS', startedAt: '2026-08-20T01:00:00.000Z', endedAt: null,
  activeDurationSeconds: 0, timezoneAtStart: 'America/Toronto', scoringDate: '2026-08-19', pausedAt: null,
  lastResumedAt: '2026-08-20T01:00:00.000Z',
};
const exercises: WorkoutExercise[] = [
  { id: 'we-1', workoutId: 'workout-1', exerciseId: 'e-1', orderIndex: 0, revision: 0, canonicalName: 'Bench Press', measurementType: 'WEIGHT_REPS' },
];
const sets: WorkoutSet[] = [
  { id: 'set-1', workoutExerciseId: 'we-1', setNumber: 1, setType: 'WORKING', weightKg: 100, reps: 5, bodyweightMode: null, completed: false, completedAt: null, revision: 0 },
];

afterEach(() => {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
});

describe('useWorkoutRecovery', () => {
  it('hydrates durable state before persisting canonical workout plus unsaved set drafts', async () => {
    const memory = memoryRecovery();
    const { result } = renderHook(() => useWorkoutRecovery('user-1', memory.storage));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.captureCanonical(session, exercises, sets));
    expect(result.current.snapshot?.session.id).toBe('workout-1');
    await waitFor(() => expect(memory.read()?.session.id).toBe('workout-1'));

    act(() => result.current.setDraft('set-1', { setType: 'WORKING', weight: '225', reps: '6', bodyweightMode: 'BODYWEIGHT' }));
    await waitFor(() => expect(memory.read()?.ui.setDrafts['set-1']).toEqual({
      setType: 'WORKING', weight: '225', reps: '6', bodyweightMode: 'BODYWEIGHT',
    }));

    act(() => result.current.setWeightUnit('LB'));
    await waitFor(() => expect(memory.read()?.ui.weightUnit).toBe('LB'));

    act(() => result.current.setSetRevision('set-1', 3));
    await waitFor(() => expect(memory.read()?.sets[0]?.revision).toBe(3));

    act(() => result.current.clearDraft('set-1'));
    await waitFor(() => expect(memory.read()?.ui.setDrafts['set-1']).toBeUndefined());
  });

  it('tracks offline state and emits one reconnect token when the browser comes back online', async () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    const memory = memoryRecovery();
    const { result } = renderHook(() => useWorkoutRecovery('user-1', memory.storage));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.connectionState).toBe('online');

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.connectionState).toBe('offline');

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.connectionState).toBe('online');
    expect(result.current.reconnectCount).toBe(1);
  });
});
