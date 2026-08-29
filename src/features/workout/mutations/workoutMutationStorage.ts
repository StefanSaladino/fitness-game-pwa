import type { KeyValueStorage } from '../recovery/workoutRecoveryStorage';
import { createWorkoutIndexedDbStorage, WORKOUT_PERSISTENCE_EPOCH, type AsyncKeyValueStorage } from '../storage/workoutIndexedDb';
import { parseWorkoutMutationQueue, type WorkoutMutationQueueItem } from './workoutMutationModel';

const MUTATION_QUEUE_KEY_PREFIX = `workout-mutations:v${WORKOUT_PERSISTENCE_EPOCH}:`;
const LEGACY_MUTATION_QUEUE_KEY_PREFIX = `fitness-game:workout-mutations:v${WORKOUT_PERSISTENCE_EPOCH}:`;
const STALE_LEGACY_MUTATION_QUEUE_KEY_PREFIXES = ['fitness-game:workout-mutations:v1:'] as const;

export interface WorkoutMutationStorage {
  load(userId: string): Promise<WorkoutMutationQueueItem[]>;
  save(userId: string, items: readonly WorkoutMutationQueueItem[]): Promise<boolean>;
  clear(userId: string): Promise<void>;
}

function keyForUser(userId: string): string {
  return `${MUTATION_QUEUE_KEY_PREFIX}${userId}`;
}

function legacyKeyForUser(userId: string): string {
  return `${LEGACY_MUTATION_QUEUE_KEY_PREFIX}${userId}`;
}

function retireStaleLegacyQueue(legacyStorage: KeyValueStorage | null, userId: string): void {
  if (!legacyStorage) return;
  for (const prefix of STALE_LEGACY_MUTATION_QUEUE_KEY_PREFIXES) {
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

function parseQueue(raw: string | null, userId: string): WorkoutMutationQueueItem[] | null {
  if (!raw) return [];
  try {
    return parseWorkoutMutationQueue(JSON.parse(raw) as unknown, userId);
  } catch {
    return null;
  }
}

export function createWorkoutMutationStorage(
  storage: AsyncKeyValueStorage | null = createWorkoutIndexedDbStorage(),
  legacyStorage: KeyValueStorage | null = browserLegacyStorage(),
): WorkoutMutationStorage {
  return {
    async load(userId) {
      retireStaleLegacyQueue(legacyStorage, userId);
      if (storage) {
        try {
          const raw = await storage.getItem(keyForUser(userId));
          if (raw) {
            const parsed = parseQueue(raw, userId);
            if (!parsed) {
              await storage.removeItem(keyForUser(userId));
              return [];
            }
            return parsed;
          }
        } catch {
          // Fall through to the current-epoch browser fallback when IndexedDB is unavailable.
        }
      }

      if (!legacyStorage) return [];
      const legacyKey = legacyKeyForUser(userId);
      let parsed: WorkoutMutationQueueItem[] | null = null;
      try {
        const raw = legacyStorage.getItem(legacyKey);
        if (!raw) return [];
        parsed = parseQueue(raw, userId);
        if (!parsed) {
          legacyStorage.removeItem(legacyKey);
          return [];
        }
      } catch {
        try { legacyStorage.removeItem(legacyKey); } catch { /* best effort */ }
        return [];
      }

      if (storage && parsed) {
        try {
          if (parsed.length > 0) await storage.setItem(keyForUser(userId), JSON.stringify(parsed));
          legacyStorage.removeItem(legacyKey);
        } catch {
          // Keep the valid current-epoch fallback until IndexedDB accepts the migration.
        }
      }
      return parsed;
    },

    async save(userId, items) {
      retireStaleLegacyQueue(legacyStorage, userId);
      const serialized = JSON.stringify(items);
      if (storage) {
        try {
          if (items.length === 0) await storage.removeItem(keyForUser(userId));
          else await storage.setItem(keyForUser(userId), serialized);
          try { legacyStorage?.removeItem(legacyKeyForUser(userId)); } catch { /* best effort */ }
          return true;
        } catch {
          // Fall back to current-epoch browser storage only when IndexedDB cannot accept the write.
        }
      }
      if (!legacyStorage) return items.length === 0;
      try {
        if (items.length === 0) legacyStorage.removeItem(legacyKeyForUser(userId));
        else legacyStorage.setItem(legacyKeyForUser(userId), serialized);
        return true;
      } catch {
        return items.length === 0;
      }
    },

    async clear(userId) {
      retireStaleLegacyQueue(legacyStorage, userId);
      if (storage) {
        try { await storage.removeItem(keyForUser(userId)); } catch { /* best effort */ }
      }
      try { legacyStorage?.removeItem(legacyKeyForUser(userId)); } catch { /* best effort */ }
    },
  };
}
