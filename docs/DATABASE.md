# Database Guide

## Core tables

### `profiles`
Application profile tied 1:1 to `auth.users`. Stores username, display name, timezone, weekly target, and onboarding timestamp.

### `groups`
Expandable private groups. `created_by` records the creator; current ownership is represented by active `group_members.role = OWNER`.

### `group_members`
Many-to-many group membership with `OWNER`, `ADMIN`, `MEMBER` and `ACTIVE`/`REMOVED` status. A partial unique index guarantees at most one active owner per group.

### `group_invites`
Token, expiry, use limit, use count, and revocation. `join_group_by_invite()` is idempotent for an already-active member.

### `exercise_catalog`
Canonical exercise identities. Progression should reference canonical IDs rather than display-name strings.

### `workout_sessions`
Private workout headers. `scoring_date`, `qualifies`, and `needs_review` are derived by a database trigger so client-supplied values are not trusted.

### `workout_exercises` / `workout_sets`
Normalized strength data. Users can change these directly only while the workout is `IN_PROGRESS` in the foundation policy.

### `xp_events`
Authoritative ledger. Browser role has SELECT only for own rows. No INSERT/UPDATE/DELETE grant.

Partial unique indexes reserve one daily event per type (`DAILY_WORKOUT`, `PERFORMANCE_BONUS`, `WEEKLY_IMPROVEMENT`) per user/scoring date.

### `performance_observations`
Derived raw comparable performance observations. Browser is read-only.

### `performance_benchmarks`
Derived benchmark state (`UNSEEN`, `CALIBRATING`, `ESTABLISHED`). Browser is read-only.

### `weekly_goals`
Historical Monday-start target snapshots. Browser is read-only in this phase so previous weeks cannot be rewritten casually.

## RLS summary

- profiles: self update; read self + people sharing an active group
- groups: active members read; owner/admin update
- group_members: active group members read; mutation through RPC
- group_invites: owner/admin manage
- workouts: owner only
- XP/benchmark/weekly derived data: own read only

## Important functions

- `handle_new_auth_user()`
- `is_active_group_member()`
- `current_group_role()`
- `group_role_for_user()`
- `users_share_active_group()`
- `complete_onboarding()`
- `schedule_weekly_target()`
- `join_group_by_invite()`
- `remove_group_member()`
- `set_group_member_role()`
- `transfer_group_ownership()`
- `leave_group()`
- `prepare_workout_session()`

## Rebuild from zero

```bash
npx supabase db reset
```

Never manually patch a shared/production database and forget the migration. Schema changes belong in `supabase/migrations`.

## Generate TypeScript database types

After the local stack is running and migrations are applied:

```bash
npx supabase gen types typescript --local > src/types/database.generated.ts
```

Regenerate after schema changes.
## Phase 5 onboarding transaction

Migration `20260818000200_phase5_onboarding_foundation.sql` replaces the Phase 4 three-argument `complete_onboarding` function with:

```text
complete_onboarding(username, display_name, timezone, weekly_target)
```

The function normalizes the username to lowercase, validates the canonical username format/uniqueness, validates display name/timezone/target, updates the profile, marks onboarding complete, and snapshots the current weekly goal in one database transaction. The client must not reproduce this as several independent profile updates.

