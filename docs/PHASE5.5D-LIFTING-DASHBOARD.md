# Phase 5.5D — First Real Lifting Dashboard

Status: **DONE**

## Purpose

Replace the Phase 5 foundation preview with a dashboard that reads real persisted lifting state while staying inside the current product boundary. Workout capture and authoritative scoring reconciliation remain later phases, so empty states are expected until those systems begin writing sessions and lifting-v1 scoring events.

## Data sources

The dashboard reads:

- `workout_sessions.qualifies_lifting` for weekly lifting-day progress;
- `scoring_events` with `scoring_version = 'lifting-v1'` for the current user's weekly XP breakdown;
- recent completed `STRENGTH` sessions plus `workout_exercises` for training-log summaries;
- `exercise_progress` plus `exercise_catalog` for personal records;
- `profiles.profile_picture_path` and the `profile-pictures` bucket for PFP display;
- `get_group_lifting_leaderboard(group_id, week_start)` for the current group's weekly ranking.

## Security boundary

The client can still read only its own raw `scoring_events` under RLS. Group ranking uses a dedicated `SECURITY DEFINER` function that first proves the caller is an active member of the requested group and only then aggregates active member totals.

The dashboard never receives write access to authoritative scoring state.

## Presentation boundary

`src/features/dashboard/` owns the dashboard read service, controller hook, screen composition, and feature CSS.

The screen intentionally avoids invented level calculations, fake chart series, marketing copy, and decorative feature-summary sections. It emphasizes weekly lifting progress, recent training, PRs, and group standing. Cardio appears only as a secondary XP category.

All new Phase 5.5D styling is in `DashboardScreen.module.css`; no dashboard selectors are added to the legacy global stylesheet.

## Empty-state behavior

Until Phase 6/7 create workouts and reconcile scoring events, users can legitimately see:

- 0 weekly lifting days;
- 0 XP;
- no recent lifts;
- no PRs;
- group members tied at 0 XP.

Those are real persisted states, not placeholder demo values.
