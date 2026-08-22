# Phase 13A — Per-exercise lifting analytics

## Boundary

Phase 13A turns the existing personal exercise-progress history into a useful analytics view. It does not create a second progression model and does not modify the lifting-v1 scoring oracle.

The source of truth remains the authenticated Phase 8 read models:

- `get_my_exercise_progress_overview`
- `get_my_exercise_progress_history`

No Supabase migration is required for this slice.

## Derived analytics

`buildExerciseAnalytics()` is a pure feature function. It accepts one selected exercise plus its authoritative history and derives:

- chronological comparable metric points for e1RM or plain-bodyweight reps;
- chronological per-session `kg·reps` volume points;
- heaviest completed working-set load across the selected history;
- highest completed working-set rep count across the selected history;
- total and latest recorded weighted volume;
- baseline / PR / current-PR timeline entries.

The mapper never imports React, Supabase, browser storage, or scoring code.

## Comparison rules

Weighted `WEIGHT_REPS` exercises chart the already-authoritative Epley e1RM observation. Phase 13A does not introduce a new 1RM formula.

Plain `BODYWEIGHT_REPS` exercises chart comparable bodyweight-rep observations only. Added-weight and assisted sessions remain visible for analytics such as recorded load/volume, but they do not become comparable plain-bodyweight PR points and do not alter XP.

## Presentation

The existing Progress surface remains the entry point. For the selected exercise it now presents:

- current and previous PR;
- best weight and best reps;
- frequency and total volume;
- comparable metric trend chart;
- volume-history chart;
- dedicated PR timeline;
- complete lift-by-lift session history.

Charts use native SVG with accessible labels and no charting dependency. Empty/loading/error states remain explicit.

## Responsive/browser gate

`progress.e2e.html` renders a deterministic analytics fixture and `tests/e2e/progress-analytics.spec.ts` validates the surface in every configured Playwright project:

- desktop Chromium;
- Android-class Chromium;
- iPhone-class WebKit.

The browser assertion verifies key analytics sections and guards against horizontal overflow.

## Non-goals

- No Supabase migration.
- No scoring/XP changes.
- No new workout mutation/write path.
- No cross-user analytics or comparison.
- No cardio analytics redesign.
- No invented plateau/coaching engine.
- No weekly/monthly aggregate dashboard yet; that is Phase 13B.
