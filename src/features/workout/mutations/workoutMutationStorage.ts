import type { KeyValueStorage } from '../recovery/workoutRecoveryStorage';
import { parseWorkoutMutationQueue, type WorkoutMutationQueueItem } from './workoutMutationModel';

const MUTATION_QUEUE_KEY_PREFIX = 'fitness-game:workout-mutations:v1:';

export interface WorkoutMutationStorage {
  load(userId: string): WorkoutMutationQueueItem[];
  save(userId: string, items: readonly WorkoutMutationQueueItem[]): void;
  clear(userId: string): void;
}

function keyForUser(userId: string): string {
  return `${MUTATION_QUEUE_KEY_PREFIX}${userId}`;
}

function browserStorage(): KeyValueStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createWorkoutMutationStorage(storage: KeyValueStorage | null = browserStorage()): WorkoutMutationStorage {
  return {
    load(userId) {
      if (!storage) return [];
      try {
        const raw = storage.getItem(keyForUser(userId));
        if (!raw) return [];
        const parsed = parseWorkoutMutationQueue(JSON.parse(raw) as unknown, userId);
        if (!parsed) {
          storage.removeItem(keyForUser(userId));
          return [];
        }
        return parsed;
      } catch {
        try { storage.removeItem(keyForUser(userId)); } catch { /* local queue failures must not break capture */ }
        return [];
      }
    },

    save(userId, items) {
      if (!storage) return;
      try {
        if (items.length === 0) storage.removeItem(keyForUser(userId));
        else storage.setItem(keyForUser(userId), JSON.stringify(items));
      } catch {
        // Storage failures are surfaced indirectly by the authoritative request path; never crash the workout UI.
      }
    },

    clear(userId) {
      if (!storage) return;
      try { storage.removeItem(keyForUser(userId)); } catch { /* best effort */ }
    },
  };
}
