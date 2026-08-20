# Phase 6.4B — Idempotent Workout Mutation Queue

## Objective

Make active-workout capture safe to retry when a request is interrupted, the browser temporarily loses connectivity, or the app restarts before it knows whether the server committed a change.

This phase does **not** attempt full conflict resolution. It establishes the ordered, durable, idempotent write path that Phase 6.4C can build on.

## Database boundary

Migration `20260820000100_idempotent_workout_mutations.sql` adds `workout_mutation_receipts` and the authenticated RPC `apply_lifting_workout_mutation`.

Every queued mutation contains a UUID idempotency key. The server stores one receipt per `(user_id, idempotency_key)` together with:

- workout ID;
- mutation kind;
- exact JSON payload;
- authoritative result payload;
- created/completed timestamps.

A repeated request with the same key and identical request returns the stored result without running the underlying mutation again. Reusing a key with a different workout, kind, or payload is rejected.

The mutation and receipt are committed in the same PostgreSQL transaction. A validation/authorization error rolls the receipt back as well, so a failed mutation cannot be mistaken for a successful replay later.

## Queue contract

The client queue is versioned and stored per user in local storage.

Queued mutation kinds in this slice:

- add exercise;
- remove exercise;
- move exercise;
- add set;
- copy set;
- save set;
- remove set.

Each item stores:

- idempotency key;
- user/workout identity;
- mutation kind and payload;
- creation time;
- attempt count;
- last attempt time/error;
- pending or failed state.

The queue is persisted **before** the network request is attempted.

## Replay rules

- replay is strictly FIFO;
- a later mutation never overtakes an earlier pending mutation;
- successful items are removed only after the idempotent RPC returns;
- transport/server-availability failures remain pending and may retry;
- validation/authorization failures are terminal and stop ordered replay;
- reconnect triggers replay automatically;
- a successful replay increments a controller revision so exercises/sets are re-read from the authoritative server copy.

Retryable examples include fetch/network failures, connection-class PostgreSQL errors, 408/425/429 responses, serialization/deadlock errors, and 5xx responses.

Validation and authorization failures are not blindly retried.

## Offline UI boundary

Phase 6.4A already allows existing set drafts to remain editable while offline. In 6.4B those valid existing-set edits are now sent through the durable mutation queue rather than being purely local drafts.

Structural and lifecycle actions remain gated while the app is using an offline/local-only recovery copy. This is intentional: optimistic local add/remove/reorder and finish/cancel conflict rules belong to Phase 6.4C.

If an online structural mutation suffers an ambiguous transport failure, however, its pre-written queue item remains available for safe replay instead of issuing a fresh unkeyed mutation.

## Non-goals

- no scoring reconciliation;
- no lifting-v1 XP changes;
- no optimistic local exercise/set creation;
- no destructive offline edit conflict policy;
- no stale-write merge engine;
- no finish/cancel offline replay;
- no automatic discard of terminal queued mutations.

## Validation

Client coverage includes:

- queue model/parser;
- retryable vs terminal classification;
- per-user queue storage;
- exact RPC payload/idempotency key forwarding;
- ordered replay;
- retryable failure retention;
- terminal failure blocking;
- offline enqueue and reconnect replay;
- controller recovery integration.

Database coverage is in `supabase/tests/019_idempotent_workout_mutations.test.sql` and proves duplicate replay cannot duplicate exercises, added sets, or copied sets, and that repeated saves/removes are exactly-once effects.

## Exit condition

Replaying the same queued mutation more than once cannot duplicate persisted workout data.

Phase 6.4C is next and owns conflict/destructive-edit safety.
