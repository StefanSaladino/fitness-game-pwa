import { describe, expect, it } from 'vitest';
import type { KeyValueStorage } from '../recovery/workoutRecoveryStorage';
import { createMemoryAsyncStorage, type AsyncKeyValueStorage } from '../storage/workoutIndexedDb';
import { createWorkoutMutationQueueItem } from './workoutMutationModel';
import { createWorkoutMutationStorage } from './workoutMutationStorage';

class MemoryLegacyStorage implements KeyValueStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const later = createWorkoutMutationQueueItem('user-1', 'workout-1', { kind: 'COPY_SET', payload: { workoutSetId: 'set-1', expectedRevision: 0 } }, '22222222-2222-4222-8222-222222222222', 200);
const earlier = createWorkoutMutationQueueItem('user-1', 'workout-1', { kind: 'ADD_SET', payload: { workoutExerciseId: 'we-1', setType: 'WORKING' } }, '11111111-1111-4111-8111-111111111111', 100);

describe('workout mutation storage', () => {
  it('persists an ordered queue per user and removes it when drained', async () => {
    const durable = createMemoryAsyncStorage();
    const storage = createWorkoutMutationStorage(durable, null);

    await storage.save('user-1', [later, earlier]);
    expect((await storage.load('user-1')).map((item) => item.kind)).toEqual(['ADD_SET', 'COPY_SET']);
    expect(await storage.load('other-user')).toEqual([]);

    await storage.save('user-1', []);
    expect(await storage.load('user-1')).toEqual([]);
  });

  it('migrates the current-epoch localStorage queue without changing idempotency keys', async () => {
    const durable = createMemoryAsyncStorage();
    const legacy = new MemoryLegacyStorage();
    legacy.setItem('fitness-game:workout-mutations:v2:user-1', JSON.stringify([later, earlier]));
    const storage = createWorkoutMutationStorage(durable, legacy);

    const loaded = await storage.load('user-1');
    expect(loaded.map((item) => item.idempotencyKey)).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ]);
    expect(legacy.values.size).toBe(0);
  });

  it('retires pre-release v1 mutation queues instead of replaying them', async () => {
    const durable = createMemoryAsyncStorage();
    const legacy = new MemoryLegacyStorage();
    legacy.setItem('fitness-game:workout-mutations:v1:user-1', JSON.stringify([earlier]));
    const storage = createWorkoutMutationStorage(durable, legacy);

    expect(await storage.load('user-1')).toEqual([]);
    expect(legacy.values.has('fitness-game:workout-mutations:v1:user-1')).toBe(false);
  });

  it('discards corrupt current-epoch queue data instead of replaying it', async () => {
    const durable = createMemoryAsyncStorage();
    const legacy = new MemoryLegacyStorage();
    legacy.setItem('fitness-game:workout-mutations:v2:user-1', '[{"version":1,"userId":"user-2"}]');
    const storage = createWorkoutMutationStorage(durable, legacy);

    expect(await storage.load('user-1')).toEqual([]);
    expect(legacy.values.size).toBe(0);
  });

  it('reports a failed durable write when neither IndexedDB nor fallback storage can persist a queued mutation', async () => {
    const failing: AsyncKeyValueStorage = {
      async getItem() { return null; },
      async setItem() { throw new Error('quota'); },
      async removeItem() { throw new Error('quota'); },
    };
    const storage = createWorkoutMutationStorage(failing, null);

    expect(await storage.save('user-1', [earlier])).toBe(false);
  });
});
