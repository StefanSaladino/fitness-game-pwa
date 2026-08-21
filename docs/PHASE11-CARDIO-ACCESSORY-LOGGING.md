# Phase 11 — Cardio accessory logging

Phase 11 adds a deliberately secondary cardio workflow without changing the lifting-first scoring model.

## Scope

Supported activities are Running, Walking/Hiking, Cycling, Swimming, Sport, Cardio, and HIIT. A user logs a completed activity with active duration and an optional note. The server writes a completed `IN_APP` workout session through `log_cardio_activity`; clients never write cardio source rows or scoring events directly.

The existing `reconcile_lifting_v1_scoring_for_user` function remains the only scoring authority. Activity-specific minimums and the 5/10/15 duration tiers are unchanged. Only the highest eligible cardio bonus on a scoring date is stored. Logging more cardio cannot stack beyond 15 XP/day.

## Correction and reconciliation

`delete_cardio_activity` lets a user remove an incorrect cardio log. The existing workout-session reconciliation trigger rebuilds lifting-v1 scoring after deletion, so a removed best activity cannot leave orphaned XP; the next-best eligible activity becomes the daily source when appropriate.

## History and analytics

Guarded read RPCs expose the user's own recent cardio history and lightweight totals: sessions, active minutes, last-30-day active minutes, and last-30-day authoritative cardio XP. The UI labels whether each activity currently owns a daily bonus.

This phase does not add pace, distance, GPS routes, heart rate, calorie estimates, wearable imports, or cardio progression scoring.

## Lifting-first boundary

Cardio never creates `LIFTING_WORKOUT` events, never contributes to weekly lifting-day consistency, and never changes the completed-week lifting streak. Phase 11 does not change the lifting-v1 XP coefficients.
