import type { WorkoutMutationQueueItem } from './workoutMutationModel';

export const WORKOUT_MUTATION_AUTO_RETRY_LIMIT = 4;
export const WORKOUT_MUTATION_RETRY_BASE_DELAY_MS = 1_000;
export const WORKOUT_MUTATION_RETRY_MAX_DELAY_MS = 8_000;

export function workoutMutationRetryDelayMs(attemptCount: number): number | null {
  if (!Number.isInteger(attemptCount) || attemptCount < 0) return null;
  if (attemptCount === 0) return 0;
  if (attemptCount >= WORKOUT_MUTATION_AUTO_RETRY_LIMIT) return null;
  return Math.min(
    WORKOUT_MUTATION_RETRY_BASE_DELAY_MS * (2 ** (attemptCount - 1)),
    WORKOUT_MUTATION_RETRY_MAX_DELAY_MS,
  );
}

export function workoutMutationNextAutoRetryAtMs(item: WorkoutMutationQueueItem): number | null {
  if (item.status !== 'pending') return null;
  const delay = workoutMutationRetryDelayMs(item.attemptCount);
  if (delay === null) return null;
  if (item.attemptCount === 0 || item.lastAttemptAtMs === null) return 0;
  return item.lastAttemptAtMs + delay;
}

export function workoutMutationCanAutoReplay(item: WorkoutMutationQueueItem, nowMs: number = Date.now()): boolean {
  const nextAt = workoutMutationNextAutoRetryAtMs(item);
  return nextAt !== null && (nextAt === 0 || nextAt <= nowMs);
}

export function workoutMutationRetryBudgetExhausted(attemptCount: number): boolean {
  return attemptCount >= WORKOUT_MUTATION_AUTO_RETRY_LIMIT;
}
