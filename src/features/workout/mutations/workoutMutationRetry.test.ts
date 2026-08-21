import { describe, expect, it } from 'vitest';
import { createWorkoutMutationQueueItem } from './workoutMutationModel';
import {
  WORKOUT_MUTATION_AUTO_RETRY_LIMIT,
  workoutMutationCanAutoReplay,
  workoutMutationNextAutoRetryAtMs,
  workoutMutationRetryBudgetExhausted,
  workoutMutationRetryDelayMs,
} from './workoutMutationRetry';

const item = createWorkoutMutationQueueItem(
  'user-1',
  'workout-1',
  { kind: 'ADD_SET', payload: { workoutExerciseId: 'we-1', setType: 'WORKING' } },
  '11111111-1111-4111-8111-111111111111',
  100,
);

describe('workout mutation retry policy', () => {
  it('uses bounded exponential delays and stops automatic retry at the attempt limit', () => {
    expect(workoutMutationRetryDelayMs(0)).toBe(0);
    expect(workoutMutationRetryDelayMs(1)).toBe(1_000);
    expect(workoutMutationRetryDelayMs(2)).toBe(2_000);
    expect(workoutMutationRetryDelayMs(3)).toBe(4_000);
    expect(workoutMutationRetryDelayMs(WORKOUT_MUTATION_AUTO_RETRY_LIMIT)).toBeNull();
    expect(workoutMutationRetryBudgetExhausted(WORKOUT_MUTATION_AUTO_RETRY_LIMIT)).toBe(true);
  });

  it('respects persisted last-attempt metadata after an app restart', () => {
    const persisted = { ...item, attemptCount: 2, lastAttemptAtMs: 5_000 };
    expect(workoutMutationNextAutoRetryAtMs(persisted)).toBe(7_000);
    expect(workoutMutationCanAutoReplay(persisted, 6_999)).toBe(false);
    expect(workoutMutationCanAutoReplay(persisted, 7_000)).toBe(true);
  });

  it('never auto-retries blocked or conflicted items', () => {
    expect(workoutMutationNextAutoRetryAtMs({ ...item, status: 'failed' })).toBeNull();
    expect(workoutMutationNextAutoRetryAtMs({ ...item, status: 'conflict' })).toBeNull();
  });
});
