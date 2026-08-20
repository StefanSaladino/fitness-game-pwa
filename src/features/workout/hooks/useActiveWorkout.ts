import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveWorkoutSession, WorkoutLifecycleAction } from '../model';
import { toUserFacingWorkoutError } from '../workoutMessages';
import { createWorkoutService, type WorkoutService } from '../workoutService';

export type ActiveWorkoutStatus = 'loading' | 'ready' | 'error';

export function useActiveWorkout(userId: string, injectedService?: WorkoutService) {
  const serviceRef = useRef<WorkoutService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createWorkoutService();

  const [status, setStatus] = useState<ActiveWorkoutStatus>('loading');
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutSession | null>(null);
  const [busyAction, setBusyAction] = useState<WorkoutLifecycleAction>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const workout = await serviceRef.current!.loadActiveWorkout(userId);
      setActiveWorkout(workout);
      setStatus('ready');
      return workout;
    } catch (caught) {
      setActiveWorkout(null);
      setStatus('error');
      setError(toUserFacingWorkoutError(caught));
      return null;
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const runSessionAction = useCallback(async <T,>(action: Exclude<WorkoutLifecycleAction, null>, task: () => Promise<T>) => {
    setBusyAction(action);
    setError('');
    try {
      return await task();
    } catch (caught) {
      setError(toUserFacingWorkoutError(caught));
      return null;
    } finally {
      setBusyAction(null);
    }
  }, []);

  const start = useCallback(async (actionAtMs: number = Date.now()) => runSessionAction('start', async () => {
    const workout = await serviceRef.current!.startOrResumeWorkout(actionAtMs);
    setActiveWorkout(workout);
    setStatus('ready');
    return workout;
  }), [runSessionAction]);

  const pause = useCallback(async (actionAtMs: number = Date.now()) => {
    if (!activeWorkout) return null;
    return runSessionAction('pause', async () => {
      const workout = await serviceRef.current!.pauseWorkout(activeWorkout.id, actionAtMs);
      setActiveWorkout(workout);
      return workout;
    });
  }, [activeWorkout, runSessionAction]);

  const resume = useCallback(async (actionAtMs: number = Date.now()) => {
    if (!activeWorkout) return null;
    return runSessionAction('resume', async () => {
      const workout = await serviceRef.current!.resumeWorkout(activeWorkout.id, actionAtMs);
      setActiveWorkout(workout);
      return workout;
    });
  }, [activeWorkout, runSessionAction]);

  const finish = useCallback(async () => {
    if (!activeWorkout) return null;
    const result = await runSessionAction('finish', async () => {
      await serviceRef.current!.finishWorkout(activeWorkout.id);
      setActiveWorkout(null);
      return activeWorkout.id;
    });
    if (result === null) await load();
    return result;
  }, [activeWorkout, load, runSessionAction]);

  const cancel = useCallback(async () => {
    if (!activeWorkout) return null;
    const result = await runSessionAction('cancel', async () => {
      await serviceRef.current!.cancelWorkout(activeWorkout.id);
      setActiveWorkout(null);
      return activeWorkout.id;
    });
    if (result === null) await load();
    return result;
  }, [activeWorkout, load, runSessionAction]);

  return { status, activeWorkout, busyAction, error, retry: load, start, pause, resume, finish, cancel };
}
