import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  WorkoutAdvancedSetInput,
  WorkoutAdvancedSetVariant,
  WorkoutSet,
  WorkoutSetAction,
  WorkoutSetInput,
  WorkoutSetSegment,
  WorkoutSetType,
} from '../model';
import type { WorkoutMutationExecutor, WorkoutMutationRequest } from '../mutations/workoutMutationModel';
import { toUserFacingWorkoutError } from '../workoutMessages';
import { createWorkoutSetService, type WorkoutSetService } from '../workoutSetService';

export type WorkoutSetStatus = 'loading' | 'ready' | 'error';

export interface WorkoutSetBusyState {
  action: Exclude<WorkoutSetAction, null>;
  targetId: string;
}

function queuedSetType(setType: WorkoutSetType): 'WARMUP' | 'WORKING' {
  return setType === 'WARMUP' ? 'WARMUP' : 'WORKING';
}

function mirrorAdvancedSegment(input: WorkoutAdvancedSetInput): { weightKg: number | null; reps: number | null } {
  const epleyCandidates = input.segments
    .filter((segment) => segment.weightKg !== null && segment.weightKg > 0 && segment.reps !== null && segment.reps >= 1 && segment.reps <= 12)
    .map((segment) => ({
      weightKg: segment.weightKg,
      reps: segment.reps,
      e1rm: (segment.weightKg ?? 0) * (1 + (segment.reps ?? 0) / 30),
    }))
    .sort((left, right) => right.e1rm - left.e1rm);
  if (epleyCandidates[0]) return { weightKg: epleyCandidates[0].weightKg, reps: epleyCandidates[0].reps };
  const fallback = input.segments.find((segment) => segment.weightKg !== null && segment.reps !== null);
  return { weightKg: fallback?.weightKg ?? null, reps: fallback?.reps ?? null };
}

function optimisticSegments(
  workoutSetId: string,
  input: WorkoutAdvancedSetInput,
  source: WorkoutSet,
): WorkoutSetSegment[] {
  return input.segments.map((segment, index) => ({
    id: source.segments?.[index]?.id ?? `queued:${workoutSetId}:${index}`,
    workoutSetId,
    segmentIndex: index,
    weightKg: segment.weightKg,
    reps: segment.reps,
  }));
}

