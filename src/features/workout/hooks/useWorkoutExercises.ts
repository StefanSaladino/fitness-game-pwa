import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkoutCompositionAction, WorkoutExercise } from '../model';
import type { WorkoutMutationExecutor, WorkoutMutationRequest } from '../mutations/workoutMutationModel';
import { toUserFacingWorkoutError } from '../workoutMessages';
import { createWorkoutExerciseService, type WorkoutExerciseService } from '../workoutExerciseService';

export type WorkoutExerciseStatus = 'loading' | 'ready' | 'error';

export function useWorkoutExercises(workoutId: string | null, injectedService?: WorkoutExerciseService, mutationExecutor?: WorkoutMutationExecutor) {
  const serviceRef = useRef<WorkoutExerciseService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createWorkoutExerciseService();

  const requestSequence = useRef(0);
  const [status, setStatus] = useState<WorkoutExerciseStatus>(workoutId ? 'loading' : 'ready');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [busyAction, setBusyAction] = useState<WorkoutCompositionAction>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!workoutId) {
      setExercises([]);
      setStatus('ready');
      setError('');
      return [] as WorkoutExercise[];
    }

    setStatus('loading');
    setError('');
    try {
      const loaded = await serviceRef.current!.loadWorkoutExercises(workoutId);
      if (requestId !== requestSequence.current) return [] as WorkoutExercise[];
      setExercises(loaded);
      setStatus('ready');
      return loaded;
    } catch (caught) {
      if (requestId !== requestSequence.current) return [] as WorkoutExercise[];
      setExercises([]);
      setStatus('error');
      setError(toUserFacingWorkoutError(caught));
      return [] as WorkoutExercise[];
    }
  }, [workoutId]);

  useEffect(() => { void load(); }, [load]);

  const runMutation = useCallback(async (
    action: Exclude<WorkoutCompositionAction, null>,
    request: WorkoutMutationRequest,
    task: () => Promise<void>,
  ) => {
    setBusyAction(action);
    setError('');
    try {
      if (mutationExecutor) {
        const outcome = await mutationExecutor.execute(request);
        if (outcome.state === 'failed') throw new Error(outcome.error ?? 'Workout change was rejected.');
        if (outcome.state === 'applied') await load();
        return true;
      }
      await task();
      await load();
      return true;
    } catch (caught) {
      setError(toUserFacingWorkoutError(caught));
      return false;
    } finally {
      setBusyAction(null);
    }
  }, [load, mutationExecutor]);

  const addExercise = useCallback(async (exerciseId: string) => {
    if (!workoutId) return false;
    return runMutation('add', { kind: 'ADD_EXERCISE', payload: { exerciseId } }, async () => {
      await serviceRef.current!.addExercise(workoutId, exerciseId);
    });
  }, [runMutation, workoutId]);

  const removeExercise = useCallback(async (workoutExerciseId: string) => runMutation(
    'remove',
    { kind: 'REMOVE_EXERCISE', payload: { workoutExerciseId } },
    async () => { await serviceRef.current!.removeExercise(workoutExerciseId); },
  ), [runMutation]);

  const moveExercise = useCallback(async (workoutExerciseId: string, newOrderIndex: number) => runMutation(
    'move',
    { kind: 'MOVE_EXERCISE', payload: { workoutExerciseId, newOrderIndex } },
    async () => { await serviceRef.current!.moveExercise(workoutExerciseId, newOrderIndex); },
  ), [runMutation]);

  return { status, exercises, busyAction, error, retry: load, addExercise, removeExercise, moveExercise };
}
