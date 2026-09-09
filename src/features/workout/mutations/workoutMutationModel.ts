export const WORKOUT_MUTATION_QUEUE_VERSION = 1 as const;
export const WORKOUT_MUTATION_MAX_REPLAY_AGE_MS = 30 * 24 * 60 * 60 * 1_000;
export const WORKOUT_MUTATION_EXPIRED_ERROR = 'Workout mutation expired after 30 days and was not replayed.';

export type WorkoutMutationRequest =
  | { kind: 'ADD_EXERCISE'; payload: { exerciseId: string } }
  | { kind: 'REMOVE_EXERCISE'; payload: { workoutExerciseId: string; expectedRevision: number | null } }
  | { kind: 'MOVE_EXERCISE'; payload: { workoutExerciseId: string; newOrderIndex: number; expectedRevision: number | null } }
  | {
      kind: 'SET_SUPERSET';
      payload: {
        supersetGroupId: string;
        expectedMembers: Array<{ workoutExerciseId: string; expectedRevision: number }>;
        members: Array<{
          workoutExerciseId: string;
          supersetOrder: number;
          expectedRevision: number;
          expectedSupersetGroupId: string | null;
        }>;
      };
    }
  | {
      kind: 'CLEAR_SUPERSET';
      payload: {
        supersetGroupId: string;
        expectedMembers: Array<{ workoutExerciseId: string; expectedRevision: number }>;
      };
    }
  | { kind: 'ADD_SET'; payload: { workoutExerciseId: string; setType: 'WARMUP' | 'WORKING' } }
  | { kind: 'ADD_ADVANCED_SET'; payload: { workoutExerciseId: string; variant: 'DROP' | 'ASCENDING_PYRAMID' | 'FULL_PYRAMID' } }
  | { kind: 'COPY_SET'; payload: { workoutSetId: string; expectedRevision: number | null } }
  | {
      kind: 'SAVE_SET';
      payload: {
        workoutSetId: string;
        setType: 'WARMUP' | 'WORKING';
        weightKg: number | null;
        reps: number | null;
        bodyweightMode: 'BODYWEIGHT' | 'ADDED_WEIGHT' | 'ASSISTED' | null;
        completed: boolean;
        expectedRevision: number | null;
      };
    }
  | {
      kind: 'SAVE_ADVANCED_SET';
      payload: {
        workoutSetId: string;
        variant: 'DROP' | 'ASCENDING_PYRAMID' | 'FULL_PYRAMID';
        segments: Array<{ weightKg: number | null; reps: number | null }>;
        completed: boolean;
        expectedRevision: number | null;
      };
    }
  | { kind: 'REMOVE_SET'; payload: { workoutSetId: string; expectedRevision: number | null } };

export type WorkoutMutationKind = WorkoutMutationRequest['kind'];
export type WorkoutMutationQueueItemStatus = 'pending' | 'failed' | 'conflict';

export interface WorkoutMutationQueueItem {
  version: typeof WORKOUT_MUTATION_QUEUE_VERSION;
  idempotencyKey: string;
  userId: string;
  workoutId: string;
  kind: WorkoutMutationKind;
  payload: Record<string, unknown>;
  createdAtMs: number;
  attemptCount: number;
  lastAttemptAtMs: number | null;
  status: WorkoutMutationQueueItemStatus;
  lastError: string | null;
}

export type WorkoutMutationErrorKind = 'retryable' | 'conflict' | 'terminal';
export type WorkoutMutationExecutionState = 'applied' | 'queued' | 'conflict' | 'failed';

export interface WorkoutMutationExecutionResult {
  state: WorkoutMutationExecutionState;
  idempotencyKey: string;
  error?: string;
}

export interface WorkoutMutationExecutor {
  execute(request: WorkoutMutationRequest): Promise<WorkoutMutationExecutionResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isNullableInteger(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value));
}

function isExpectedRevision(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0);
}

function isAdvancedSetVariant(value: unknown): value is 'DROP' | 'ASCENDING_PYRAMID' | 'FULL_PYRAMID' {
  return value === 'DROP' || value === 'ASCENDING_PYRAMID' || value === 'FULL_PYRAMID';
}

