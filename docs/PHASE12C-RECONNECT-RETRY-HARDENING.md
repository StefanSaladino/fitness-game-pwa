# Phase 12C — Reconnect + retry hardening

Phase 12C hardens replay of the IndexedDB-backed workout mutation journal after reconnects and application restarts. It does not broaden the mutation model or change scoring.

## Boundary

This slice owns:

- bounded automatic retry for retryable queued workout mutations;
- exponential retry delay that survives application restart through the existing `attemptCount` and `lastAttemptAtMs` journal fields;
- automatic normalization of legacy/high-attempt pending items into an explicit blocked state;
- manual **Retry sync** that preserves the original idempotency key while starting a fresh bounded retry cycle;
- authoritative workout/exercise/set reconciliation after reconnect and after a queued mutation is successfully replayed;
- integration coverage for an ambiguous committed mutation surviving an app restart without duplicate effects.

This slice does **not** add Background Sync, new mutation kinds, merge conflicting writes, database migrations, scoring changes, or mobile-browser lifecycle certification.

## Retry policy

Only queue items in `pending` state are eligible for automatic replay. `failed` and `conflict` items are never touched by the automatic retry timer.

The automatic retry budget is four attempts per cycle. Retryable failures use exponential delays based on the persisted attempt metadata:

- after attempt 1: 1 second;
- after attempt 2: 2 seconds;
- after attempt 3: 4 seconds;
- after attempt 4: automatic replay stops and the item becomes blocked.

The queue remains FIFO. A retryable/blocked/conflicting head item prevents later writes from overtaking it.

The retry policy uses the existing queue-v1 fields, so no queue schema migration is required. If an older saved queue is hydrated with a `pending` item that has already exhausted the new automatic retry budget, hydration converts that item to `failed` and persists the normalized state.

## Idempotency and explicit recovery

Automatic and manual retries keep the original `idempotencyKey`. A retry never creates a replacement queue item.

**Retry sync** resets only the retry-attempt metadata (`attemptCount`, `lastAttemptAtMs`, status, and last error) and durably saves that reset before replaying. If the device cannot persist the reset, no network replay occurs.

Revision-guarded mutations still reach the same authoritative mutation RPC. A `WORKOUT_CONFLICT` response stops replay immediately and remains blocked until the user explicitly chooses **Use server version**. Timers never retry conflict items.

## Reconciliation

Reconnect processing is ordered:

1. offer any currently eligible queued mutation to the replay engine;
2. re-read the active workout from the server;
3. when the workout still exists, re-read authoritative exercises, sets, and picker data;
4. after any later successful automatic replay, `appliedRevision` triggers another authoritative exercise/set read.

This means an app restart can safely replay an ambiguous already-committed mutation using the same receipt key, drain the local journal, and then replace recovered IndexedDB rows with the authoritative server state.

## Tests

Phase 12C adds coverage for:

- bounded exponential retry calculations;
- persisted retry timing across restart;
- automatic retry exhaustion becoming blocked;
- explicit conflicts never entering automatic retry;
- manual retry preserving the idempotency key while resetting the attempt cycle;
- old high-attempt pending items normalizing to blocked at hydration;
- ambiguous committed `ADD_SET` surviving unmount/remount, replaying with the same idempotency key, producing no duplicate set, and reconciling the rendered server state.

No Supabase migration and no scoring/XP changes are introduced in Phase 12C.
