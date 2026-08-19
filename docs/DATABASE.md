# Database Model

## Core identity/social tables

- `profiles`: Auth-linked profile, timezone, onboarding state, and weekly target. From v0.3, the weekly target means **lifting days per Monday-Sunday week**.
- `groups`, `group_members`, `group_invites`: expandable friend-group model with OWNER/ADMIN/MEMBER roles.

## Workout capture

- `exercise_catalog`: canonical exercise identity and measurement type.
- `workout_sessions`: session category/status/timing plus derived scoring-date flags.
- `workout_exercises`: ordered canonical exercises inside a workout.
- `workout_sets`: warmup/working set data.

Phase 5.4 adds explicit session flags:

- `qualifies_lifting`
- `qualifies_cardio_bonus`

The old `qualifies` column remains temporarily as a transitional aggregate flag.

## lifting-v1 scoring persistence

### `scoring_events`

New authoritative XP ledger target with:

- user
- scoring date
- optional workout
- optional canonical exercise
- event type
- XP amount
- `scoring_version`
- metadata

Event types:

- `LIFTING_WORKOUT`
- `EXERCISE_COMPLETE`
- `EXERCISE_PROGRESS`
- `CARDIO_BONUS`

Unique indexes prevent more than one lifting-workout/cardio event per user/date and more than one exercise-completion/progression event per canonical exercise/date.

### `exercise_progress_observations`

Stores valid exercise-specific performance observations for:

- `E1RM`
- `BODYWEIGHT_REPS`

### `exercise_progress`

Stores the current personal best per user + canonical exercise + metric type, including source workout and achieved time.

## Legacy v0.2 scoring tables

These remain in the database for migration safety but are no longer the target for new scoring logic:

- `xp_events`
- `performance_observations`
- `performance_benchmarks`

## Weekly goals

`weekly_goals` remains a historical target snapshot table. Its `target` now means lifting days. Cardio does not increment weekly lifting consistency.

## RLS

Raw workout rows remain user-owned. The v0.3 scoring/progression tables are read-only to authenticated clients and filtered to `auth.uid()`.

Authoritative scoring writes will be performed through controlled server/database logic in the scoring persistence phase.


## Profile pictures — Phase 5.5C

`profiles.profile_picture_path` stores the current object reference. Image bytes live in the `profile-pictures` Supabase Storage bucket. Paths are constrained to the owning profile UUID folder. The bucket is public-read for social rendering, while Storage mutation is authenticated and folder-scoped by RLS.
