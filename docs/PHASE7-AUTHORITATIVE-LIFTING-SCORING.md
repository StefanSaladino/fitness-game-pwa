# Phase 7 — Authoritative lifting-v1 Scoring Persistence

## Objective

Make PostgreSQL the authoritative source for `lifting-v1` XP and exercise-progression state. Reconciliation derives all scoring from persisted workout source data instead of trusting client awards.

## Reconciliation boundary

`reconcile_lifting_v1_scoring_for_user(uuid)` takes a per-user advisory transaction lock and rebuilds that user's complete `lifting-v1` derived history from completed `IN_APP` workouts. A full history rebuild is intentional: changing an older performance can change the baseline and progression awards of later workouts.

The function rebuilds:

- `scoring_events`;
- `exercise_progress_observations`;
- `exercise_progress` personal-best snapshots.

Source changes to completed in-app sessions, exercises, or sets automatically invoke reconciliation. `reconcile_my_lifting_v1_scoring()` is an authenticated self-scoped recovery/backfill entry point; clients cannot invoke the internal user-targeted function.

## Locked scoring

- qualifying lifting date: 50 XP maximum;
- canonical exercise completion: 5 XP after at least two completed working sets, six exercises / 30 XP maximum per date;
- weighted progression: best completed 1–12 rep working-set Epley e1RM;
- plain bodyweight progression: best completed working-set reps;
- first valid comparable observation is baseline-only;
- later progression tiers: 5 / 10 / 15 XP, maximum 15 per exercise/date and 30 per date;
- cardio: activity-specific qualification minimums, then 5 / 10 / 15 duration tiers, best activity only, 15 XP maximum;
- absolute daily maximum: 125 XP.

Added-weight and assisted bodyweight sets remain excluded from plain bodyweight comparisons.

## Reconciliation / safety rules

- repeated reconciliation replaces derived state instead of stacking events;
- reconciliation is serialized per user;
- historical edits and deletes rebuild downstream PB/progression state;
- future scoring versions can coexist because authoritative event uniqueness includes `scoring_version`;
- the dashboard/leaderboard continue to read `lifting-v1` authoritative tables already used by the product;
- completed `MANUAL` and `EXTERNAL` history is retained but does not automatically award XP in this phase.

## Exit condition

Duplicate, concurrent, retried, edited, or deleted source data cannot manufacture duplicate XP or leave orphaned `lifting-v1` progression state.
