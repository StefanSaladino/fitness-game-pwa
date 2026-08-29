export const WORKOUT_PERSISTENCE_EPOCH = 2;
export const WORKOUT_DB_NAME = `fitness-game-workout-v${WORKOUT_PERSISTENCE_EPOCH}`;
const WORKOUT_DB_VERSION = 1;
const WORKOUT_STORE_NAME = 'durable-state';

export interface AsyncKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

interface IndexedDbFactoryLike {
  open(name: string, version?: number): IDBOpenDBRequest;
}

function browserIndexedDb(): IndexedDbFactoryLike | null {
  if (typeof indexedDB === 'undefined') return null;
  return indexedDB;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}

export function createWorkoutIndexedDbStorage(factory: IndexedDbFactoryLike | null = browserIndexedDb()): AsyncKeyValueStorage | null {
  if (!factory) return null;

  let databasePromise: Promise<IDBDatabase> | null = null;
  const database = () => {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(WORKOUT_DB_NAME, WORKOUT_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(WORKOUT_STORE_NAME)) db.createObjectStore(WORKOUT_STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Unable to open workout IndexedDB.'));
      request.onblocked = () => reject(new Error('Workout IndexedDB upgrade is blocked by another app tab.'));
    });
    return databasePromise;
  };

  return {
    async getItem(key) {
      const db = await database();
      const transaction = db.transaction(WORKOUT_STORE_NAME, 'readonly');
      const done = transactionDone(transaction);
      const request = transaction.objectStore(WORKOUT_STORE_NAME).get(key) as IDBRequest<string | undefined>;
      const value = await requestResult(request);
      await done;
      return typeof value === 'string' ? value : null;
    },

    async setItem(key, value) {
      const db = await database();
      const transaction = db.transaction(WORKOUT_STORE_NAME, 'readwrite');
      const done = transactionDone(transaction);
      transaction.objectStore(WORKOUT_STORE_NAME).put(value, key);
      await done;
    },

    async removeItem(key) {
      const db = await database();
      const transaction = db.transaction(WORKOUT_STORE_NAME, 'readwrite');
      const done = transactionDone(transaction);
      transaction.objectStore(WORKOUT_STORE_NAME).delete(key);
      await done;
    },
  };
}

export function createMemoryAsyncStorage(): AsyncKeyValueStorage {
  const values = new Map<string, string>();
  return {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
}
