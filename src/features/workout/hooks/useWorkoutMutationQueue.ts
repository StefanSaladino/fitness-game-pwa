import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createWorkoutMutationQueueItem,
  type WorkoutMutationExecutionResult,
  type WorkoutMutationExecutor,
  type WorkoutMutationQueueItem,
  type WorkoutMutationRequest,
} from '../mutations/workoutMutationModel';
import { replayWorkoutMutations } from '../mutations/workoutMutationReplay';
import { createWorkoutMutationService, type WorkoutMutationService } from '../mutations/workoutMutationService';
import { createWorkoutMutationStorage, type WorkoutMutationStorage } from '../mutations/workoutMutationStorage';
import {
  workoutMutationCanAutoReplay,
  workoutMutationNextAutoRetryAtMs,
  workoutMutationRetryBudgetExhausted,
} from '../mutations/workoutMutationRetry';

export type WorkoutMutationQueueStatus = 'idle' | 'replaying' | 'blocked' | 'conflict';

function browserIsOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

function queueStatus(items: readonly WorkoutMutationQueueItem[]): WorkoutMutationQueueStatus {
  if (items.some((item) => item.status === 'conflict')) return 'conflict';
  if (items.some((item) => item.status === 'failed')) return 'blocked';
  return 'idle';
}

