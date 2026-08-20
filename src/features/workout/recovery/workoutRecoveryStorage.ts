import type { ActiveWorkoutRecoverySnapshot } from './workoutRecoveryModel';
import { parseWorkoutRecoverySnapshot } from './workoutRecoveryModel';

const RECOVERY_KEY_PREFIX = 'fitness-game:active-workout:v1:';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface WorkoutRecoveryStorage {
  load(userId: string): ActiveWorkoutRecoverySnapshot | null;
  save(snapshot: ActiveWorkoutRecoverySnapshot): void;
  clear(userId: string): void;
}

function keyForUser(userId: string): string {
  return `${RECOVERY_KEY_PREFIX}${userId}`;
}

function browserStorage(): KeyValueStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createWorkoutRecoveryStorage(storage: KeyValueStorage | null = browserStorage()): WorkoutRecoveryStorage {
  return {
    load(userId) {
      if (!storage) return null;
      try {
        const raw = storage.getItem(keyForUser(userId));
        if (!raw) return null;
        const parsed = parseWorkoutRecoverySnapshot(JSON.parse(raw) as unknown, userId);
        if (!parsed) storage.removeItem(keyForUser(userId));
        return parsed;
      } catch {
        try { storage.removeItem(keyForUser(userId)); } catch { /* local recovery must never break the workout UI */ }
        return null;
      }
    },

    save(snapshot) {
      if (!storage) return;
      try {
        storage.setItem(keyForUser(snapshot.userId), JSON.stringify(snapshot));
      } catch {
        // Quota/private-mode failures must not block the authoritative workout flow.
      }
    },

    clear(userId) {
      if (!storage) return;
      try { storage.removeItem(keyForUser(userId)); } catch { /* best-effort local cleanup */ }
    },
  };
}
