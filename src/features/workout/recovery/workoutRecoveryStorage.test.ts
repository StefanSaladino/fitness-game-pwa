import { describe, expect, it } from 'vitest';
import { createMemoryAsyncStorage } from '../storage/workoutIndexedDb';
import type { ActiveWorkoutRecoverySnapshot } from './workoutRecoveryModel';
import { createWorkoutRecoveryStorage, type KeyValueStorage } from './workoutRecoveryStorage';

class MemoryLegacyStorage implements KeyValueStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const snapshot: ActiveWorkoutRecoverySnapshot = {
  version: 1,
  userId: 'user-1',
  savedAtMs: 100,
  session: {
    id: 'workout-1', userId: 'user-1', startedAt: '2026-08-20T01:00:00.000Z', activeDurationSeconds: 0,
    timezoneAtStart: 'America/Toronto', scoringDate: '2026-08-19', pausedAt: null, lastResumedAt: '2026-08-20T01:00:00.000Z',
  },
  exercises: [],
  sets: [],
  ui: { weightUnit: 'KG', setDrafts: {} },
};

describe('workout recovery storage', () => {
  it('stores recovery per user in async durable storage and clears it explicitly', async () => {
    const durable = createMemoryAsyncStorage();
    const storage = createWorkoutRecoveryStorage(durable, null);

    await storage.save(snapshot);
    expect(await storage.load('user-1')).toEqual(snapshot);
    expect(await storage.load('other-user')).toBeNull();

    await storage.clear('user-1');
    expect(await storage.load('user-1')).toBeNull();
  });

  it('migrates a valid current-epoch localStorage recovery snapshot into durable storage once', async () => {
    const durable = createMemoryAsyncStorage();
    const legacy = new MemoryLegacyStorage();
    legacy.setItem('fitness-game:active-workout:v2:user-1', JSON.stringify(snapshot));
    const storage = createWorkoutRecoveryStorage(durable, legacy);

    expect(await storage.load('user-1')).toEqual(snapshot);
    expect(legacy.values.size).toBe(0);
    expect(await storage.load('user-1')).toEqual(snapshot);
  });

  it('retires pre-release v1 localStorage recovery instead of restoring it', async () => {
    const durable = createMemoryAsyncStorage();
    const legacy = new MemoryLegacyStorage();
    legacy.setItem('fitness-game:active-workout:v1:user-1', JSON.stringify(snapshot));
    const storage = createWorkoutRecoveryStorage(durable, legacy);

    expect(await storage.load('user-1')).toBeNull();
    expect(legacy.values.has('fitness-game:active-workout:v1:user-1')).toBe(false);
  });

  it('discards corrupt current-epoch fallback data instead of breaking workout startup', async () => {
    const durable = createMemoryAsyncStorage();
    const legacy = new MemoryLegacyStorage();
    legacy.setItem('fitness-game:active-workout:v2:user-1', '{broken');
    const storage = createWorkoutRecoveryStorage(durable, legacy);

    expect(await storage.load('user-1')).toBeNull();
    expect(legacy.values.size).toBe(0);
  });
});
