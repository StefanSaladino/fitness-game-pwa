# Database Model

## Core identity/social tables

- `profiles`: Auth-linked profile, timezone, onboarding state, and weekly target. From v0.3, the weekly target means **lifting days per Monday-Sunday week**.
- `groups`, `group_members`, `group_invites`: expandable friend-group model with OWNER/ADMIN/MEMBER roles.

## Workout capture

- `exercise_catalog`: canonical exercise identity and measurement type.
- `workout_sessions`: session category/status/timing plus derived scoring-date flags.
- `workout_exercises`: ordered canonical exercises inside a workout.
- `workout_sets`: independent ordered set rows with per-set type, canonical `weight_kg`, reps, bodyweight loading mode, and completion state.

Phase 5.4 adds explicit session flags:

- `qualifies_lifting`
- `qualifies_cardio_bonus`

The old `qualifies` column remains temporarily as a transitional aggregate flag.

Phase 6.3 moves set writes behind authenticated active-workout RPCs (`add_lifting_workout_set`, `copy_lifting_workout_set`, `save_lifting_workout_set`, and `remove_lifting_workout_set`). Authenticated clients retain RLS-scoped read access but no longer insert/update/delete `workout_sets` directly.

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

Phase 15.3C account deletion removes every object under the user's UUID folder through the Storage API before hard Auth deletion. It never deletes Storage metadata with SQL. The Auth/profile cascade deletes profile-owned workouts, scoring/progression, badges, memberships/invites/reactions, and preferences. Group ownership is `ON DELETE RESTRICT`, so ownership must be transferred first. UUID-only deletion coordination and append-only platform audit records intentionally survive without profile foreign keys.

## User reports and moderation cases — Phase 15.3E

Report evidence and moderation workflow state live only in the `private` schema:

- `user_reports`: immutable reporter/target identity snapshots, category/reason, optional validated GROUP/WORKOUT/SOCIAL_ACTIVITY reference, and duplicate fingerprint;
- `moderation_cases`: NEW/IN_REVIEW/RESOLVED/DISMISSED queue state, assignment, resolution, closure, and minimum retention boundary;
- `moderation_case_notes`: append-only private moderator notes;
- `moderation_case_events`: append-only submission/assignment/note/status history.

Browser roles receive no table access. Active users may only call `submit_user_report`; ACTIVE platform administrators may call the bounded queue/detail/mutation RPCs. Reporter/target UUIDs intentionally do not reference `profiles`, so retained cases survive account deletion. Closed-case data is retained for at least two years; a later operator-only purge must honor legal/safety holds.


## Dashboard read model

Phase 5.5D adds `get_group_lifting_leaderboard(group_id, week_start)`. The function is `SECURITY DEFINER`, requires the caller to be an active member of the requested group, and returns only active group members with their lifting-v1 XP total for the supplied Monday-Sunday scoring week. It exists because raw `scoring_events` remain self-readable only under RLS; the dashboard must not weaken that policy just to render a group leaderboard.


## Targeted group invitations (v0.4.4)

`profiles.profile_code` is a stable, system-assigned `FG-...` identifier. It is an alternate lookup key for inviting a specific user; it is **not** a reusable group join secret.

`group_invites` now represents pending recipient-specific invitations only:

- one pending row per `(group_id, invited_user_id)`;
- owners/admins create invitations by username or profile invite ID through `create_group_invite`;
- recipients read their inbox through `get_my_pending_group_invites`;
- recipients explicitly accept or decline;
- accept, decline, and revoke hard-delete the invite row;
- direct authenticated table mutation is revoked;
- the old token/URL `join_group_by_invite` flow is retired.
