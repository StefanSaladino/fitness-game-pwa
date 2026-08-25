# Phase 16.7 — Progress + lifting analytics

Status: **IN PROGRESS**

This document records the approved visual contract for the Progress redesign. It is maintained documentation and is intentionally not an executable release gate.

## Purpose

Make existing lifting analytics readable on a phone without inventing new metrics or changing scoring, persistence, authorization, or progression rules.

## Real data retained

- weekly and monthly completed lifting sessions;
- exercise count and completed working sets;
- analytics-only weighted volume;
- PR count and prior-period deltas;
- per-exercise e1RM or plain-bodyweight-rep progression;
- current and previous PR;
- best completed weight and reps;
- training frequency;
- per-session volume;
- PR timeline and session history.

## Approved hierarchy

1. Progress identity/header with one new Progress-specific image.
2. One Week/Month training-load summary at a time.
3. One volume chart for the selected period.
4. Tracked-lift selector.
5. Selected exercise PR summary.
6. Exercise trend, then secondary volume history.
7. PR milestones.
8. Lift-by-lift session history.

## Image rule

`top-set-progress-log.jpg` is unique to this Progress surface. Existing Home, auth, workout, cardio, and exercise-picker imagery is not reused.

## Responsive behavior

- phone is the primary composition;
- tracked lifts become a swipeable horizontal rail on phone with scrollbar chrome hidden;
- the Week/Month switch uses touch-friendly buttons, not a native select/dropdown;
- desktop uses a sticky tracked-lift column and wider analytics detail;
- mobile safe-area bottom padding is preserved;
- no horizontal page overflow is allowed.

## Non-goals

- no database migration;
- no new analytics or fake insights;
- no muscle-group analytics;
- no scoring or XP changes;
- no favorites or exercise-library expansion;
- no charting dependency;
- no decorative gradients, glow, gauges, donut charts, or KPI-card wall.