function isAdvancedSegments(value: unknown, variant: unknown): value is Array<{ weightKg: number | null; reps: number | null }> {
  if (!Array.isArray(value)) return false;
  const minimum = variant === 'FULL_PYRAMID' ? 3 : 2;
  if (value.length < minimum || value.length > 8) return false;
  return value.every((segment) => isRecord(segment)
    && isNullableFiniteNumber(segment.weightKg)
    && (segment.weightKg === null || segment.weightKg > 0)
    && isNullableInteger(segment.reps)
    && (segment.reps === null || (segment.reps >= 1 && segment.reps <= 999)));
}

function isSupersetExpectedMembers(value: unknown): value is Array<{ workoutExerciseId: string; expectedRevision: number }> {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  for (const member of value) {
    if (!isRecord(member)
      || !isNonEmptyString(member.workoutExerciseId)
      || !isExpectedRevision(member.expectedRevision)
      || member.expectedRevision === null
      || ids.has(member.workoutExerciseId)) return false;
    ids.add(member.workoutExerciseId);
  }
  return true;
}

function isSupersetMembers(value: unknown): value is Array<{
  workoutExerciseId: string;
  supersetOrder: number;
  expectedRevision: number;
  expectedSupersetGroupId: string | null;
}> {
  if (!Array.isArray(value) || value.length < 2) return false;
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const member of value) {
    if (!isRecord(member)
      || !isNonEmptyString(member.workoutExerciseId)
      || typeof member.supersetOrder !== 'number'
      || !Number.isInteger(member.supersetOrder)
      || member.supersetOrder < 0
      || !isExpectedRevision(member.expectedRevision)
      || member.expectedRevision === null
      || !(member.expectedSupersetGroupId === null || isNonEmptyString(member.expectedSupersetGroupId))
      || ids.has(member.workoutExerciseId)
      || orders.has(member.supersetOrder)) return false;
    ids.add(member.workoutExerciseId);
    orders.add(member.supersetOrder);
  }
  return orders.size === value.length
    && Math.min(...orders) === 0
    && Math.max(...orders) === value.length - 1;
}

export function isWorkoutMutationRequest(value: unknown): value is WorkoutMutationRequest {
  if (!isRecord(value) || !isRecord(value.payload) || typeof value.kind !== 'string') return false;
  const payload = value.payload;
  switch (value.kind) {
    case 'ADD_EXERCISE':
      return isNonEmptyString(payload.exerciseId);
    case 'REMOVE_EXERCISE':
      return isNonEmptyString(payload.workoutExerciseId)
        && isExpectedRevision(payload.expectedRevision);
    case 'MOVE_EXERCISE':
      return isNonEmptyString(payload.workoutExerciseId)
        && typeof payload.newOrderIndex === 'number'
        && Number.isInteger(payload.newOrderIndex)
        && payload.newOrderIndex >= 0
        && isExpectedRevision(payload.expectedRevision);
    case 'SET_SUPERSET':
      return isNonEmptyString(payload.supersetGroupId)
        && isSupersetExpectedMembers(payload.expectedMembers)
        && isSupersetMembers(payload.members);
    case 'CLEAR_SUPERSET':
      return isNonEmptyString(payload.supersetGroupId)
        && isSupersetExpectedMembers(payload.expectedMembers)
        && payload.expectedMembers.length >= 2;
    case 'ADD_SET':
      return isNonEmptyString(payload.workoutExerciseId)
        && (payload.setType === 'WARMUP' || payload.setType === 'WORKING');
    case 'ADD_ADVANCED_SET':
      return isNonEmptyString(payload.workoutExerciseId)
        && isAdvancedSetVariant(payload.variant);
    case 'COPY_SET':
    case 'REMOVE_SET':
      return isNonEmptyString(payload.workoutSetId)
        && isExpectedRevision(payload.expectedRevision);
    case 'SAVE_SET':
      return isNonEmptyString(payload.workoutSetId)
        && (payload.setType === 'WARMUP' || payload.setType === 'WORKING')
        && isNullableFiniteNumber(payload.weightKg)
        && isNullableInteger(payload.reps)
        && (payload.bodyweightMode === null || payload.bodyweightMode === 'BODYWEIGHT' || payload.bodyweightMode === 'ADDED_WEIGHT' || payload.bodyweightMode === 'ASSISTED')
        && typeof payload.completed === 'boolean'
        && isExpectedRevision(payload.expectedRevision);
    case 'SAVE_ADVANCED_SET':
      return isNonEmptyString(payload.workoutSetId)
        && isAdvancedSetVariant(payload.variant)
        && isAdvancedSegments(payload.segments, payload.variant)
        && typeof payload.completed === 'boolean'
        && isExpectedRevision(payload.expectedRevision);
    default:
      return false;
  }
}

