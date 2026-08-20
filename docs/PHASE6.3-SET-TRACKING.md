# Phase 6.3 — Per-set workout logging

Phase 6.3 makes a lifting exercise log real training data instead of one shared exercise-level value.

## Data boundary

Every row in `workout_sets` is independent. A set owns its own:

- stable set number within the workout exercise;
- set type;
- canonical `weight_kg` value when applicable;
- reps;
- bodyweight loading mode when applicable;
- completion state and completion timestamp.

Copying a set creates a new row with copied entry values and `completed = false`. The new row is not linked to the source after creation.

## Supported entry modes

`WEIGHT_REPS` exercises support warmup and working sets with independent weight and reps.

`BODYWEIGHT_REPS` exercises support three persisted modes:

- `BODYWEIGHT` — reps only;
- `ADDED_WEIGHT` — reps plus a positive added load;
- `ASSISTED` — reps plus a positive assistance magnitude.

Added-weight and assisted values remain distinct from plain bodyweight. This phase stores that distinction but does not change progression scoring.

Duration and other measurement types remain visible in the exercise library but do not gain completion entry in this weight/reps slice.

## Mutation security

Authenticated clients retain read access to their own set rows through RLS. Direct browser insert/update/delete access is revoked.

Active set composition writes use guarded RPCs:

- `add_lifting_workout_set`
- `copy_lifting_workout_set`
- `save_lifting_workout_set`
- `remove_lifting_workout_set`

The RPCs require ownership of an active in-app strength workout. Completed or cancelled workouts reject set mutation.

## Entry behavior

The phone-first workout surface supports:

- add working set;
- add warmup;
- change each set independently;
- mark a set complete or reopen it;
- copy any set or copy the last set;
- remove a set and compact numbering;
- switch weight display between kg and lb.

Weights remain canonical kilograms in PostgreSQL. Unit switching changes display/input conversion only.

## Out of scope

This phase does not add or change lifting-v1 XP reconciliation. Authoritative scoring persistence remains a later phase.
