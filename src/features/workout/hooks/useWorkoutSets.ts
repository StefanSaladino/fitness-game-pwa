import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkoutSet, WorkoutSetAction, WorkoutSetInput, WorkoutSetType } from '../model';
import type { WorkoutMutationExecutor, WorkoutMutationRequest } from '../mutations/workoutMutationModel';
import { toUserFacingWorkoutError } from '../workoutMessages';
import { createWorkoutSetService, type WorkoutSetService } from '../workoutSetService';

export type WorkoutSetStatus = 'loading' | 'ready' | 'error';

export interface WorkoutSetBusyState {
  action: Exclude<WorkoutSetAction, null>;
  targetId: string;
}

export function useWorkoutSets(workoutExerciseIds: readonly string[], injectedService?: WorkoutSetService, mutationExecutor?: WorkoutMutationExecutor) {
  const serviceRef = useRef<WorkoutSetService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createWorkoutSetService();

  const exerciseKey = workoutExerciseIds.join('|');
  const requestSequence = useRef(0);
  const [status, setStatus] = useState<WorkoutSetStatus>(exerciseKey ? 'loading' : 'ready');
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [busy, setBusy] = useState<WorkoutSetBusyState | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    const requestId = ++requestSequence.current;
    const ids = exerciseKey ? exerciseKey.split('|') : [];
    if (ids.length === 0) {
      setSets([]);
      setStatus('ready');
      setError('');
      return [] as WorkoutSet[];
    }

    if (!quiet) setStatus('loading');
    setError('');
    try {
      const loaded = await serviceRef.current!.loadWorkoutSets(ids);
      if (requestId !== requestSequence.current) return [] as WorkoutSet[];
      setSets(loaded);
      setStatus('ready');
      return loaded;
    } catch (caught) {
      if (requestId !== requestSequence.current) return [] as WorkoutSet[];
      setStatus('error');
      setError(toUserFacingWorkoutError(caught));
      return [] as WorkoutSet[];
    }
  }, [exerciseKey]);

  useEffect(() => { void load(); }, [load]);

  const runMutation = useCallback(async (
    action: Exclude<WorkoutSetAction, null>,
    targetId: string,
    request: WorkoutMutationRequest,
    task: () => Promise<void>,
    onQueued?: () => void,
  ) => {
    setBusy({ action, targetId });
    setError('');
    try {
      if (mutationExecutor) {
        const outcome = await mutationExecutor.execute(request);
        if (outcome.state === 'failed') throw new Error(outcome.error ?? 'Workout change was rejected.');
        if (outcome.state === 'applied') {
          await load(true);
          return true;
        }
        onQueued?.();
        return false;
      }
      await task();
      await load(true);
      return true;
    } catch (caught) {
      setError(toUserFacingWorkoutError(caught));
      return false;
    } finally {
      setBusy(null);
    }
  }, [load, mutationExecutor]);

  const addSet = useCallback(async (workoutExerciseId: string, setType: WorkoutSetType = 'WORKING') => runMutation(
    'add', workoutExerciseId,
    { kind: 'ADD_SET', payload: { workoutExerciseId, setType: setType === 'WARMUP' ? 'WARMUP' : 'WORKING' } },
    async () => { await serviceRef.current!.addSet(workoutExerciseId, setType); },
  ), [runMutation]);

  const copySet = useCallback(async (workoutSetId: string) => runMutation(
    'copy', workoutSetId,
    { kind: 'COPY_SET', payload: { workoutSetId } },
    async () => { await serviceRef.current!.copySet(workoutSetId); },
  ), [runMutation]);

  const saveSet = useCallback(async (workoutSetId: string, input: WorkoutSetInput) => runMutation(
    'save', workoutSetId,
    { kind: 'SAVE_SET', payload: { workoutSetId, ...input, setType: input.setType === 'WARMUP' ? 'WARMUP' : 'WORKING' } },
    async () => { await serviceRef.current!.saveSet(workoutSetId, input); },
    () => {
      setSets((current) => current.map((set) => set.id === workoutSetId ? {
        ...set,
        setType: input.setType,
        weightKg: input.weightKg,
        reps: input.reps,
        bodyweightMode: input.bodyweightMode,
        completed: input.completed,
        completedAt: input.completed ? (set.completedAt ?? new Date().toISOString()) : null,
      } : set));
    },
  ), [runMutation]);

  const removeSet = useCallback(async (workoutSetId: string) => runMutation(
    'remove', workoutSetId,
    { kind: 'REMOVE_SET', payload: { workoutSetId } },
    async () => { await serviceRef.current!.removeSet(workoutSetId); },
  ), [runMutation]);

  return { status, sets, busy, error, retry: load, addSet, copySet, saveSet, removeSet };
}
