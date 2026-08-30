import {
  classifyWorkoutMutationError,
  WORKOUT_MUTATION_EXPIRED_ERROR,
  WORKOUT_MUTATION_MAX_REPLAY_AGE_MS,
  type WorkoutMutationQueueItem,
} from './workoutMutationModel';
import { workoutMutationRetryBudgetExhausted } from './workoutMutationRetry';
import type { WorkoutMutationService } from './workoutMutationService';

export interface WorkoutMutationReplayResult {
  items: WorkoutMutationQueueItem[];
  appliedCount: number;
  attemptedCount: number;
}

export async function replayWorkoutMutations(
  items: readonly WorkoutMutationQueueItem[],
  service: WorkoutMutationService,
  nowMs: () => number = Date.now,
): Promise<WorkoutMutationReplayResult> {
  const queue = items.map((item) => ({ ...item, payload: { ...item.payload } }));
  let appliedCount = 0;
  let attemptedCount = 0;

  while (queue.length > 0) {
    const current = queue[0];
    if (current.status === 'failed' || current.status === 'conflict') break;

    const replayedAt = nowMs();
    if (replayedAt - current.createdAtMs > WORKOUT_MUTATION_MAX_REPLAY_AGE_MS) {
      queue[0] = {
        ...current,
        status: 'failed',
        lastError: WORKOUT_MUTATION_EXPIRED_ERROR,
      };
      break;
    }

    attemptedCount += 1;
    const attemptedAt = replayedAt;
    try {
      await service.apply(current);
      queue.shift();
      appliedCount += 1;
    } catch (error) {
      const kind = classifyWorkoutMutationError(error);
      const message = error instanceof Error ? error.message : String((error as { message?: unknown } | null)?.message ?? error ?? 'Workout mutation failed');
      const nextAttemptCount = current.attemptCount + 1;
      const retryBudgetExhausted = kind === 'retryable' && workoutMutationRetryBudgetExhausted(nextAttemptCount);
      queue[0] = {
        ...current,
        attemptCount: nextAttemptCount,
        lastAttemptAtMs: attemptedAt,
        status: kind === 'terminal' || retryBudgetExhausted ? 'failed' : kind === 'conflict' ? 'conflict' : 'pending',
        lastError: message,
      };
      break;
    }
  }

  return { items: queue, appliedCount, attemptedCount };
}
