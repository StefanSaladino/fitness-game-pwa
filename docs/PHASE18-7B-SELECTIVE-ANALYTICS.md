# Phase 18.7B — Selective Exercise Analytics Tracking + Picker Refinement

Status: **DONE**

Phase 18.7B separates deep per-exercise analytics selection from authoritative workout data.

## Tracking contract

`user_tracked_exercises` is a user preference layer keyed by authenticated user and canonical exercise.

- Tracking never deletes or suppresses workout history.
- Tracking never changes XP, scoring, PR evidence, completed-set counts, or aggregate volume.
- Untracking removes the exercise only from the deep exercise analytics overview/navigation.
- Re-tracking resurfaces retained historical analytics immediately.
- Duplicate preferences are impossible through the composite primary key.

The migration backfills the exact pre-18.7B analytics-overview population so rollout does not make existing Progress screens unexpectedly empty.

## Live workout

Each expanded exercise exposes **Track in analytics**.

- The checkbox uses the canonical `exerciseId`, not the workout-exercise row id.
- Preference writes go directly to the authenticated server preference boundary and are not mixed into workout mutation replay.
- Offline/recovery-conflict states disable the preference mutation instead of pretending it synced.

## Progress screen

`get_my_exercise_progress_overview()` returns only user-selected tracked exercises.

The underlying progression tables and `get_my_exercise_progress_history()` remain intact and unchanged, so untracking is non-destructive.

The selected exercise detail provides **Untrack from analytics**. After removal, the overview reloads and selects the next tracked exercise if one remains.

Weekly/monthly lifting summaries remain completely independent of tracking preferences.

## Exercise picker

Home hierarchy is:

1. Search all exercises
2. Body-part selector
3. Recent exercises

Recent is collapsed by default every time the picker opens. Expanding or collapsing it does not mutate search, body-part, workout-type, or canonical add state.

## Security

- `user_tracked_exercises` has RLS enabled.
- authenticated users receive SELECT only on the table and can only read their own rows.
- preference writes use `set_my_exercise_analytics_tracking(uuid, boolean)`.
- the SECURITY DEFINER setter requires `auth.uid()`, writes only that user id, and is revoked from `PUBLIC` and `anon`.

## Validation

Targeted validation covers:

- initial preference loading;
- idempotent repeated tracking;
- untrack and re-track;
- active-workout canonical tracking control;
- Progress-screen removal;
- non-destructive retained progression evidence;
- aggregate volume remaining independent;
- overview filtering only;
- Recent below body-part selector;
- Recent collapsed by default and independently expandable;
- RLS/grant/function contracts.

Production migration `20260909050352_phase18_7b_selective_analytics.sql` is deployed. The compatibility backfill preserved all 11 previously eligible analytics selections, production security verification passed, and the full release gate is green.
