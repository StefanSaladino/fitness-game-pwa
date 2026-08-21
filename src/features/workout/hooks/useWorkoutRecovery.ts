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

  const [snapshot, setSnapshot] = useState<ActiveWorkoutRecoverySnapshot | null>(null);
  const snapshotRef = useRef<ActiveWorkoutRecoverySnapshot | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const persistChain = useRef<Promise<void>>(Promise.resolve());
  const [connectionState, setConnectionState] = useState<WorkoutConnectionState>(() => currentConnectionState());
  const [reconnectCount, setReconnectCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    setHydrated(false);
    snapshotRef.current = null;
    setSnapshot(null);
    void storageRef.current!.load(userId).then((loaded) => {
      if (cancelled) return;
      snapshotRef.current = loaded;
      setSnapshot(loaded);
      hydratedRef.current = true;
      setHydrated(true);
    }, () => {
      if (cancelled) return;
      snapshotRef.current = null;
      setSnapshot(null);
      hydratedRef.current = true;
      setHydrated(true);
    });
    return () => { cancelled = true; };
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
    if (!hydratedRef.current) return;
    const next = update(snapshotRef.current);
    snapshotRef.current = next;
    setSnapshot(next);
    persistChain.current = persistChain.current.then(async () => {
      if (next) await storageRef.current!.save(next);
      else await storageRef.current!.clear(userId);
    }, async () => {
      if (next) await storageRef.current!.save(next);
      else await storageRef.current!.clear(userId);
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

  const clearDrafts = useCallback(() => {
    write((current) => current ? {
      ...current,
      savedAtMs: Date.now(),
      ui: { ...current.ui, setDrafts: {} },
    } : current);
  }, [write]);

  const setSetRevision = useCallback((setId: string, revision: number) => {
    if (!Number.isInteger(revision) || revision < 0) return;
    write((current) => {
      if (!current || !current.sets.some((set) => set.id === setId)) return current;
      return {
        ...current,
        savedAtMs: Date.now(),
        sets: current.sets.map((set) => set.id === setId ? { ...set, revision } : set),
      };
    });
  }, [write]);

  const setWeightUnit = useCallback((weightUnit: WeightDisplayUnit) => {
    write((current) => current ? {
      ...current,
      savedAtMs: Date.now(),
      ui: { ...current.ui, weightUnit },
    } : current);
  }, [write]);

  const clear = useCallback(async () => {
    if (!hydratedRef.current) return;
    snapshotRef.current = null;
    setSnapshot(null);
    await persistChain.current;
    await storageRef.current!.clear(userId);
  }, [userId]);

  return {
    snapshot,
    hydrated,
    connectionState,
    reconnectCount,
    captureCanonical,
    setDraft,
    clearDraft,
    clearDrafts,
    setSetRevision,
    setWeightUnit,
    clear,
  };
}
