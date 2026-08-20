# Phase 8 — Exercise Progression Engine + History

Version: **v0.7.0**

Phase 8 turns the authoritative `lifting-v1` progression state from Phase 7 into a first-class user-facing exercise history without changing XP rules.

## Read-model boundary

Two authenticated, self-scoped RPCs expose progression data:

- `get_my_exercise_progress_overview()` — one row per trained canonical exercise with current PB, previous PB, latest comparable observation, completed-session count, observation count, first/last performed timestamps, and average days between sessions.
- `get_my_exercise_progress_history(exercise_id)` — one row per completed exercise session with comparable PR context plus analytics-only set/volume data.

Both RPCs derive the caller from `auth.uid()`. They do not accept another user id, and anonymous execution is revoked.

## Progression semantics

Phase 8 reads the authoritative Phase 7 data rather than recalculating scoring in React:

- `WEIGHT_REPS` progression uses the stored best-set Epley e1RM observation from completed working sets in the 1–12 rep range.
- Plain `BODYWEIGHT_REPS` progression uses the stored best completed working-set rep observation.
- The first comparable observation is shown as the baseline.
- Later observations are marked as PRs only when they exceed the prior personal best.
- The source workout owning `exercise_progress` is marked as the current PR.
- Current PB and previous PB are surfaced separately from the latest performance, so a later non-PR session cannot replace the displayed record.

No cross-user value is read or used to calculate exercise progression.

## Session analytics

The exercise timeline also exposes completed working-set analytics:

- completed working-set count;
- weighted session volume as `weight × reps` summed across completed working sets;
- heaviest recorded working-set load;
- maximum completed reps;
- plain-bodyweight, added-weight, and assisted set counts;
- session frequency and last-performed context.

Session volume is **analytics-only**. It does not award XP.

## Added-weight / assisted bodyweight rule

Phase 8 preserves the conservative `lifting-v1` comparison rule:

- plain bodyweight sets are comparable with plain bodyweight reps;
- added-weight and assisted sessions remain visible in history/analytics;
- added-weight or assisted work is **not** normalized into the plain-bodyweight PR timeline;
- therefore these sessions cannot silently manufacture bodyweight progression XP.

A future normalized comparison rule may be added only if it is explicitly defined and tested.

## UI boundary

The existing primary-navigation `Progress` destination is now active.

The Progress screen provides:

- tracked canonical exercise list;
- current PR and previous PR;
- latest/last-performed context;
- completed-session frequency;
- comparable observation count;
- session-by-session progression history;
- baseline/PR/current-PR labels;
- analytics-only volume and bodyweight-variant visibility.

Charts remain deferred to Phase 13 lifting analytics.

## Non-goals

Phase 8 does not:

- change `lifting-v1` scoring thresholds or caps;
- create a second progression calculation in the client;
- compare users against each other for progression;
- award XP from session volume;
- normalize added-weight/assisted bodyweight performance;
- implement weekly badges or consistency streaks.
