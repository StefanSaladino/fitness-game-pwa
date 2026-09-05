import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkoutCompositionAction, WorkoutExercise } from '../model';
import { createIdempotencyKey, type WorkoutMutationExecutor, type WorkoutMutationRequest } from '../mutations/workoutMutationModel';
import { toUserFacingWorkoutError } from '../workoutMessages';
import { createWorkoutExerciseService, type WorkoutExerciseService } from '../workoutExerciseService';

export type WorkoutExerciseStatus = 'loading' | 'ready' | 'error';

export function useWorkoutExercises(workoutId: string | null, injectedService?: WorkoutExerciseService, mutationExecutor?: WorkoutMutationExecutor) {
  const serviceRef = useRef<WorkoutExerciseService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createWorkoutExerciseService();

  const requestSequence = useRef(0);
  const [status, setStatus] = useState<WorkoutExerciseStatus>(workoutId ? 'loading' : 'ready');
  const [resolvedWorkoutId, setResolvedWorkoutId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [busyAction, setBusyAction] = useState<WorkoutCompositionAction>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!workoutId) {
      setExercises([]);
      setResolvedWorkoutId(null);
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
      setResolvedWorkoutId(workoutId);
      setStatus('ready');
      return loaded;
    } catch (caught) {
      if (requestId !== requestSequence.current) return [] as WorkoutExercise[];
      setExercises([]);
      setResolvedWorkoutId(workoutId);
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
        if (outcome.state === 'failed' || outcome.state === 'conflict') {
          throw new Error(outcome.error ?? (outcome.state === 'conflict' ? 'WORKOUT_CONFLICT: This workout changed elsewhere.' : 'Workout change was rejected.'));
        }
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

  const removeExercise = useCallback(async (workoutExerciseId: string) => {
    const expectedRevision = exercises.find((exercise) => exercise.id === workoutExerciseId)?.revision ?? null;
    return runMutation(
    'remove',
    { kind: 'REMOVE_EXERCISE', payload: { workoutExerciseId, expectedRevision } },
    async () => { await serviceRef.current!.removeExercise(workoutExerciseId); },
    );
  }, [exercises, runMutation]);

  const moveExercise = useCallback(async (workoutExerciseId: string, newOrderIndex: number) => {
    const expectedRevision = exercises.find((exercise) => exercise.id === workoutExerciseId)?.revision ?? null;
    return runMutation(
    'move',
    { kind: 'MOVE_EXERCISE', payload: { workoutExerciseId, newOrderIndex, expectedRevision } },
    async () => { await serviceRef.current!.moveExercise(workoutExerciseId, newOrderIndex); },
    );
  }, [exercises, runMutation]);

  const saveSuperset = useCallback(async (supersetGroupId: string | null, workoutExerciseIds: string[]) => {
    if (!workoutId || !mutationExecutor) {
      setError('Superset changes require the protected workout mutation queue.');
      return false;
    }

    const memberIds = [...new Set(workoutExerciseIds)];
    if (memberIds.length < 2) {
      setError('A Superset needs at least two exercises.');
      return false;
    }

    const selected = memberIds.map((id) => exercises.find((exercise) => exercise.id === id));
    if (selected.some((exercise) => !exercise)) {
      setError('One of the selected exercises is no longer in this workout.');
      return false;
    }

    const targetGroupId = supersetGroupId ?? createIdempotencyKey();
    const currentMembers = supersetGroupId
      ? exercises.filter((exercise) => exercise.supersetGroupId === supersetGroupId)
      : [];

    if (supersetGroupId && currentMembers.length < 2) {
      setError('This Superset is no longer available. Reload the workout and try again.');
      return false;
    }

    const targetMembers = selected as WorkoutExercise[];
    if (targetMembers.some((exercise) => exercise.supersetGroupId !== null && exercise.supersetGroupId !== supersetGroupId)) {
      setError('An exercise can only belong to one Superset at a time.');
      return false;
    }

    return runMutation(
      'superset',
      {
        kind: 'SET_SUPERSET',
        payload: {
          supersetGroupId: targetGroupId,
          expectedMembers: currentMembers
            .sort((a, b) => (a.supersetOrder ?? 0) - (b.supersetOrder ?? 0))
            .map((exercise) => ({ workoutExerciseId: exercise.id, expectedRevision: exercise.revision })),
          members: targetMembers.map((exercise, supersetOrder) => ({
            workoutExerciseId: exercise.id,
            supersetOrder,
            expectedRevision: exercise.revision,
            expectedSupersetGroupId: exercise.supersetGroupId,
          })),
        },
      },
      async () => { throw new Error('Superset changes require the protected workout mutation queue.'); },
    );
  }, [exercises, mutationExecutor, runMutation, workoutId]);

  const clearSuperset = useCallback(async (supersetGroupId: string) => {
    if (!workoutId || !mutationExecutor) {
      setError('Superset changes require the protected workout mutation queue.');
      return false;
    }
    const currentMembers = exercises
      .filter((exercise) => exercise.supersetGroupId === supersetGroupId)
      .sort((a, b) => (a.supersetOrder ?? 0) - (b.supersetOrder ?? 0));
    if (currentMembers.length < 2) {
      setError('This Superset is no longer available. Reload the workout and try again.');
      return false;
    }

    return runMutation(
      'superset',
      {
        kind: 'CLEAR_SUPERSET',
        payload: {
          supersetGroupId,
          expectedMembers: currentMembers.map((exercise) => ({ workoutExerciseId: exercise.id, expectedRevision: exercise.revision })),
        },
      },
      async () => { throw new Error('Superset changes require the protected workout mutation queue.'); },
    );
  }, [exercises, mutationExecutor, runMutation, workoutId]);

  const resolvedForCurrentWorkout = workoutId === null || resolvedWorkoutId === workoutId;
  const effectiveStatus: WorkoutExerciseStatus = resolvedForCurrentWorkout ? status : 'loading';
  const effectiveExercises = resolvedForCurrentWorkout ? exercises : [];

  return { status: effectiveStatus, exercises: effectiveExercises, busyAction, error, retry: load, addExercise, removeExercise, moveExercise, saveSuperset, clearSuperset };
}
