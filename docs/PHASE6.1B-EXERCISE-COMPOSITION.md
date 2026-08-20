# Phase 6.1B — Workout exercise composition

## Goal

Give each active in-app lifting session a durable ordered list of canonical exercises before the exercise picker and set logger are added.

## Persistence contract

`workout_exercises` remains the persisted composition table. From Phase 6.1B onward, authenticated clients may read their RLS-filtered rows but cannot insert, update, or delete them directly.

Composition writes use three authenticated-only `SECURITY DEFINER` RPCs:

- `add_lifting_workout_exercise(workout_id, exercise_id)`
- `remove_lifting_workout_exercise(workout_exercise_id)`
- `move_lifting_workout_exercise(workout_exercise_id, new_order_index)`

Each RPC derives the caller from `auth.uid()` and requires an owned `IN_PROGRESS`, `STRENGTH`, `IN_APP` workout.

## Invariants

- one canonical exercise may appear at most once in a workout;
- add is idempotent for repeated/double-tapped requests;
- new exercises append to the end;
- stored order is zero-based and dense;
- move is atomic and never exposes duplicate order indexes;
- remove compacts the remaining order;
- inactive catalog exercises cannot be newly attached;
- completed/cancelled workouts cannot be changed;
- another user cannot mutate the composition.

## Client boundary

`WorkoutExerciseService` owns Supabase composition reads/RPC writes. `useWorkoutExercises` owns loading, mutation, reload, and user-facing error state. Presentation components receive plain exercise state and callbacks only.

The active workout screen now renders persisted exercise order with restrained move/remove controls. It intentionally does not add a temporary low-quality catalog picker. Phase 6.1C/6.2 connects this composition boundary to the full canonical exercise search experience.

## Out of scope

- fuzzy/alias catalog search;
- recents/favorites;
- set rows;
- warmup/working-set controls;
- scoring reconciliation;
- offline mutation queues.
