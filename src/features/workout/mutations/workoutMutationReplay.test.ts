import { describe, expect, it, vi } from 'vitest';
import { createWorkoutMutationQueueItem, type WorkoutMutationQueueItem } from './workoutMutationModel';
import { replayWorkoutMutations } from './workoutMutationReplay';
import type { WorkoutMutationService } from './workoutMutationService';

const first = createWorkoutMutationQueueItem('user-1', 'workout-1', { kind: 'ADD_SET', payload: { workoutExerciseId: 'we-1', setType: 'WORKING' } }, '11111111-1111-4111-8111-111111111111', 100);
const second = createWorkoutMutationQueueItem('user-1', 'workout-1', { kind: 'COPY_SET', payload: { workoutSetId: 'set-1' } }, '22222222-2222-4222-8222-222222222222', 200);

describe('workout mutation replay', () => {
  it('replays in order and drains successful mutations', async () => {
    const apply = vi.fn(async (_item: WorkoutMutationQueueItem) => undefined);
    const result = await replayWorkoutMutations([first, second], { apply } as WorkoutMutationService, () => 500);

    expect(apply.mock.calls.map(([item]) => item.idempotencyKey)).toEqual([first.idempotencyKey, second.idempotencyKey]);
    expect(result.items).toEqual([]);
    expect(result.appliedCount).toBe(2);
  });

  it('keeps a retryable failure pending and does not overtake it', async () => {
    const apply = vi.fn(async (_item: WorkoutMutationQueueItem) => { throw new TypeError('Failed to fetch'); });
    const result = await replayWorkoutMutations([first, second], { apply } as WorkoutMutationService, () => 500);

    expect(apply).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual(expect.objectContaining({ status: 'pending', attemptCount: 1, lastAttemptAtMs: 500 }));
    expect(result.items[1]?.idempotencyKey).toBe(second.idempotencyKey);
  });

  it('marks a terminal failure as blocked and stops later ordered writes', async () => {
    const apply = vi.fn(async (_item: WorkoutMutationQueueItem) => { throw { code: '22023', message: 'Weight is out of range' }; });
    const result = await replayWorkoutMutations([first, second], { apply } as WorkoutMutationService, () => 500);

    expect(apply).toHaveBeenCalledTimes(1);
    expect(result.items[0]).toEqual(expect.objectContaining({ status: 'failed', lastError: 'Weight is out of range' }));
    expect(result.items[1]?.idempotencyKey).toBe(second.idempotencyKey);
  });
});
