# Phase 18.4 — Active Superset Flow

Status: **DONE** — full Phase 18.4 validation passed.

## Purpose

Make an existing Superset useful during the live workout without introducing a second set model, changing scoring, or forcing the user through a rigid wizard.

## Sequence contract

Superset members remain ordinary workout exercises with ordinary sets. Active guidance is derived in round-robin order by set number:

`A1 Set 1 → A2 Set 1 → A3 Set 1 → A1 Set 2 → ...`

Only sets that actually exist participate. The flow never invents or automatically adds a missing set.

## UI behavior

- The existing shared Superset card remains the grouping boundary.
- The card displays completed/total set progress.
- The first incomplete step in round-robin order is presented as `Next`.
- The corresponding nested exercise is visually highlighted with `aria-current="step"`.
- `Go to A#` expands and scrolls to that member when requested.
- Completing or editing a set updates the derived next target through normal workout-set state refresh.
- The UI does not auto-scroll, auto-expand, or prevent manual access to another Superset member.
- Once all existing sets are complete, the card reports `Superset complete`.

## Rest behavior

Top Set facilitates Supersets without enforcing one rest style. Users may rest between exercises, after a full round, skip rest, or manually change timers. Superset sequencing remains independent from rest-timer policy.

## Boundaries

No database migration is required for Phase 18.4. No XP, PR, scoring, rest-timer, set persistence, Superset membership, or workout recovery contract changes are introduced here.

Drop Sets remain deferred and are not part of the current Phase 18 → native execution sequence. Pyramid training does not need a dedicated set type because each set already supports independent weight and rep values.

## Validation

The full Phase 18.4 validation gate passed before this phase was marked DONE.
