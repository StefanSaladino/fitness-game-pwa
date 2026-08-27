# Phase 16.7 — Progress + lifting analytics

Status: **DONE**

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

1. Compact Progress identity/header without decorative imagery.
2. One Week/Month training-load summary at a time.
3. One volume chart for the selected period.
4. Tracked-lift selector.
5. Selected exercise PR summary.
6. Exercise trend, then secondary volume history.
7. PR milestones.
8. Lift-by-lift session history.

## Phase 16.10A.3 composition supersession

The later application-composition reset removed `top-set-progress-log.jpg` from the rendered Progress page. The image file remains in repository history, but Progress now opens with a compact functional identity surface so calendar, lift selection, trends, milestones, and history receive the visual priority. This supersedes the earlier Phase 16.7 image rule without changing analytics behavior.

## Responsive behavior

- phone is the primary composition;
- tracked lifts become a swipeable horizontal rail on phone with scrollbar chrome hidden;
- the Week/Month switch uses touch-friendly buttons, not a native select/dropdown;
- desktop uses a sticky tracked-lift column and wider analytics detail;
- mobile safe-area bottom padding is preserved;
- no horizontal page overflow is allowed.
- charts are clipped to contained internal surfaces and 320px metric summaries become vertical rows instead of compressed desktop grids.

## Non-goals

- no database migration;
- no new analytics or fake insights;
- no muscle-group analytics;
- no scoring or XP changes;
- no favorites or exercise-library expansion;
- no charting dependency;
- no decorative gradients, glow, gauges, donut charts, or KPI-card wall.
