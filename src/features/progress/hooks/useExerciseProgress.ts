import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildExerciseAnalytics } from '../exerciseAnalytics';
import type { ExerciseProgressHistoryEntry, ExerciseProgressSummary } from '../model';
import { toUserFacingProgressError } from '../progressMessages';
import { createExerciseProgressService, type ExerciseProgressService } from '../progressService';

export type ExerciseProgressStatus = 'loading' | 'ready' | 'error';

export function useExerciseProgress(injectedService?: ExerciseProgressService) {
  const serviceRef = useRef<ExerciseProgressService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createExerciseProgressService();

  const [status, setStatus] = useState<ExerciseProgressStatus>('loading');
  const [historyStatus, setHistoryStatus] = useState<ExerciseProgressStatus>('loading');
  const [exercises, setExercises] = useState<ExerciseProgressSummary[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [history, setHistory] = useState<ExerciseProgressHistoryEntry[]>([]);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');

  const loadOverview = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const next = await serviceRef.current!.listOverview();
      setExercises(next);
      setSelectedExerciseId((current) => {
        if (current && next.some((exercise) => exercise.exerciseId === current)) return current;
        return next[0]?.exerciseId ?? null;
      });
      setStatus('ready');
      return next;
    } catch (caught) {
      setError(toUserFacingProgressError(caught));
      setStatus('error');
      return null;
    }
  }, []);

  const loadHistory = useCallback(async (exerciseId: string) => {
    setHistoryStatus('loading');
    setHistoryError('');
    try {
      const next = await serviceRef.current!.loadHistory(exerciseId);
      setHistory(next);
      setHistoryStatus('ready');
      return next;
    } catch (caught) {
      setHistory([]);
      setHistoryError(toUserFacingProgressError(caught));
      setHistoryStatus('error');
      return null;
    }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (!selectedExerciseId) {
      setHistory([]);
      setHistoryStatus('ready');
      setHistoryError('');
      return;
    }

    let active = true;
    setHistory([]);
    setHistoryStatus('loading');
    setHistoryError('');
    serviceRef.current!.loadHistory(selectedExerciseId)
      .then((next) => {
        if (!active) return;
        setHistory(next);
        setHistoryStatus('ready');
      })
      .catch((caught) => {
        if (!active) return;
        setHistory([]);
        setHistoryError(toUserFacingProgressError(caught));
        setHistoryStatus('error');
      });

    return () => { active = false; };
  }, [selectedExerciseId]);

  const retryHistory = useCallback(async () => {
    if (!selectedExerciseId) return null;
    return loadHistory(selectedExerciseId);
  }, [loadHistory, selectedExerciseId]);

  const selectedExercise = exercises.find((exercise) => exercise.exerciseId === selectedExerciseId) ?? null;
  const analytics = useMemo(() => buildExerciseAnalytics(selectedExercise, history), [history, selectedExercise]);

  return {
    status,
    historyStatus,
    exercises,
    selectedExerciseId,
    selectedExercise,
    analytics,
    history,
    error,
    historyError,
    selectExercise: setSelectedExerciseId,
    retry: loadOverview,
    retryHistory,
  };
}
