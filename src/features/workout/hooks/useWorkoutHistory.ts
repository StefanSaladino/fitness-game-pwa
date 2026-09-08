import { useCallback, useEffect, useRef, useState } from 'react';
import { toUserFacingWorkoutError } from '../workoutMessages';
import {
  createWorkoutHistoryService,
  type WorkoutHistoryService,
} from '../workoutHistoryService';
import type {
  WorkoutHistorySession,
  WorkoutHistoryStatus,
} from '../workoutHistoryModel';

export function useWorkoutHistory(userId: string, injected?: WorkoutHistoryService) {
  const serviceRef = useRef<WorkoutHistoryService | null>(null);
  if (!serviceRef.current) serviceRef.current = injected ?? createWorkoutHistoryService();

  const [status, setStatus] = useState<WorkoutHistoryStatus>('loading');
  const [history, setHistory] = useState<WorkoutHistorySession[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');

    try {
      const next = await serviceRef.current!.load(userId);
      setHistory(next);
      setStatus('ready');
      return next;
    } catch (caught) {
      setError(toUserFacingWorkoutError(caught));
      setStatus('error');
      return [];
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    status,
    history,
    error,
    retry: load,
  };
}
