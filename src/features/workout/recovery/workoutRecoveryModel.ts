import type {
  ActiveWorkoutSession,
  BodyweightLoadMode,
  WeightDisplayUnit,
  WorkoutExercise,
  WorkoutSet,
  WorkoutSetType,
} from '../model';

export const WORKOUT_RECOVERY_VERSION = 1 as const;

export interface WorkoutRecoverySessionSnapshot {
  id: string;
  userId: string;
  startedAt: string;
  activeDurationSeconds: number;
  timezoneAtStart: string;
  scoringDate: string;
  pausedAt: string | null;
  lastResumedAt: string | null;
}

export interface WorkoutRecoveryExerciseSnapshot {
  id: string;
  workoutId: string;
  exerciseId: string;
  orderIndex: number;
  supersetGroupId: string | null;
  supersetOrder: number | null;
  revision: number;
  canonicalName: string;
  measurementType: WorkoutExercise['measurementType'];
}

export interface WorkoutRecoverySetSnapshot {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  setType: WorkoutSetType;
  weightKg: number | null;
  reps: number | null;
  bodyweightMode: BodyweightLoadMode | null;
  completed: boolean;
  completedAt: string | null;
  revision: number;
}

export interface WorkoutRecoverySetDraft {
  setType: 'WARMUP' | 'WORKING';
  weight: string;
  reps: string;
  bodyweightMode: BodyweightLoadMode;
}

export interface WorkoutRecoveryUiSnapshot {
  weightUnit: WeightDisplayUnit;
  setDrafts: Record<string, WorkoutRecoverySetDraft>;
}

export interface ActiveWorkoutRecoverySnapshot {
  version: typeof WORKOUT_RECOVERY_VERSION;
  userId: string;
  savedAtMs: number;
  session: WorkoutRecoverySessionSnapshot;
  exercises: WorkoutRecoveryExerciseSnapshot[];
  sets: WorkoutRecoverySetSnapshot[];
  ui: WorkoutRecoveryUiSnapshot;
}

export type WorkoutRecoveryState = 'synced' | 'recovering' | 'offline' | 'local-only';

function snapshotSession(workout: ActiveWorkoutSession): WorkoutRecoverySessionSnapshot {
  return {
    id: workout.id,
    userId: workout.userId,
    startedAt: workout.startedAt,
    activeDurationSeconds: workout.activeDurationSeconds,
    timezoneAtStart: workout.timezoneAtStart,
    scoringDate: workout.scoringDate,
    pausedAt: workout.pausedAt,
    lastResumedAt: workout.lastResumedAt,
  };
}

function snapshotExercise(exercise: WorkoutExercise): WorkoutRecoveryExerciseSnapshot {
  return {
    id: exercise.id,
    workoutId: exercise.workoutId,
    exerciseId: exercise.exerciseId,
    orderIndex: exercise.orderIndex,
    supersetGroupId: exercise.supersetGroupId,
    supersetOrder: exercise.supersetOrder,
    revision: exercise.revision,
    canonicalName: exercise.canonicalName,
    measurementType: exercise.measurementType,
  };
}

function snapshotSet(set: WorkoutSet): WorkoutRecoverySetSnapshot {
  return {
    id: set.id,
    workoutExerciseId: set.workoutExerciseId,
    setNumber: set.setNumber,
    setType: set.setType,
    weightKg: set.weightKg,
    reps: set.reps,
    bodyweightMode: set.bodyweightMode,
    completed: set.completed,
    completedAt: set.completedAt,
    revision: set.revision,
  };
}

export function createWorkoutRecoverySnapshot(
  userId: string,
  workout: ActiveWorkoutSession,
  exercises: readonly WorkoutExercise[],
  sets: readonly WorkoutSet[],
  prior: ActiveWorkoutRecoverySnapshot | null,
  savedAtMs: number = Date.now(),
): ActiveWorkoutRecoverySnapshot {
  const orderedExercises = [...exercises].sort((a, b) => a.orderIndex - b.orderIndex);
  const exerciseIds = new Set(orderedExercises.map((exercise) => exercise.id));
  const orderedSets = [...sets]
    .filter((set) => exerciseIds.has(set.workoutExerciseId))
    .sort((a, b) => a.workoutExerciseId.localeCompare(b.workoutExerciseId) || a.setNumber - b.setNumber);
  const setIds = new Set(orderedSets.map((set) => set.id));
  const previousUi = prior && prior.session.id === workout.id
    ? prior.ui
    : { weightUnit: 'KG' as const, setDrafts: {} };
  const setDrafts = Object.fromEntries(
    Object.entries(previousUi.setDrafts).filter(([setId]) => setIds.has(setId)),
  );

  return {
    version: WORKOUT_RECOVERY_VERSION,
    userId,
    savedAtMs,
    session: snapshotSession(workout),
    exercises: orderedExercises.map(snapshotExercise),
    sets: orderedSets.map(snapshotSet),
    ui: {
      weightUnit: previousUi.weightUnit,
      setDrafts,
    },
  };
}

