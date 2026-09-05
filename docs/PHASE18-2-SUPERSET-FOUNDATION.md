# Phase 18.2 — Superset Foundation

## Scope

Phase 18.2 adds only the data and recovery foundation required for future Superset UX.

A Superset remains a grouping of ordinary workout exercises. It is **not** a new exercise type and does not alter sets, scoring, XP, progress, PRs, or workout lifecycle behavior.

No Superset builder or active-workout sequencing UI is included in this phase.

## Data model

`public.workout_exercises` gains two nullable columns:

- `superset_group_id uuid null` — opaque group identity within a workout.
- `superset_order integer null` — zero-based member position inside that group.

An ordinary exercise has both values `NULL`.

A Superset member has both values populated.

Database constraints enforce:

1. group id and order are either both null or both present;
2. order cannot be negative;
3. `(workout_id, superset_group_id, superset_order)` is unique for grouped rows.

No separate Superset table is introduced because Phase 18 requires no group-level metadata yet. This keeps the model additive and leaves all existing workout rows valid after migration.

## Existing workout behavior

Existing rows automatically remain non-Superset rows because both added columns default to `NULL`.

The current add/move/remove/preset RPCs remain unchanged in Phase 18.2. They continue to manage overall `order_index`; future Phase 18.3 mutation work will own link/unlink/reorder behavior for Supersets.
The production table currently exposes only `SELECT` to the `authenticated` role, so these new columns do not create a direct browser-write path. Phase 18.3 must continue the existing guarded-RPC pattern for Superset mutations.

The existing `workout_exercises` update trigger will continue to advance `revision` when Superset membership changes later. The current scoring and weekly-consistency reconciliation triggers only reconcile completed workouts, so adding nullable metadata to in-progress exercises does not change scoring semantics.

## Client domain and recovery

`WorkoutExercise` now exposes:

```ts
supersetGroupId: string | null;
supersetOrder: number | null;
```

`workoutExerciseService` reads and maps the new database columns. Because this phase is delivered as a local overlay before the production migration is applied, the read path includes a narrow compatibility fallback: only a PostgREST/Postgres missing-column error for `superset_group_id` or `superset_order` retries the legacy projection and normalizes both values to `null`. Unrelated query failures still surface normally. This keeps the local app usable against the pre-18.2 production schema without weakening error handling.

Active-workout recovery snapshots preserve both fields so an interrupted Superset can eventually be restored with its grouping and order intact.

Recovery parsing remains backward compatible with older saved snapshots that do not contain the new fields; missing values normalize to `null`. Corrupt half-defined memberships and duplicate group positions are rejected.

## Presets and history

Preset definitions are intentionally unchanged in this phase. Existing presets start with ungrouped exercises.

History/progress/scoring remain exercise-based and unchanged. Preserving/displaying Superset grouping in completed workout history belongs to the later roadmap phase.

## Next phase

Phase 18.3 adds the guarded Superset mutation contract and builder UX:

- create/link a Superset;
- add/remove members;
- reorder members;
- break apart a Superset;
- integrate with offline mutation/revision conflict handling.

That phase should reuse the two fields introduced here rather than changing the schema again unless testing exposes a concrete missing invariant.
