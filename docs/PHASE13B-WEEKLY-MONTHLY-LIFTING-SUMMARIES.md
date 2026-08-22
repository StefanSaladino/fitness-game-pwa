# Phase 13B — Weekly/monthly lifting summaries

Checkpoint version: **v0.12.1**

## Purpose

Phase 13B adds personal calendar-level lifting analytics on top of authoritative completed strength-session data. It complements Phase 13A's per-exercise history without changing progression, scoring, or workout capture.

## Read-model boundary

A focused authenticated RPC, `get_my_lifting_calendar_summaries(integer, integer)`, returns bounded weekly and monthly calendar buckets.

The default client request is:

- 12 weekly buckets;
- 6 monthly buckets.

Every requested bucket is returned, including zero-activity periods, so current-versus-previous trend context is not distorted by missing calendar rows.

Each bucket contains:

- distinct completed lifting sessions;
- distinct exercises trained;
- completed working sets;
- external-load `kg·reps` volume;
- true PR count.

The RPC is scoped to `auth.uid()`, uses the profile timezone to establish the current local calendar date, and rejects unreasonable bucket counts.

## Counting rules

Only sessions that are all of the following contribute:

- `source = IN_APP`;
- `status = COMPLETED`;
- `category = STRENGTH`;
- working sets are completed and have at least one rep.

Warmups, incomplete sets, cardio, cancelled/in-progress sessions, and other users never enter the summary.

`volume_kg_reps` remains an analytics-only external-load measure. Plain bodyweight contributes zero external-load volume; added-weight bodyweight contributes the recorded external load. Volume never awards XP.

PR counts are derived from the existing valid `exercise_progress_observations` stream. The first comparable observation is a baseline, not a PR. A later observation counts only when it exceeds every earlier comparable value for that user/exercise/metric.

## Client architecture

The progress service maps database rows into `LiftingCalendarSummary` DTOs. `useExerciseProgress` loads the calendar summary independently from the existing overview/history requests so a calendar-summary error does not take down Phase 13A per-exercise analytics.

`buildLiftingCalendarAnalytics` is a pure mapper that:

- sorts weekly and monthly rows chronologically;
- identifies the current and previous week/month;
- derives simple current-versus-previous deltas for sessions, exercises, working sets, volume, and PRs.

The presentation layer renders:

- This week summary;
- This month summary;
- weekly volume history;
- monthly volume history;
- explicit prior-period deltas.

## Security and privacy

- authenticated-user data only;
- no cross-user comparison;
- no group leaderboard reuse;
- no raw workout data is exposed to other users;
- function execution is revoked from `public` and `anon` and granted only to `authenticated`.

## Non-goals

Phase 13B makes **no scoring/XP changes** and does not:

- change the per-exercise progression contract;
- create new workout writes;
- change badge or weekly-target logic;
- introduce social comparisons;
- normalize bodyweight into invented tonnage;
- add wearable/native behavior.

## Validation

The checkpoint adds:

- pgTAP coverage for authorization, privacy, bucket counts, working-set filtering, volume, PR counting, and input validation;
- service mapping coverage;
- pure calendar analytics unit coverage;
- hook orchestration coverage;
- responsive Progress-screen component coverage;
- product integration coverage;
- desktop Chromium, Android Chromium, and iPhone-class WebKit browser coverage.

Run the full project gate before committing v0.12.1.
