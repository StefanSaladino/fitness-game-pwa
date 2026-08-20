import { describe, expect, it } from 'vitest';
import type { ActiveWorkoutRecoverySnapshot } from './workoutRecoveryModel';
import { createWorkoutRecoveryStorage, type KeyValueStorage } from './workoutRecoveryStorage';

class MemoryStorage implements KeyValueStorage {
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
  it('stores recovery per user and clears it explicitly', () => {
    const memory = new MemoryStorage();
    const storage = createWorkoutRecoveryStorage(memory);

    storage.save(snapshot);
    expect(storage.load('user-1')).toEqual(snapshot);
    expect(storage.load('other-user')).toBeNull();

    storage.clear('user-1');
    expect(storage.load('user-1')).toBeNull();
  });

  it('discards invalid JSON instead of breaking workout startup', () => {
    const memory = new MemoryStorage();
    memory.values.set('fitness-game:active-workout:v1:user-1', '{broken');
    const storage = createWorkoutRecoveryStorage(memory);

    expect(storage.load('user-1')).toBeNull();
    expect(memory.values.size).toBe(0);
  });
});
