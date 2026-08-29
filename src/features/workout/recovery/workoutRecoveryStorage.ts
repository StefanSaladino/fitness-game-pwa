import { createWorkoutIndexedDbStorage, WORKOUT_PERSISTENCE_EPOCH, type AsyncKeyValueStorage } from '../storage/workoutIndexedDb';
import type { ActiveWorkoutRecoverySnapshot } from './workoutRecoveryModel';
import { parseWorkoutRecoverySnapshot } from './workoutRecoveryModel';

const RECOVERY_KEY_PREFIX = `active-workout:v${WORKOUT_PERSISTENCE_EPOCH}:`;
const LEGACY_RECOVERY_KEY_PREFIX = `fitness-game:active-workout:v${WORKOUT_PERSISTENCE_EPOCH}:`;
const STALE_LEGACY_RECOVERY_KEY_PREFIXES = ['fitness-game:active-workout:v1:'] as const;

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

function retireStaleLegacyRecovery(legacyStorage: KeyValueStorage | null, userId: string): void {
  if (!legacyStorage) return;
  for (const prefix of STALE_LEGACY_RECOVERY_KEY_PREFIXES) {
    try { legacyStorage.removeItem(`${prefix}${userId}`); } catch { /* best effort */ }
  }
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
      retireStaleLegacyRecovery(legacyStorage, userId);
      if (storage) {
        try {
          const raw = await storage.getItem(keyForUser(userId));
          if (raw) {
            const parsed = parseSnapshot(raw, userId);
            if (!parsed) await storage.removeItem(keyForUser(userId));
            return parsed;
          }
        } catch {
          // Fall through to the current-epoch browser fallback when IndexedDB is unavailable.
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
          // Keep the valid current-epoch fallback until IndexedDB accepts the migration.
        }
      }
      return parsed;
    },

    async save(snapshot) {
      retireStaleLegacyRecovery(legacyStorage, snapshot.userId);
      const serialized = JSON.stringify(snapshot);
      if (storage) {
        try {
          await storage.setItem(keyForUser(snapshot.userId), serialized);
          try { legacyStorage?.removeItem(legacyKeyForUser(snapshot.userId)); } catch { /* best effort */ }
          return;
        } catch {
          // Fall back to current-epoch browser storage only when IndexedDB cannot accept the write.
        }
      }
      try { legacyStorage?.setItem(legacyKeyForUser(snapshot.userId), serialized); } catch { /* best effort */ }
    },

    async clear(userId) {
      retireStaleLegacyRecovery(legacyStorage, userId);
      if (storage) {
        try { await storage.removeItem(keyForUser(userId)); } catch { /* best effort */ }
      }
      try { legacyStorage?.removeItem(legacyKeyForUser(userId)); } catch { /* best effort */ }
    },
  };
}