export function useWorkoutMutationQueue(
  userId: string,
  workoutId: string | null,
  injectedService?: WorkoutMutationService,
  injectedStorage?: WorkoutMutationStorage,
) {
  const serviceRef = useRef<WorkoutMutationService | null>(null);
  const storageRef = useRef<WorkoutMutationStorage | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createWorkoutMutationService();
  if (!storageRef.current) storageRef.current = injectedStorage ?? createWorkoutMutationStorage();

  const itemsRef = useRef<WorkoutMutationQueueItem[]>([]);
  const hydratedRef = useRef(false);
  const operationChain = useRef<Promise<void>>(Promise.resolve());
  const retryTimerRef = useRef<number | null>(null);
  const [items, setItems] = useState<WorkoutMutationQueueItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<WorkoutMutationQueueStatus>('idle');
  const [appliedRevision, setAppliedRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    setHydrated(false);
    itemsRef.current = [];
    setItems([]);
    setStatus('idle');
    void storageRef.current!.load(userId).then(async (loaded) => {
      if (cancelled) return;
      const normalized = loaded.map((item) => item.status === 'pending' && workoutMutationRetryBudgetExhausted(item.attemptCount)
        ? { ...item, status: 'failed' as const }
        : item);
      if (normalized.some((item, index) => item !== loaded[index])) {
        await storageRef.current!.save(userId, normalized);
        if (cancelled) return;
      }
      itemsRef.current = normalized;
      setItems(normalized);
      setStatus(queueStatus(normalized));
      hydratedRef.current = true;
      setHydrated(true);
    }, () => {
      if (cancelled) return;
      itemsRef.current = [];
      setItems([]);
      setStatus('idle');
      hydratedRef.current = true;
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const replaceItems = useCallback(async (next: WorkoutMutationQueueItem[]) => {
    const persisted = await storageRef.current!.save(userId, next);
    if (!persisted) return false;
    itemsRef.current = next;
    setItems(next);
    setStatus(queueStatus(next));
    return true;
  }, [userId]);

  const serialize = useCallback(async <T,>(task: () => Promise<T>): Promise<T> => {
    let resolveTask!: (value: T | PromiseLike<T>) => void;
    let rejectTask!: (reason?: unknown) => void;
    const result = new Promise<T>((resolve, reject) => {
      resolveTask = resolve;
      rejectTask = reject;
    });
    operationChain.current = operationChain.current.then(async () => {
      try { resolveTask(await task()); } catch (error) { rejectTask(error); }
    }, async () => {
      try { resolveTask(await task()); } catch (error) { rejectTask(error); }
    });
    return result;
  }, []);

  const replay = useCallback(async () => serialize(async () => {
    if (!hydratedRef.current || !browserIsOnline() || itemsRef.current.length === 0) return;
    const head = itemsRef.current[0];
    if (!head || head.status === 'failed' || head.status === 'conflict') return;
    if (!workoutMutationCanAutoReplay(head)) return;
    setStatus('replaying');
    const result = await replayWorkoutMutations(itemsRef.current, serviceRef.current!);
    itemsRef.current = result.items;
    setItems(result.items);
    await storageRef.current!.save(userId, result.items);
    if (result.appliedCount > 0) setAppliedRevision((value) => value + 1);
    setStatus(queueStatus(result.items));
  }), [serialize, userId]);

  const [connectivityRevision, setConnectivityRevision] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onOnline = () => setConnectivityRevision((value) => value + 1);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  useEffect(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (!hydrated || !browserIsOnline()) return undefined;
    const head = items[0];
    if (!head || head.status !== 'pending') return undefined;
    const nextRetryAtMs = workoutMutationNextAutoRetryAtMs(head);
    if (nextRetryAtMs === null) return undefined;
    const delayMs = nextRetryAtMs === 0 ? 0 : Math.max(0, nextRetryAtMs - Date.now());
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      void replay();
    }, delayMs);
    return () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [connectivityRevision, hydrated, items, replay]);

  const execute = useCallback(async (request: WorkoutMutationRequest): Promise<WorkoutMutationExecutionResult> => {
    if (!hydratedRef.current) {
      return { state: 'failed', idempotencyKey: '', error: 'Recovering saved workout changes. Try again in a moment.' };
    }
    if (!workoutId) {
      return { state: 'failed', idempotencyKey: '', error: 'No active workout is available for this change.' };
    }

    const item = createWorkoutMutationQueueItem(userId, workoutId, request);
    const next = [...itemsRef.current, item];
    itemsRef.current = next;
    setItems(next);
    const persisted = await storageRef.current!.save(userId, next);
    if (!persisted) {
      const withoutUnpersisted = itemsRef.current.filter((queued) => queued.idempotencyKey !== item.idempotencyKey);
      itemsRef.current = withoutUnpersisted;
      setItems(withoutUnpersisted);
      setStatus(queueStatus(withoutUnpersisted));
      return {
        state: 'failed',
        idempotencyKey: item.idempotencyKey,
        error: 'This device could not save the workout change for safe retry. Free storage space or re-enable browser storage, then try again.',
      };
    }

    if (!browserIsOnline() || next.some((queued) => queued.status === 'failed' || queued.status === 'conflict')) {
      setStatus(queueStatus(next));
      return { state: 'queued', idempotencyKey: item.idempotencyKey };
    }

    await replay();
    const remaining = itemsRef.current.find((queued) => queued.idempotencyKey === item.idempotencyKey);
    if (!remaining) return { state: 'applied', idempotencyKey: item.idempotencyKey };
    if (remaining.status === 'conflict') {
      return {
        state: 'conflict',
        idempotencyKey: item.idempotencyKey,
        error: remaining.lastError ?? 'WORKOUT_CONFLICT: This workout changed elsewhere.',
      };
    }
    if (remaining.status === 'failed') {
      const error = remaining.lastError ?? 'Workout change was rejected.';
      const withoutImmediateFailure = itemsRef.current.filter((queued) => queued.idempotencyKey !== item.idempotencyKey);
      await replaceItems(withoutImmediateFailure);
      return { state: 'failed', idempotencyKey: item.idempotencyKey, error };
    }
    return { state: 'queued', idempotencyKey: item.idempotencyKey };
  }, [replay, replaceItems, userId, workoutId]);

  const retryBlocked = useCallback(async () => {
    const retryIndex = itemsRef.current.findIndex((item) => item.status === 'failed') >= 0
      ? itemsRef.current.findIndex((item) => item.status === 'failed')
      : itemsRef.current.findIndex((item) => item.status === 'pending' && item.attemptCount > 0);
    if (retryIndex >= 0) {
      const next = itemsRef.current.map((item, index) => index === retryIndex ? {
        ...item,
        attemptCount: 0,
        lastAttemptAtMs: null,
        status: 'pending' as const,
        lastError: null,
      } : item);
      const persisted = await replaceItems(next);
      if (!persisted) return;
    }
    await replay();
  }, [replaceItems, replay]);

  const discardWorkout = useCallback(async (targetWorkoutId: string) => serialize(async () => {
    if (!itemsRef.current.some((item) => item.workoutId === targetWorkoutId)) return null;
    const next = itemsRef.current.filter((item) => item.workoutId !== targetWorkoutId);
    const persisted = await replaceItems(next);
    if (!persisted) return null;
    setAppliedRevision((value) => value + 1);
    return targetWorkoutId;
  }), [replaceItems, serialize]);

  const discardConflictingWorkout = useCallback(async () => {
    const conflict = itemsRef.current.find((item) => item.status === 'conflict');
    if (!conflict) return null;
    return discardWorkout(conflict.workoutId);
  }, [discardWorkout]);

  const executor = useMemo<WorkoutMutationExecutor>(() => ({ execute }), [execute]);
  const firstConflict = items.find((item) => item.status === 'conflict') ?? null;
  const firstFailed = items.find((item) => item.status === 'failed') ?? null;

  return {
    executor,
    items,
    hydrated,
    pendingCount: items.length,
    failedCount: items.filter((item) => item.status === 'failed').length,
    conflictCount: items.filter((item) => item.status === 'conflict').length,
    status,
    error: firstConflict?.lastError ?? firstFailed?.lastError ?? '',
    conflictWorkoutId: firstConflict?.workoutId ?? null,
    appliedRevision,
    replay,
    retryBlocked,
    discardWorkout,
    discardConflictingWorkout,
  };
}
