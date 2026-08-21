import { createWorkoutIndexedDbStorage, type AsyncKeyValueStorage } from '../storage/workoutIndexedDb';
import type { ActiveWorkoutRecoverySnapshot } from './workoutRecoveryModel';
import { parseWorkoutRecoverySnapshot } from './workoutRecoveryModel';

const RECOVERY_KEY_PREFIX = 'active-workout:v1:';
const LEGACY_RECOVERY_KEY_PREFIX = 'fitness-game:active-workout:v1:';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface WorkoutRecoveryStorage {
  load(userId: string): Promise<ActiveWorkoutRecoverySnapshot | null>;
  save(snapshot: ActiveWorkoutRecoverySnapshot): Promise<void>;
  clear(userId: string): Promise<void>;
}

function keyForUser(userId: string): string {
  return `${RECOVERY_KEY_PREFIX}${userId}`;
}

function legacyKeyForUser(userId: string): string {
  return `${LEGACY_RECOVERY_KEY_PREFIX}${userId}`;
}

function browserLegacyStorage(): KeyValueStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseSnapshot(raw: string | null, userId: string): ActiveWorkoutRecoverySnapshot | null {
  if (!raw) return null;
  try {
    return parseWorkoutRecoverySnapshot(JSON.parse(raw) as unknown, userId);
  } catch {
    return null;
  }
}

export function createWorkoutRecoveryStorage(
  storage: AsyncKeyValueStorage | null = createWorkoutIndexedDbStorage(),
  legacyStorage: KeyValueStorage | null = browserLegacyStorage(),
): WorkoutRecoveryStorage {
  return {
    async load(userId) {
      if (storage) {
        try {
          const raw = await storage.getItem(keyForUser(userId));
          if (raw) {
            const parsed = parseSnapshot(raw, userId);
            if (!parsed) await storage.removeItem(keyForUser(userId));
            return parsed;
          }
        } catch {
          // Fall through to the legacy migration source when IndexedDB is unavailable.
        }
      }

      if (!legacyStorage) return null;
      const legacyKey = legacyKeyForUser(userId);
      let parsed: ActiveWorkoutRecoverySnapshot | null = null;
      try {
        const raw = legacyStorage.getItem(legacyKey);
        if (!raw) return null;
        parsed = parseSnapshot(raw, userId);
        if (!parsed) {
          legacyStorage.removeItem(legacyKey);
          return null;
        }
      } catch {
        try { legacyStorage.removeItem(legacyKey); } catch { /* best effort */ }
        return null;
      }

      if (storage && parsed) {
        try {
          await storage.setItem(keyForUser(userId), JSON.stringify(parsed));
          legacyStorage.removeItem(legacyKey);
        } catch {
          // Keep the valid legacy copy until IndexedDB accepts the migration.
        }
      }
      return parsed;
    },

    async save(snapshot) {
      const serialized = JSON.stringify(snapshot);
      if (storage) {
        try {
          await storage.setItem(keyForUser(snapshot.userId), serialized);
          try { legacyStorage?.removeItem(legacyKeyForUser(snapshot.userId)); } catch { /* best effort */ }
          return;
        } catch {
          // Fall back to legacy browser storage only when IndexedDB cannot accept the write.
        }
      }
      try { legacyStorage?.setItem(legacyKeyForUser(snapshot.userId), serialized); } catch { /* best effort */ }
    },

    async clear(userId) {
      if (storage) {
        try { await storage.removeItem(keyForUser(userId)); } catch { /* best effort */ }
      }
      try { legacyStorage?.removeItem(legacyKeyForUser(userId)); } catch { /* best effort */ }
    },
  };
}
