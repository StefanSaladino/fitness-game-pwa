# Phase 17.3 — Production Statistics Reset Runbook

Status: **BUILT FOR VALIDATION — DO NOT EXECUTE YET**

The production reset is intentionally deferred to Phase 17.8. Phase 17.3 only proves the scope, preservation contract, and browser-persistence invalidation.

## Reset scope

The release reset removes all pre-release training/statistical state from these 15 tables:

- `public.workout_sessions`
- `public.workout_exercises`
- `public.workout_sets`
- `public.workout_mutation_receipts`
- `public.xp_events`
- `public.scoring_events`
- `public.performance_observations`
- `public.performance_benchmarks`
- `public.exercise_progress`
- `public.exercise_progress_observations`
- `public.weekly_goals`
- `public.weekly_lifting_snapshots`
- `public.lifting_consistency_state`
- `public.user_badges`
- `public.group_activity_reactions`

`weekly_goals` is reset deliberately. Keeping pre-release weekly goal rows after deleting the scoring ledger would allow the consistency reconciler to recreate historical pre-release weeks as zero-lift/missed-goal history. The actual target preference remains preserved on `public.profiles` and the current week will be recreated from that preference.

`performance_benchmarks` is per-user benchmark summary state (not a static definition table), so it is reset with performance observations.

`group_activity_reactions` is also reset deliberately because its opaque activity keys refer to workouts, PRs, badges, and weekly goals that the reset removes. Group chat and group-chat reactions are separate records and remain preserved.

## Preserved state

The reset must not delete accounts/authentication, profiles or training preferences, notification preferences, exercise catalogue, benchmark rules/definitions, groups/memberships/invitations, group chat or chat reactions, platform messages, administration/audit history, moderation history, push configuration/subscriptions, or capacity configuration/history.

The checked-in operator SQL records representative preservation counts before deletion and verifies those counts again before it can commit.

## Browser data epoch

Phase 17.3 advances workout durable persistence to epoch `2`:

- IndexedDB moves from `fitness-game-workout` to `fitness-game-workout-v2`.
- recovery keys move from `active-workout:v1:*` to `active-workout:v2:*`.
- queued mutation keys move from `workout-mutations:v1:*` to `workout-mutations:v2:*`.
- browser fallback keys likewise move to `v2`.
- known v1 `localStorage` fallback keys are retired instead of migrated.

This prevents a release build from reading pre-reset drafts or queued mutations from the old persistence namespace.

## Phase 17.8 execution prerequisites

Do not run the reset until all of the following are true:

1. The Phase 17.7 release candidate is frozen and green.
2. A manual Supabase backup/export has been created and verified.
3. The exact release commit SHA and pre-reset row counts have been recorded.
4. The production app is in a controlled maintenance window so new training mutations are not being created during the reset/deploy transition.
5. The release containing persistence epoch 2 is ready for immediate deployment.
6. The operator has reviewed `supabase/release/phase17-production-statistics-reset.sql` and the Phase 17.3 pgTAP/structural gates are green.

## Double-confirmation safety

The checked-in reset file is safe by default:

- its confirmation string is deliberately invalid, so it fails before the first delete; and
- it ends with `ROLLBACK`, so even a deliberately confirmed dry run does not persist changes.

Only in Phase 17.8, after the backup and dry run have been reviewed, should an operator make a temporary execution copy that replaces the confirmation placeholder with `RESET_TOP_SET_PRODUCTION_STATISTICS_2026` and changes the final `ROLLBACK` to `COMMIT`.

Never commit that armed execution copy to the repository.
