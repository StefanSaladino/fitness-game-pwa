# Phase 12A — IndexedDB workout durability

## Primary boundary

Move the already-proven Phase 6.4 recovery snapshot and idempotent mutation queue from synchronous localStorage persistence to IndexedDB without changing workout/scoring semantics.

This is a storage-hardening slice. It does not add new offline mutation types, service-worker caching, background synchronization, scoring rules, or database schema.

## Durable storage architecture

`src/features/workout/storage/workoutIndexedDb.ts` owns the browser IndexedDB boundary. It opens one versioned database (`fitness-game-workout`) with one key/value object store (`durable-state`). Recovery and mutation services own their own namespaced records inside that store.

The pure v1 contracts remain unchanged:

- `ActiveWorkoutRecoverySnapshot` is still version 1;
- `WorkoutMutationQueueItem` is still version 1;
- queued idempotency keys are not regenerated during migration or hydration;
- FIFO ordering still comes from the existing queue parser/replay model.

IndexedDB stores serialized, validated application contracts rather than raw Supabase rows.

## Hydration boundary

IndexedDB is asynchronous. `useWorkoutRecovery` and `useWorkoutMutationQueue` therefore expose an explicit `hydrated` flag.

The workout controller does not decide that a saved workout/queue is absent until both durable stores have completed hydration. This prevents the following race:

1. app starts while offline;
2. remote active-workout request fails quickly;
3. IndexedDB recovery is still loading;
4. UI incorrectly renders an empty/error state before local recovery arrives.

While hydration is incomplete, the Workouts route displays `Recovering saved workout…`.

Canonical recovery refresh/cleanup also waits for hydration, so a fast remote response cannot clear or overwrite unknown local state before it has been read.

## Persist-before-replay guarantee

The mutation queue keeps the Phase 6.4B ordering rule:

1. create a UUID idempotency key;
2. append the queue item;
3. await durable storage;
4. only then attempt network replay or report the write as queued.

Successful/failed/conflicted queue replacements are also written to durable storage before the operation completes.

No IndexedDB code can create scoring events or call Supabase directly.

## One-time localStorage migration

The historical keys remain recognized only as migration/fallback inputs:

- `fitness-game:active-workout:v1:<userId>`
- `fitness-game:workout-mutations:v1:<userId>`

Load behavior:

1. try IndexedDB first;
2. if no durable record exists, parse the legacy localStorage value;
3. write the validated value to IndexedDB;
4. remove the legacy key only after that durable write succeeds.

If IndexedDB is unavailable or a write fails (for example restrictive/private browser storage), localStorage remains a best-effort fallback. Normal browsers do not dual-write after migration.

Corrupt/cross-user legacy state is discarded rather than migrated.

## Validation

Coverage includes:

- async recovery save/load/clear;
- async mutation queue save/load/drain;
- legacy recovery migration;
- legacy mutation migration without changing idempotency keys;
- corrupt legacy state rejection;
- React hook hydration before recovery/write behavior;
- controller offline recovery after async durable-state hydration;
- native browser IndexedDB migration and page-reload persistence through Playwright.

The E2E fixture imports the production storage adapters. It does not duplicate IndexedDB logic inside the test.

## Non-goals

- no Supabase migration;
- no scoring/XP changes;
- no new offline mutation kinds;
- no Background Sync API;
- no service-worker/offline-shell changes yet;
- no install prompt UX yet;
- no claim that browser storage can never be evicted by the OS/browser;
- no full iOS/Android lifecycle certification until Phase 12D.

Phase 12B is next and owns the offline shell plus install/update UX.
