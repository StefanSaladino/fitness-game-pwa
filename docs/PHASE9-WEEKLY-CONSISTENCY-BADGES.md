# Phase 9 — Weekly Lifting Consistency + Badges

Version: **v0.8.0**

Phase 9 turns the existing weekly lifting target into persisted completed-week history and adds recognition badges without creating another XP system.

## Weekly consistency

- Weeks are Monday through Sunday in the user's profile timezone.
- Only authoritative `lifting-v1` `LIFTING_WORKOUT` scoring dates count as lifting days.
- Cardio does not count toward the weekly lifting target.
- The in-progress current week never increments the completed-week streak.
- Each finished week is stored in `weekly_lifting_snapshots` with the target, lifting-day count, and hit/miss result.
- Historical source edits/deletes reconcile the affected snapshots and streak state instead of leaving stale consistency history.
- `lifting_consistency_state` stores current completed-week streak, best completed-week streak, completed weeks, and goals hit.

## Scheduled target changes

`schedule_weekly_target` now records the exact Monday when a pending target becomes active. This preserves the existing rule that target changes begin at the next week boundary even when the app is not opened for multiple weeks.

## Badges

Badges are derived recognition only. They never write `scoring_events` and never add XP.

Initial badge families:

- PR milestones: first, 5, 10, 25;
- qualifying lift-day milestones: 5, 10, 25, 50;
- weekly consistency: first target hit and 2/4/8-week best streaks;
- accessory cardio: 5 and 10 cardio-bonus days.

`user_badges` is authoritative derived state. If corrected history no longer satisfies a milestone, reconciliation removes the badge.

## Read boundary

`get_my_lifting_consistency_summary()` is authenticated and self-scoped. It reconciles the current week boundary, then returns:

- active weekly target;
- current lifting-day count;
- current and best completed-week streaks;
- recent completed-week snapshots;
- earned badge keys/timestamps.

The client maps badge keys to presentation copy; it cannot directly award badges or write weekly snapshots.

## Non-goals

Phase 9 does not:

- change `lifting-v1` XP amounts or caps;
- award XP for badges or streaks;
- add daily workout streaks;
- make cardio satisfy lifting targets;
- add social badge feeds or reactions (Phase 10);
- add analytics charts (Phase 13).