export function restoreWorkoutSession(snapshot: WorkoutRecoverySessionSnapshot): ActiveWorkoutSession {
  return {
    id: snapshot.id,
    userId: snapshot.userId,
    status: 'IN_PROGRESS',
    startedAt: snapshot.startedAt,
    endedAt: null,
    activeDurationSeconds: snapshot.activeDurationSeconds,
    timezoneAtStart: snapshot.timezoneAtStart,
    scoringDate: snapshot.scoringDate,
    pausedAt: snapshot.pausedAt,
    lastResumedAt: snapshot.lastResumedAt,
  };
}

export function restoreWorkoutExercises(snapshot: ActiveWorkoutRecoverySnapshot): WorkoutExercise[] {
  return snapshot.exercises
    .map((exercise) => ({ ...exercise }))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export function restoreWorkoutSets(snapshot: ActiveWorkoutRecoverySnapshot): WorkoutSet[] {
  return snapshot.sets
    .map((set) => ({ ...set }))
    .sort((a, b) => a.workoutExerciseId.localeCompare(b.workoutExerciseId) || a.setNumber - b.setNumber);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSetDraft(value: unknown): value is WorkoutRecoverySetDraft {
  if (!isRecord(value)) return false;
  return (value.setType === 'WARMUP' || value.setType === 'WORKING')
    && typeof value.weight === 'string'
    && typeof value.reps === 'string'
    && (value.bodyweightMode === 'BODYWEIGHT' || value.bodyweightMode === 'ADDED_WEIGHT' || value.bodyweightMode === 'ASSISTED');
}

function hasContiguousZeroBasedIndexes(values: readonly number[]): boolean {
  if (values.length === 0) return true;
  if (new Set(values).size !== values.length) return false;
  return [...values]
    .sort((left, right) => left - right)
    .every((value, index) => value === index);
}

function hasValidSupersetRecoveryShape(exercises: readonly Record<string, unknown>[]): boolean {
  const groups = new Map<string, number[]>();

  for (const exercise of exercises) {
    if (typeof exercise.supersetGroupId !== 'string') continue;
    if (typeof exercise.supersetOrder !== 'number') return false;
    const orders = groups.get(exercise.supersetGroupId) ?? [];
    orders.push(exercise.supersetOrder);
    groups.set(exercise.supersetGroupId, orders);
  }

  return [...groups.values()].every((orders) => orders.length >= 2 && hasContiguousZeroBasedIndexes(orders));
}

export function parseWorkoutRecoverySnapshot(value: unknown, expectedUserId: string): ActiveWorkoutRecoverySnapshot | null {
  if (!isRecord(value) || value.version !== WORKOUT_RECOVERY_VERSION || value.userId !== expectedUserId) return null;
  if (typeof value.savedAtMs !== 'number' || !Number.isFinite(value.savedAtMs)) return null;
  if (!isRecord(value.session) || value.session.userId !== expectedUserId) return null;
  const session = value.session;
  if (!isString(session.id) || !isString(session.startedAt) || !isString(session.timezoneAtStart) || !isString(session.scoringDate)) return null;
  if (typeof session.activeDurationSeconds !== 'number' || !Number.isFinite(session.activeDurationSeconds) || session.activeDurationSeconds < 0) return null;
  if (!isNullableString(session.pausedAt) || !isNullableString(session.lastResumedAt)) return null;
  if (!Array.isArray(value.exercises) || !Array.isArray(value.sets) || !isRecord(value.ui)) return null;
  if (value.ui.weightUnit !== 'KG' && value.ui.weightUnit !== 'LB') return null;
  if (!isRecord(value.ui.setDrafts)) return null;
  if (!Object.values(value.ui.setDrafts).every(isSetDraft)) return null;

  const exercises = value.exercises;
  const exercisesValid = exercises.every((exercise) => isRecord(exercise)
    && isString(exercise.id)
    && exercise.workoutId === session.id
    && isString(exercise.exerciseId)
    && typeof exercise.orderIndex === 'number'
    && Number.isInteger(exercise.orderIndex)
    && exercise.orderIndex >= 0
    && (exercise.supersetGroupId === undefined || exercise.supersetGroupId === null || isString(exercise.supersetGroupId))
    && (exercise.supersetOrder === undefined || exercise.supersetOrder === null
      || (typeof exercise.supersetOrder === 'number' && Number.isInteger(exercise.supersetOrder) && exercise.supersetOrder >= 0))
    && ((exercise.supersetGroupId === undefined || exercise.supersetGroupId === null)
      === (exercise.supersetOrder === undefined || exercise.supersetOrder === null))
    && (exercise.revision === undefined || (typeof exercise.revision === 'number' && Number.isInteger(exercise.revision) && exercise.revision >= 0))
    && isString(exercise.canonicalName)
    && ['WEIGHT_REPS', 'BODYWEIGHT_REPS', 'DURATION', 'OTHER'].includes(String(exercise.measurementType)));
  if (!exercisesValid) return null;

  const recoveryExercises = exercises as Record<string, unknown>[];
  const workoutExerciseIds = recoveryExercises.map((exercise) => String(exercise.id));
  if (new Set(workoutExerciseIds).size !== workoutExerciseIds.length) return null;

  const canonicalExerciseIds = recoveryExercises.map((exercise) => String(exercise.exerciseId));
  if (new Set(canonicalExerciseIds).size !== canonicalExerciseIds.length) return null;

  const exerciseOrderIndexes = recoveryExercises.map((exercise) => Number(exercise.orderIndex));
  if (!hasContiguousZeroBasedIndexes(exerciseOrderIndexes)) return null;
  if (!hasValidSupersetRecoveryShape(recoveryExercises)) return null;

  const exerciseIds = new Set(workoutExerciseIds);
  const setsValid = value.sets.every((set) => isRecord(set)
    && isString(set.id)
    && isString(set.workoutExerciseId)
    && exerciseIds.has(set.workoutExerciseId)
    && typeof set.setNumber === 'number'
    && Number.isInteger(set.setNumber)
    && set.setNumber >= 1
    && ['WARMUP', 'WORKING', 'DROP', 'FAILURE'].includes(String(set.setType))
    && (set.weightKg === null || (typeof set.weightKg === 'number' && Number.isFinite(set.weightKg)))
    && (set.reps === null || (typeof set.reps === 'number' && Number.isInteger(set.reps)))
    && (set.bodyweightMode === null || ['BODYWEIGHT', 'ADDED_WEIGHT', 'ASSISTED'].includes(String(set.bodyweightMode)))
    && typeof set.completed === 'boolean'
    && isNullableString(set.completedAt)
    && (set.revision === undefined || (typeof set.revision === 'number' && Number.isInteger(set.revision) && set.revision >= 0)));
  if (!setsValid) return null;

  const recoverySets = value.sets as Record<string, unknown>[];
  const setIds = recoverySets.map((set) => String(set.id));
  if (new Set(setIds).size !== setIds.length) return null;

  const setIdentityKeys = recoverySets.map((set) => `${String(set.workoutExerciseId)}:${String(set.setNumber)}`);
  if (new Set(setIdentityKeys).size !== setIdentityKeys.length) return null;

  const validSetIds = new Set(setIds);
  const normalizedSetDrafts = Object.fromEntries(
    Object.entries(value.ui.setDrafts).filter(([setId]) => validSetIds.has(setId)),
  ) as Record<string, WorkoutRecoverySetDraft>;

  return {
    ...(value as unknown as ActiveWorkoutRecoverySnapshot),
    exercises: exercises.map((exercise) => ({
      ...(exercise as unknown as WorkoutRecoveryExerciseSnapshot),
      supersetGroupId: typeof (exercise as Record<string, unknown>).supersetGroupId === 'string'
        ? (exercise as Record<string, unknown>).supersetGroupId as string
        : null,
      supersetOrder: typeof (exercise as Record<string, unknown>).supersetOrder === 'number'
        ? (exercise as Record<string, unknown>).supersetOrder as number
        : null,
      revision: typeof (exercise as Record<string, unknown>).revision === 'number'
        ? (exercise as Record<string, unknown>).revision as number
        : 0,
    })),
    sets: value.sets.map((set) => ({
      ...(set as unknown as WorkoutRecoverySetSnapshot),
      revision: typeof (set as Record<string, unknown>).revision === 'number'
        ? (set as Record<string, unknown>).revision as number
        : 0,
    })),
    ui: {
      weightUnit: value.ui.weightUnit as WeightDisplayUnit,
      setDrafts: normalizedSetDrafts,
    },
  };
}
