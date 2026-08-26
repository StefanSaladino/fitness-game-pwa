# Phase 16.10 — Cardio accessory surface

Status: **DONE**

## Boundary

Phase 16.10 redesigns the existing cardio logging surface without changing cardio scoring, persistence, eligibility, or the lifting-first product hierarchy.

The existing cardio domain/service/hook remain authoritative for:

- supported cardio categories;
- category-specific minimum active duration;
- 5/10/15 XP duration tiers;
- best-eligible-cardio bonus semantics;
- cardio history and summary;
- log and delete persistence.

No database migration is part of this phase.

## Approved hierarchy

Cardio remains deliberately secondary to lifting.

The shared primary navigation remains:

- Home
- Lift
- Groups
- Progress
- Compete

The Cardio route continues to render with `Lift` as the active primary destination and provides an explicit `Back to Lift` action.

## Phone-first composition

1. Cardio accessory identity and lifting relationship.
2. Horizontally scrollable activity rail using the real seven categories.
3. Dominant active-minutes input.
4. Immediate bonus-tier context.
5. Optional collapsed notes.
6. One primary `Log cardio` action.
7. Compact 30-day/all-time summary line.
8. Flat recent-history rows with earned/eligibility state and delete.

Mobile rails hide scrollbar chrome and must not create horizontal page overflow.

## Desktop composition

Desktop keeps the same hierarchy. When space allows:

- quick log occupies the left column;
- summary/history occupy the right column.

This must not become a cardio dashboard or KPI grid.

## Visual rules

- exact Top Set black/charcoal surfaces;
- orange for interaction and bonus preview;
- green only for actually earned bonus/completion semantics;
- no blue/cyan primary styling;
- no cards-in-cards;
- no KPI wall;
- no charts, progress rings, gauges, or decorative performance graphics;
- no hero image;
- no slogans, glow, glass, or gradients;
- no invented calories, distance, heart rate, pace, zones, streaks, or training telemetry.

## Component boundary

`CardioScreen` owns presentation and local form intent.

`useCardio` continues to own:

- loading/error state;
- log/delete busy state;
- authoritative reload after mutations.

`CardioService` remains the only cardio layer talking directly to Supabase.

The cardio domain continues to own validation and tier calculations.
