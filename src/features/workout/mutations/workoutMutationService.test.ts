import { describe, expect, it, vi } from 'vitest';
import { createWorkoutMutationQueueItem } from './workoutMutationModel';
import { createWorkoutMutationService } from './workoutMutationService';

describe('workout mutation service', () => {
  it('sends the durable idempotency key and exact payload through the single mutation RPC', async () => {
    const rpc = vi.fn(async () => ({ data: { resultId: 'set-1' }, error: null }));
    const service = createWorkoutMutationService({ rpc } as never);
    const item = createWorkoutMutationQueueItem(
      'user-1',
      'workout-1',
      { kind: 'SAVE_SET', payload: { workoutSetId: 'set-1', setType: 'WORKING', weightKg: 100, reps: 5, bodyweightMode: null, completed: true } },
      '11111111-1111-4111-8111-111111111111',
      100,
    );

    await service.apply(item);

    expect(rpc).toHaveBeenCalledWith('apply_lifting_workout_mutation', {
      p_idempotency_key: '11111111-1111-4111-8111-111111111111',
      p_workout_id: 'workout-1',
      p_mutation_kind: 'SAVE_SET',
      p_payload: item.payload,
    });
  });
});
