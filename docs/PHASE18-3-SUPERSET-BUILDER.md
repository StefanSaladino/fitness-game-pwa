# Phase 18.3 — Superset Builder + Guarded Mutations

## Scope

Phase 18.3 makes the Phase 18.2 Superset metadata editable from an active lifting workout while preserving the existing workout mutation/recovery architecture.

A Superset remains structural only. Exercise sets, scoring, XP, progress, PRs, and workout lifecycle semantics are unchanged.

## Builder UX

Each expanded exercise exposes a Superset action.

- An ungrouped exercise opens **Create Superset** with that exercise selected.
- A grouped exercise opens **Manage Superset** with the current group selected and ordered.
- Two or more exercises are required.
- Exercises already belonging to another Superset cannot be silently stolen into the edited group.
- Selected members can be reordered as A1, A2, A3, and so on.
- Existing groups can add or remove currently ungrouped exercises.
- **Break Superset apart** removes the grouping while leaving every exercise and set intact.
- Generic move/remove controls are disabled for grouped exercises so group edits stay inside the revision-safe Superset mutation path.

Grouped exercise rows display a compact `Superset A1`, `Superset A2`, etc. marker. This is identification only; Phase 18.4 owns the active execution-flow treatment.

## Mutation boundary

Superset writes use the existing durable workout mutation queue and the existing `apply_lifting_workout_mutation` RPC.

Two queue kinds are added:

- `SET_SUPERSET`
- `CLEAR_SUPERSET`

The client includes the current row revisions and the complete expected membership snapshot. The database validates that snapshot under row locks before changing membership. A stale group, changed row revision, removed row, or conflicting membership raises `WORKOUT_CONFLICT` and uses the existing explicit recovery path.

Private database helpers perform the actual membership update. Authenticated clients do not receive direct execute access to those helpers, so the idempotent mutation RPC remains the browser write boundary.

## Ordering

Superset member order is required to be unique and contiguous from zero. The database clears the current group before reassigning the desired order so swaps cannot transiently violate the Phase 18.2 unique member-order index.

## Offline/recovery behavior

The mutation queue already persists requests durably and replays them in order. Superset requests therefore gain the same offline retry, idempotency, and conflict behavior as the existing exercise/set mutations.

Recovery snapshots already preserve `supersetGroupId` and `supersetOrder` from Phase 18.2. No second Superset-specific recovery store is introduced.

## Not included

Phase 18.3 does not add round-by-round Superset execution, automatic exercise switching, rest behavior, preset Supersets, or history presentation. Those remain later roadmap phases.
