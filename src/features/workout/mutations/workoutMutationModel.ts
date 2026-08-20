export const WORKOUT_MUTATION_QUEUE_VERSION = 1 as const;

export type WorkoutMutationRequest =
  | { kind: 'ADD_EXERCISE'; payload: { exerciseId: string } }
  | { kind: 'REMOVE_EXERCISE'; payload: { workoutExerciseId: string } }
  | { kind: 'MOVE_EXERCISE'; payload: { workoutExerciseId: string; newOrderIndex: number } }
  | { kind: 'ADD_SET'; payload: { workoutExerciseId: string; setType: 'WARMUP' | 'WORKING' } }
  | { kind: 'COPY_SET'; payload: { workoutSetId: string } }
  | {
      kind: 'SAVE_SET';
      payload: {
        workoutSetId: string;
        setType: 'WARMUP' | 'WORKING';
        weightKg: number | null;
        reps: number | null;
        bodyweightMode: 'BODYWEIGHT' | 'ADDED_WEIGHT' | 'ASSISTED' | null;
        completed: boolean;
      };
    }
  | { kind: 'REMOVE_SET'; payload: { workoutSetId: string } };

export type WorkoutMutationKind = WorkoutMutationRequest['kind'];
export type WorkoutMutationQueueItemStatus = 'pending' | 'failed';

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

export type WorkoutMutationErrorKind = 'retryable' | 'terminal';
export type WorkoutMutationExecutionState = 'applied' | 'queued' | 'failed';

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

export function isWorkoutMutationRequest(value: unknown): value is WorkoutMutationRequest {
  if (!isRecord(value) || !isRecord(value.payload) || typeof value.kind !== 'string') return false;
  const payload = value.payload;
  switch (value.kind) {
    case 'ADD_EXERCISE':
      return isNonEmptyString(payload.exerciseId);
    case 'REMOVE_EXERCISE':
      return isNonEmptyString(payload.workoutExerciseId);
    case 'MOVE_EXERCISE':
      return isNonEmptyString(payload.workoutExerciseId)
        && typeof payload.newOrderIndex === 'number'
        && Number.isInteger(payload.newOrderIndex)
        && payload.newOrderIndex >= 0;
    case 'ADD_SET':
      return isNonEmptyString(payload.workoutExerciseId)
        && (payload.setType === 'WARMUP' || payload.setType === 'WORKING');
    case 'COPY_SET':
    case 'REMOVE_SET':
      return isNonEmptyString(payload.workoutSetId);
    case 'SAVE_SET':
      return isNonEmptyString(payload.workoutSetId)
        && (payload.setType === 'WARMUP' || payload.setType === 'WORKING')
        && isNullableFiniteNumber(payload.weightKg)
        && isNullableInteger(payload.reps)
        && (payload.bodyweightMode === null || payload.bodyweightMode === 'BODYWEIGHT' || payload.bodyweightMode === 'ADDED_WEIGHT' || payload.bodyweightMode === 'ASSISTED')
        && typeof payload.completed === 'boolean';
    default:
      return false;
  }
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
  for (const item of value) {
    if (!isRecord(item)
      || item.version !== WORKOUT_MUTATION_QUEUE_VERSION
      || item.userId !== expectedUserId
      || !isNonEmptyString(item.idempotencyKey)
      || !isNonEmptyString(item.workoutId)
      || typeof item.createdAtMs !== 'number'
      || !Number.isFinite(item.createdAtMs)
      || typeof item.attemptCount !== 'number'
      || !Number.isInteger(item.attemptCount)
      || item.attemptCount < 0
      || (item.lastAttemptAtMs !== null && (typeof item.lastAttemptAtMs !== 'number' || !Number.isFinite(item.lastAttemptAtMs)))
      || (item.status !== 'pending' && item.status !== 'failed')
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
