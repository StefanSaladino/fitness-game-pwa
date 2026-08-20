import { classifyWorkoutMutationError, type WorkoutMutationQueueItem } from './workoutMutationModel';
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
    attemptedCount += 1;
    const attemptedAt = nowMs();
    try {
      await service.apply(current);
      queue.shift();
      appliedCount += 1;
    } catch (error) {
      const kind = classifyWorkoutMutationError(error);
      const message = error instanceof Error ? error.message : String((error as { message?: unknown } | null)?.message ?? error ?? 'Workout mutation failed');
      queue[0] = {
        ...current,
        attemptCount: current.attemptCount + 1,
        lastAttemptAtMs: attemptedAt,
        status: kind === 'terminal' ? 'failed' : kind === 'conflict' ? 'conflict' : 'pending',
        lastError: message,
      };
      break;
    }
  }

  return { items: queue, appliedCount, attemptedCount };
}
