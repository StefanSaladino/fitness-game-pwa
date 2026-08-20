# Phase 6.4C — Conflict and Destructive-Edit Safety

## Objective

Prevent queued or recovered workout changes from silently overwriting newer server data or reviving data that another device intentionally removed.

## Conflict contract

`workout_exercises` and `workout_sets` now expose a non-negative `revision` counter. PostgreSQL increments the counter on every row update. Destructive or overwrite mutations carry the revision that the client observed:

- remove/move exercise;
- copy/save/remove set.

The idempotent mutation gateway locks the owned workout and target row before comparing revisions. An exact duplicate idempotency key still returns its original receipt first, so ambiguous retries remain exactly-once. A new request with a stale or missing revision is rejected as `WORKOUT_CONFLICT` instead of being applied.

Additive operations (`ADD_EXERCISE`, `ADD_SET`) keep their 6.4B idempotency behavior and do not require a row revision.

## Reconciliation policy

There is intentionally no automatic merge engine. A conflict:

1. stops FIFO replay before later queued writes can overtake it;
2. leaves the conflicting queue item persisted;
3. disables further workout mutations;
4. surfaces **Workout changed elsewhere**;
5. requires the user to choose **Use server version**;
6. discards queued local changes for that workout, clears stale set drafts, and reloads authoritative server state.

Legacy v0.5.2 queued destructive writes are preserved on upgrade. Because they have no revision token, they are treated as conflicts rather than replayed unsafely. Offline set saves persist their optimistic revision into the recovery snapshot, so the revision chain survives refresh/app restart; a synchronous in-hook cursor also prevents rapid batched saves from reusing the same expected revision.

## Lifecycle races

Finish/cancel remain online-only. If another device already completed or cancelled the workout, capture mutations return a conflict and the lifecycle hook re-checks active-workout state after a failed finish/cancel request. Completed/cancelled workouts are never reopened by recovery replay.

## Non-goals

- no field-level merge UI;
- no offline optimistic exercise add/remove/reorder;
- no offline finish/cancel queue;
- no XP/scoring changes.

## Exit condition

Reconnect/retry cannot silently overwrite newer workout data, erase a newer set edit, revive a deleted set/exercise, or mutate a completed/cancelled workout.
