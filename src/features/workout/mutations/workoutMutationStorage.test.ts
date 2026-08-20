import { describe, expect, it } from 'vitest';
import type { KeyValueStorage } from '../recovery/workoutRecoveryStorage';
import { createWorkoutMutationQueueItem } from './workoutMutationModel';
import { createWorkoutMutationStorage } from './workoutMutationStorage';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('workout mutation storage', () => {
  it('persists an ordered queue per user and removes the key when drained', () => {
    const memory = new MemoryStorage();
    const storage = createWorkoutMutationStorage(memory);
    const later = createWorkoutMutationQueueItem('user-1', 'workout-1', { kind: 'COPY_SET', payload: { workoutSetId: 'set-1' } }, '22222222-2222-4222-8222-222222222222', 200);
    const earlier = createWorkoutMutationQueueItem('user-1', 'workout-1', { kind: 'ADD_SET', payload: { workoutExerciseId: 'we-1', setType: 'WORKING' } }, '11111111-1111-4111-8111-111111111111', 100);

    storage.save('user-1', [later, earlier]);
    expect(storage.load('user-1').map((item) => item.kind)).toEqual(['ADD_SET', 'COPY_SET']);
    expect(storage.load('other-user')).toEqual([]);

    storage.save('user-1', []);
    expect(storage.load('user-1')).toEqual([]);
    expect(memory.values.size).toBe(0);
  });

  it('discards corrupt queue data instead of replaying it', () => {
    const memory = new MemoryStorage();
    memory.values.set('fitness-game:workout-mutations:v1:user-1', '[{"version":1,"userId":"user-2"}]');
    const storage = createWorkoutMutationStorage(memory);

    expect(storage.load('user-1')).toEqual([]);
    expect(memory.values.size).toBe(0);
  });
});
