# Phase 6.4A — Local active-workout recovery

## Primary boundary

Preserve the user's already-started lift on the device when the browser refreshes, the PWA restarts, or ordinary connectivity disappears.

This slice is intentionally local-read/recovery infrastructure only. It does not implement offline server mutations.

## Separation of concerns

- `recovery/workoutRecoveryModel.ts` owns the versioned local snapshot contract and pure map/parse functions. It has no React, Supabase, or browser-storage dependency.
- `recovery/workoutRecoveryStorage.ts` owns local key/value persistence and treats localStorage as best-effort recovery storage.
- `hooks/useWorkoutRecovery.ts` owns browser connectivity state and recovery orchestration.
- `WorkoutController.tsx` decides whether remote or recovered data is authoritative for presentation and triggers one read-only reconciliation pass after reconnect.
- presentation components receive recovery state/drafts through props. They do not read/write localStorage or Supabase directly.

## Snapshot contents

The v1 snapshot stores:

- active session timing identity needed to keep the visible timer/session alive;
- ordered canonical workout exercises;
- persisted independent workout-set rows;
- kg/lb display preference for the current lift;
- unsaved per-set entry drafts (`setType`, weight input, reps input, bodyweight mode).

The snapshot contract is deliberately separate from Supabase row DTOs. Remote rows are still mapped through the existing feature services before the recovery layer sees them.

## Recovery behavior

1. The recovery hook reads the current user's snapshot synchronously on mount.
2. If a snapshot exists, the workout screen can render it on the first client render while authoritative reads begin.
3. Successful remote session/exercise/set reads replace the presentation fallback and refresh the local snapshot.
4. If the server reports no active workout, the stale local snapshot is removed.
5. If remote reads fail, the local workout remains visible instead of falling back to an empty/error-only screen.
6. When the browser fires `online`, the controller performs one read-only retry for the session, exercises, sets, and picker catalogue.

## Offline editing boundary

Phase 6.4A keeps existing set-entry text drafts editable locally. It intentionally gates server-only actions while the workout is offline/local-only/recovering:

- add/remove/reorder exercise;
- add/copy/delete/complete set;
- pause/resume/finish/cancel workout.

Weight/reps/type/bodyweight-mode draft changes are stored locally and survive refresh. They are **not** automatically written to PostgreSQL while offline in this slice.

Phase 6.4B owns queued/idempotent mutation replay.

## Safety rules

- recovery storage is namespaced per authenticated profile;
- snapshot version and user ID must match before hydration;
- malformed/corrupt snapshots are deleted instead of throwing into the workout UI;
- localStorage quota/private-mode failures never block the normal Supabase path;
- completed/cancelled remote state wins over a stale local active snapshot;
- no scoring event is created or reconciled from local recovery data.

## Tests

Coverage includes:

- pure snapshot ordering/mapping/parsing;
- corrupt/cross-user snapshot rejection;
- storage save/load/clear behavior;
- online/offline/reconnect hook state;
- recovery of unsaved set drafts and display units;
- offline set-draft editing without a server write;
- active-workout presentation with server actions gated while offline;
- controller-level refresh/offline recovery from local session + exercise + set data.

## Non-goals

- no general mutation queue;
- no idempotency keys for offline writes;
- no merge/conflict engine;
- no destructive-edit reconciliation;
- no IndexedDB migration yet;
- no database migration;
- no lifting-v1 scoring changes.