export function useWorkoutSets(
  workoutExerciseIds: readonly string[],
  injectedService?: WorkoutSetService,
  mutationExecutor?: WorkoutMutationExecutor,
  recoverySets: readonly WorkoutSet[] = [],
  onQueuedSetRevision?: (workoutSetId: string, revision: number) => void,
) {
  const serviceRef = useRef<WorkoutSetService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createWorkoutSetService();

  const exerciseKey = workoutExerciseIds.join('|');
  const requestSequence = useRef(0);
  const revisionCursor = useRef<Map<string, number>>(new Map());
  const [status, setStatus] = useState<WorkoutSetStatus>(exerciseKey ? 'loading' : 'ready');
  const [resolvedExerciseKey, setResolvedExerciseKey] = useState<string | null>(exerciseKey ? null : '');
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [busy, setBusy] = useState<WorkoutSetBusyState | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    const requestId = ++requestSequence.current;
    const ids = exerciseKey ? exerciseKey.split('|') : [];
    if (ids.length === 0) {
      setSets([]);
      setResolvedExerciseKey('');
      setStatus('ready');
      setError('');
      return [] as WorkoutSet[];
    }

    if (!quiet) setStatus('loading');
    setError('');
    try {
      const loaded = await serviceRef.current!.loadWorkoutSets(ids);
      if (requestId !== requestSequence.current) return [] as WorkoutSet[];
      revisionCursor.current = new Map(loaded.map((set) => [set.id, set.revision]));
      setSets(loaded);
      setResolvedExerciseKey(exerciseKey);
      setStatus('ready');
      return loaded;
    } catch (caught) {
      if (requestId !== requestSequence.current) return [] as WorkoutSet[];
      setResolvedExerciseKey(exerciseKey);
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
        if (outcome.state === 'failed' || outcome.state === 'conflict') {
          throw new Error(outcome.error ?? (outcome.state === 'conflict' ? 'WORKOUT_CONFLICT: This workout changed elsewhere.' : 'Workout change was rejected.'));
        }
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
    { kind: 'ADD_SET', payload: { workoutExerciseId, setType: queuedSetType(setType) } },
    async () => { await serviceRef.current!.addSet(workoutExerciseId, setType); },
  ), [runMutation]);

  const addAdvancedSet = useCallback(async (workoutExerciseId: string, variant: WorkoutAdvancedSetVariant) => runMutation(
    'add', workoutExerciseId,
    { kind: 'ADD_ADVANCED_SET', payload: { workoutExerciseId, variant } },
    async () => { await serviceRef.current!.addAdvancedSet(workoutExerciseId, variant); },
  ), [runMutation]);

  const revisionSourceFor = useCallback((workoutSetId: string) => {
    const source = sets.find((set) => set.id === workoutSetId)
      ?? recoverySets.find((set) => set.id === workoutSetId)
      ?? null;
    if (!source) return null;
    const cursor = revisionCursor.current.get(workoutSetId);
    return cursor === undefined ? source : { ...source, revision: cursor };
  }, [recoverySets, sets]);

  const copySet = useCallback(async (workoutSetId: string) => {
    const expectedRevision = revisionSourceFor(workoutSetId)?.revision ?? null;
    return runMutation(
      'copy', workoutSetId,
      { kind: 'COPY_SET', payload: { workoutSetId, expectedRevision } },
      async () => { await serviceRef.current!.copySet(workoutSetId); },
    );
  }, [revisionSourceFor, runMutation]);

  const saveSet = useCallback(async (workoutSetId: string, input: WorkoutSetInput) => {
    const revisionSource = revisionSourceFor(workoutSetId);
    const expectedRevision = revisionSource?.revision ?? null;
    return runMutation(
      'save', workoutSetId,
      { kind: 'SAVE_SET', payload: { workoutSetId, ...input, setType: queuedSetType(input.setType), expectedRevision } },
      async () => { await serviceRef.current!.saveSet(workoutSetId, input); },
      () => {
        if (!revisionSource || expectedRevision === null) return;
        const nextRevision = expectedRevision + 1;
        revisionCursor.current.set(workoutSetId, nextRevision);
        const optimistic = {
          ...revisionSource,
          setType: input.setType,
          setVariant: 'STANDARD' as const,
          segments: [],
          weightKg: input.weightKg,
          reps: input.reps,
          bodyweightMode: input.bodyweightMode,
          completed: input.completed,
          completedAt: input.completed ? (revisionSource.completedAt ?? new Date().toISOString()) : null,
          revision: nextRevision,
        };
        setSets((current) => current.some((set) => set.id === workoutSetId)
          ? current.map((set) => set.id === workoutSetId ? optimistic : set)
          : [...current, optimistic]);
        onQueuedSetRevision?.(workoutSetId, nextRevision);
      },
    );
  }, [onQueuedSetRevision, revisionSourceFor, runMutation]);

  const saveAdvancedSet = useCallback(async (workoutSetId: string, input: WorkoutAdvancedSetInput) => {
    const revisionSource = revisionSourceFor(workoutSetId);
    const expectedRevision = revisionSource?.revision ?? null;
    return runMutation(
      'save', workoutSetId,
      { kind: 'SAVE_ADVANCED_SET', payload: { workoutSetId, ...input, expectedRevision } },
      async () => { await serviceRef.current!.saveAdvancedSet(workoutSetId, input); },
      () => {
        if (!revisionSource || expectedRevision === null) return;
        const nextRevision = expectedRevision + 1;
        const mirror = mirrorAdvancedSegment(input);
        revisionCursor.current.set(workoutSetId, nextRevision);
        const optimistic: WorkoutSet = {
          ...revisionSource,
          setType: input.variant === 'DROP' ? 'DROP' : 'WORKING',
          setVariant: input.variant,
          segments: optimisticSegments(workoutSetId, input, revisionSource),
          weightKg: mirror.weightKg,
          reps: mirror.reps,
          bodyweightMode: null,
          completed: input.completed,
          completedAt: input.completed ? (revisionSource.completedAt ?? new Date().toISOString()) : null,
          revision: nextRevision,
        };
        setSets((current) => current.some((set) => set.id === workoutSetId)
          ? current.map((set) => set.id === workoutSetId ? optimistic : set)
          : [...current, optimistic]);
        onQueuedSetRevision?.(workoutSetId, nextRevision);
      },
    );
  }, [onQueuedSetRevision, revisionSourceFor, runMutation]);

  const removeSet = useCallback(async (workoutSetId: string) => {
    const expectedRevision = revisionSourceFor(workoutSetId)?.revision ?? null;
    return runMutation(
      'remove', workoutSetId,
      { kind: 'REMOVE_SET', payload: { workoutSetId, expectedRevision } },
      async () => { await serviceRef.current!.removeSet(workoutSetId); },
    );
  }, [revisionSourceFor, runMutation]);

  const resolvedForCurrentExercises = resolvedExerciseKey === exerciseKey;
  const effectiveStatus: WorkoutSetStatus = resolvedForCurrentExercises ? status : 'loading';
  const effectiveSets = resolvedForCurrentExercises ? sets : [];

  return {
    status: effectiveStatus,
    sets: effectiveSets,
    busy,
    error,
    retry: load,
    addSet,
    addAdvancedSet,
    copySet,
    saveSet,
    saveAdvancedSet,
    removeSet,
  };
}