function normalizeLegacyPayload(kind: unknown, payload: Record<string, unknown>): Record<string, unknown> {
  if (
    kind === 'REMOVE_EXERCISE'
    || kind === 'MOVE_EXERCISE'
    || kind === 'COPY_SET'
    || kind === 'SAVE_SET'
    || kind === 'REMOVE_SET'
  ) {
    return Object.prototype.hasOwnProperty.call(payload, 'expectedRevision')
      ? payload
      : { ...payload, expectedRevision: null };
  }
  return payload;
}

export function createWorkoutMutationQueueItem(
  userId: string,
  workoutId: string,
  request: WorkoutMutationRequest,
  idempotencyKey: string = createIdempotencyKey(),
  createdAtMs: number = Date.now(),
): WorkoutMutationQueueItem {
  return {
    version: WORKOUT_MUTATION_QUEUE_VERSION,
    idempotencyKey,
    userId,
    workoutId,
    kind: request.kind,
    payload: { ...request.payload },
    createdAtMs,
    attemptCount: 0,
    lastAttemptAtMs: null,
    status: 'pending',
    lastError: null,
  };
}

export function parseWorkoutMutationQueue(value: unknown, expectedUserId: string): WorkoutMutationQueueItem[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: WorkoutMutationQueueItem[] = [];
  for (const rawItem of value) {
    if (!isRecord(rawItem) || !isRecord(rawItem.payload)) return null;
    const payload = normalizeLegacyPayload(rawItem.kind, rawItem.payload);
    const item: Record<string, unknown> = { ...rawItem, payload };
    if (item.version !== WORKOUT_MUTATION_QUEUE_VERSION
      || item.userId !== expectedUserId
      || !isNonEmptyString(item.idempotencyKey)
      || !isNonEmptyString(item.workoutId)
      || typeof item.createdAtMs !== 'number'
      || !Number.isFinite(item.createdAtMs)
      || typeof item.attemptCount !== 'number'
      || !Number.isInteger(item.attemptCount)
      || item.attemptCount < 0
      || (item.lastAttemptAtMs !== null && (typeof item.lastAttemptAtMs !== 'number' || !Number.isFinite(item.lastAttemptAtMs)))
      || (item.status !== 'pending' && item.status !== 'failed' && item.status !== 'conflict')
      || (item.lastError !== null && typeof item.lastError !== 'string')
      || !isWorkoutMutationRequest({ kind: item.kind, payload: item.payload })) {
      return null;
    }
    parsed.push(item as unknown as WorkoutMutationQueueItem);
  }
  return parsed.sort((a, b) => a.createdAtMs - b.createdAtMs || a.idempotencyKey.localeCompare(b.idempotencyKey));
}

export function classifyWorkoutMutationError(error: unknown): WorkoutMutationErrorKind {
  const candidate = isRecord(error) ? error : {};
  const message = error instanceof Error ? error.message : String(candidate.message ?? error ?? '');
  const code = String(candidate.code ?? '').toUpperCase();
  const status = typeof candidate.status === 'number' ? candidate.status : Number(candidate.status ?? NaN);

  if (/WORKOUT_CONFLICT:/i.test(message)) return 'conflict';
  if (status === 408 || status === 425 || status === 429 || status >= 500) return 'retryable';
  if (/^(08|53)/.test(code) || ['40001', '40P01', '57P01', '57P02', '57P03'].includes(code)) return 'retryable';
  if (/network|failed to fetch|fetch failed|connection|timeout|timed out|econn|socket|offline/i.test(message)) return 'retryable';
  return 'terminal';
}

export function createIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const random = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${random()}${random()}-${random()}-4${random().slice(1)}-${((8 + Math.floor(Math.random() * 4)).toString(16))}${random().slice(1)}-${random()}${random()}${random()}`;
}
