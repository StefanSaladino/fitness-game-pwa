import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExercisePickerItem } from '../model';
import { createExercisePickerService, type ExercisePickerService } from '../exercisePickerService';
import { toUserFacingWorkoutError } from '../workoutMessages';

export type ExercisePickerStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useExercisePickerCatalog(enabled: boolean, injectedService?: ExercisePickerService) {
  const serviceRef = useRef<ExercisePickerService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createExercisePickerService();

  const [status, setStatus] = useState<ExercisePickerStatus>(enabled ? 'loading' : 'idle');
  const [catalog, setCatalog] = useState<ExercisePickerItem[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) {
      setStatus('idle');
      setCatalog([]);
      setError('');
      return [] as ExercisePickerItem[];
    }
    setStatus('loading');
    setError('');
    try {
      const loaded = await serviceRef.current!.loadCatalog();
      setCatalog(loaded);
      setStatus('ready');
      return loaded;
    } catch (caught) {
      setCatalog([]);
      setStatus('error');
      setError(toUserFacingWorkoutError(caught));
      return [] as ExercisePickerItem[];
    }
  }, [enabled]);

  useEffect(() => { void load(); }, [load]);

  return { status, catalog, error, retry: load };
}
