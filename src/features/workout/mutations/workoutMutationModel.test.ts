import { describe, expect, it } from 'vitest';
import {
  classifyWorkoutMutationError,
  createWorkoutMutationQueueItem,
  parseWorkoutMutationQueue,
} from './workoutMutationModel';

describe('workout mutation model', () => {
  it('creates a versioned per-user queue item with an explicit idempotency key', () => {
    const item = createWorkoutMutationQueueItem(
      'user-1',
      'workout-1',
      { kind: 'ADD_SET', payload: { workoutExerciseId: 'we-1', setType: 'WORKING' } },
      '11111111-1111-4111-8111-111111111111',
      123,
    );

    expect(item).toEqual(expect.objectContaining({
      version: 1,
      userId: 'user-1',
      workoutId: 'workout-1',
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
      kind: 'ADD_SET',
      createdAtMs: 123,
      status: 'pending',
      attemptCount: 0,
    }));
  });

  it('rejects a queue loaded for the wrong user or with an invalid payload', () => {
    const item = createWorkoutMutationQueueItem(
      'user-1',
      'workout-1',
      { kind: 'MOVE_EXERCISE', payload: { workoutExerciseId: 'we-1', newOrderIndex: 1 } },
      '11111111-1111-4111-8111-111111111111',
      123,
    );

    expect(parseWorkoutMutationQueue([item], 'other-user')).toBeNull();
    expect(parseWorkoutMutationQueue([{ ...item, payload: { workoutExerciseId: 'we-1', newOrderIndex: -1 } }], 'user-1')).toBeNull();
  });

  it('separates retryable transport failures from terminal validation and authorization failures', () => {
    expect(classifyWorkoutMutationError(new TypeError('Failed to fetch'))).toBe('retryable');
    expect(classifyWorkoutMutationError({ code: '08006', message: 'connection failure' })).toBe('retryable');
    expect(classifyWorkoutMutationError({ status: 503, message: 'gateway unavailable' })).toBe('retryable');
    expect(classifyWorkoutMutationError({ code: '22023', message: 'Weight is out of range' })).toBe('terminal');
    expect(classifyWorkoutMutationError({ code: '42501', message: 'Authentication required' })).toBe('terminal');
  });
});
