import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MuscleVolumeSummary } from '../model';
import type { MusclePerformanceSourceObservation } from '../musclePerformanceMonitor';
import {
  createMusclePerformanceService,
  type MusclePerformanceService,
} from '../musclePerformanceService';
import { buildMuscleVolumeRecommendationPayloads } from '../muscleVolumeRecommendationModel';
import { toUserFacingProgressError } from '../progressMessages';
import type { ExerciseProgressStatus } from './useExerciseProgress';

const EMPTY_MUSCLE_PERFORMANCE_SERVICE: MusclePerformanceService = {
  loadObservations: async () => [],
};

export function useMuscleVolumeRecommendations(
  volumeRows: MuscleVolumeSummary[],
  enabled: boolean,
  injectedService?: MusclePerformanceService,
) {
  const serviceRef = useRef<MusclePerformanceService | null>(null);

  if (!serviceRef.current) {
    serviceRef.current = injectedService
      ?? createMusclePerformanceService();
  }

  const [status, setStatus] = useState<ExerciseProgressStatus>(
    enabled ? 'loading' : 'ready',
  );
  const [observations, setObservations] = useState<
    MusclePerformanceSourceObservation[]
  >([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) {
      setStatus('ready');
      setObservations([]);
      setError('');
      return [];
    }

    setStatus('loading');
    setError('');

    try {
      const next = await serviceRef.current!.loadObservations(undefined, 56);
      setObservations(next);
      setStatus('ready');
      return next;
    } catch (caught) {
      setObservations([]);
      setError(toUserFacingProgressError(caught));
      setStatus('error');
      return null;
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const recommendations = useMemo(
    () => buildMuscleVolumeRecommendationPayloads(volumeRows, observations),
    [observations, volumeRows],
  );

  return {
    status,
    observations,
    recommendations,
    error,
    retry: load,
  };
}

export function createEmptyMusclePerformanceService(): MusclePerformanceService {
  return EMPTY_MUSCLE_PERFORMANCE_SERVICE;
}
