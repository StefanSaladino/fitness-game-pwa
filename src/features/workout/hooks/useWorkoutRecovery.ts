import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveWorkoutSession, WeightDisplayUnit, WorkoutExercise, WorkoutSet } from '../model';
import {
  createWorkoutRecoverySnapshot,
  type ActiveWorkoutRecoverySnapshot,
  type WorkoutRecoverySetDraft,
} from '../recovery/workoutRecoveryModel';
import { createWorkoutRecoveryStorage, type WorkoutRecoveryStorage } from '../recovery/workoutRecoveryStorage';

export type WorkoutConnectionState = 'online' | 'offline';

function currentConnectionState(): WorkoutConnectionState {
  if (typeof navigator === 'undefined') return 'online';
  return navigator.onLine ? 'online' : 'offline';
}

export function useWorkoutRecovery(userId: string, injectedStorage?: WorkoutRecoveryStorage) {
  const storageRef = useRef<WorkoutRecoveryStorage | null>(null);
  if (!storageRef.current) storageRef.current = injectedStorage ?? createWorkoutRecoveryStorage();

  const [snapshot, setSnapshot] = useState<ActiveWorkoutRecoverySnapshot | null>(() => storageRef.current!.load(userId));
  const [connectionState, setConnectionState] = useState<WorkoutConnectionState>(() => currentConnectionState());
  const [reconnectCount, setReconnectCount] = useState(0);

  useEffect(() => {
    const storage = storageRef.current!;
    setSnapshot(storage.load(userId));
  }, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onOnline = () => {
      setConnectionState('online');
      setReconnectCount((count) => count + 1);
    };
    const onOffline = () => setConnectionState('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    setConnectionState(currentConnectionState());
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const write = useCallback((update: (current: ActiveWorkoutRecoverySnapshot | null) => ActiveWorkoutRecoverySnapshot | null) => {
    setSnapshot((current) => {
      const next = update(current);
      if (next) storageRef.current!.save(next);
      else storageRef.current!.clear(userId);
      return next;
    });
  }, [userId]);

  const captureCanonical = useCallback((workout: ActiveWorkoutSession, exercises: readonly WorkoutExercise[], sets: readonly WorkoutSet[]) => {
    write((current) => createWorkoutRecoverySnapshot(userId, workout, exercises, sets, current));
  }, [userId, write]);

  const setDraft = useCallback((setId: string, draft: WorkoutRecoverySetDraft) => {
    write((current) => current ? {
      ...current,
      savedAtMs: Date.now(),
      ui: { ...current.ui, setDrafts: { ...current.ui.setDrafts, [setId]: draft } },
    } : current);
  }, [write]);

  const clearDraft = useCallback((setId: string) => {
    write((current) => {
      if (!current || !(setId in current.ui.setDrafts)) return current;
      const setDrafts = { ...current.ui.setDrafts };
      delete setDrafts[setId];
      return { ...current, savedAtMs: Date.now(), ui: { ...current.ui, setDrafts } };
    });
  }, [write]);

  const setWeightUnit = useCallback((weightUnit: WeightDisplayUnit) => {
    write((current) => current ? {
      ...current,
      savedAtMs: Date.now(),
      ui: { ...current.ui, weightUnit },
    } : current);
  }, [write]);

  const clear = useCallback(() => write(() => null), [write]);

  return {
    snapshot,
    connectionState,
    reconnectCount,
    captureCanonical,
    setDraft,
    clearDraft,
    setWeightUnit,
    clear,
  };
}
