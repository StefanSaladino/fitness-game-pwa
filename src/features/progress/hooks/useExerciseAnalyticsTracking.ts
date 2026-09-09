import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createExerciseAnalyticsTrackingService,
  type ExerciseAnalyticsTrackingService,
} from '../analyticsTrackingService';
import { toUserFacingProgressError } from '../progressMessages';

export type ExerciseAnalyticsTrackingStatus = 'loading' | 'ready' | 'error';

export function useExerciseAnalyticsTracking(injectedService?: ExerciseAnalyticsTrackingService) {
  const serviceRef = useRef<ExerciseAnalyticsTrackingService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createExerciseAnalyticsTrackingService();

  const [status, setStatus] = useState<ExerciseAnalyticsTrackingStatus>('loading');
  const [trackedExerciseIds, setTrackedExerciseIds] = useState<string[]>([]);
  const [busyExerciseId, setBusyExerciseId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const next = await serviceRef.current!.listTrackedExerciseIds();
      setTrackedExerciseIds([...new Set(next)]);
      setStatus('ready');
      return next;
    } catch (caught) {
      setError(toUserFacingProgressError(caught));
      setStatus('error');
      return null;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setTracked = useCallback(async (exerciseId: string, tracked: boolean) => {
    setBusyExerciseId(exerciseId);
    setError('');
    try {
      await serviceRef.current!.setTracked(exerciseId, tracked);
      setTrackedExerciseIds((current) => {
        if (tracked) return current.includes(exerciseId) ? current : [...current, exerciseId];
        return current.filter((id) => id !== exerciseId);
      });
      setStatus('ready');
      return true;
    } catch (caught) {
      setError(toUserFacingProgressError(caught));
      return false;
    } finally {
      setBusyExerciseId(null);
    }
  }, []);

  return {
    status,
    trackedExerciseIds,
    busyExerciseId,
    error,
    setTracked,
    retry: load,
  };
}
