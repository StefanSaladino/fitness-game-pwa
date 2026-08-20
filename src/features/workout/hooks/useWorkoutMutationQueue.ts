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

export type WorkoutMutationQueueStatus = 'idle' | 'replaying' | 'blocked';

function browserIsOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
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

  const initialItems = useRef<WorkoutMutationQueueItem[] | null>(null);
  if (initialItems.current === null) initialItems.current = storageRef.current.load(userId);

  const itemsRef = useRef<WorkoutMutationQueueItem[]>(initialItems.current);
  const operationChain = useRef<Promise<void>>(Promise.resolve());
  const [items, setItems] = useState<WorkoutMutationQueueItem[]>(initialItems.current);
  const [status, setStatus] = useState<WorkoutMutationQueueStatus>(() => initialItems.current!.some((item) => item.status === 'failed') ? 'blocked' : 'idle');
  const [appliedRevision, setAppliedRevision] = useState(0);

  const replaceItems = useCallback((next: WorkoutMutationQueueItem[]) => {
    itemsRef.current = next;
    storageRef.current!.save(userId, next);
    setItems(next);
    setStatus(next.some((item) => item.status === 'failed') ? 'blocked' : 'idle');
  }, [userId]);

  useEffect(() => {
    const loaded = storageRef.current!.load(userId);
    itemsRef.current = loaded;
    setItems(loaded);
    setStatus(loaded.some((item) => item.status === 'failed') ? 'blocked' : 'idle');
  }, [userId]);

  const serialize = useCallback(async <T,>(task: () => Promise<T>): Promise<T> => {
    let resolveTask!: (value: T | PromiseLike<T>) => void;
    let rejectTask!: (reason?: unknown) => void;
    const result = new Promise<T>((resolve, reject) => {
      resolveTask = resolve;
      rejectTask = reject;
    });
    operationChain.current = operationChain.current.then(async () => {
      try {
        resolveTask(await task());
      } catch (error) {
        rejectTask(error);
      }
    }, async () => {
      try {
        resolveTask(await task());
      } catch (error) {
        rejectTask(error);
      }
    });
    return result;
  }, []);

  const replay = useCallback(async () => serialize(async () => {
    if (!browserIsOnline() || itemsRef.current.length === 0 || itemsRef.current[0]?.status === 'failed') return;
    setStatus('replaying');
    const result = await replayWorkoutMutations(itemsRef.current, serviceRef.current!);
    itemsRef.current = result.items;
    storageRef.current!.save(userId, result.items);
    setItems(result.items);
    if (result.appliedCount > 0) setAppliedRevision((value) => value + 1);
    setStatus(result.items.some((item) => item.status === 'failed') ? 'blocked' : 'idle');
  }), [serialize, userId]);

  useEffect(() => {
    if (itemsRef.current.length > 0 && browserIsOnline()) void replay();
  }, [replay]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onOnline = () => { void replay(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [replay]);

  const execute = useCallback(async (request: WorkoutMutationRequest): Promise<WorkoutMutationExecutionResult> => {
    if (!workoutId) {
      return { state: 'failed', idempotencyKey: '', error: 'No active workout is available for this change.' };
    }

    const item = createWorkoutMutationQueueItem(userId, workoutId, request);
    const next = [...itemsRef.current, item];
    itemsRef.current = next;
    storageRef.current!.save(userId, next);
    setItems(next);

    if (!browserIsOnline() || next.some((queued) => queued.status === 'failed')) {
      return { state: 'queued', idempotencyKey: item.idempotencyKey };
    }

    await replay();
    const remaining = itemsRef.current.find((queued) => queued.idempotencyKey === item.idempotencyKey);
    if (!remaining) return { state: 'applied', idempotencyKey: item.idempotencyKey };
    if (remaining.status === 'failed') {
      const error = remaining.lastError ?? 'Workout change was rejected.';
      const withoutImmediateFailure = itemsRef.current.filter((queued) => queued.idempotencyKey !== item.idempotencyKey);
      replaceItems(withoutImmediateFailure);
      return { state: 'failed', idempotencyKey: item.idempotencyKey, error };
    }
    return { state: 'queued', idempotencyKey: item.idempotencyKey };
  }, [replay, replaceItems, userId, workoutId]);

  const retryBlocked = useCallback(async () => {
    const firstFailedIndex = itemsRef.current.findIndex((item) => item.status === 'failed');
    if (firstFailedIndex >= 0) {
      const next = itemsRef.current.map((item, index) => index === firstFailedIndex ? {
        ...item,
        status: 'pending' as const,
        lastError: null,
      } : item);
      replaceItems(next);
    }
    await replay();
  }, [replaceItems, replay]);

  const executor = useMemo<WorkoutMutationExecutor>(() => ({ execute }), [execute]);
  const firstFailed = items.find((item) => item.status === 'failed') ?? null;

  return {
    executor,
    items,
    pendingCount: items.length,
    failedCount: items.filter((item) => item.status === 'failed').length,
    status,
    error: firstFailed?.lastError ?? '',
    appliedRevision,
    replay,
    retryBlocked,
  };
}
