# Fitness Game PWA — v0.5.0 per-set workout logging

Apply this patch after the current **v0.4.5** workout-capture cleanup.

Phase 6.3 turns an active lifting session into a real set log. Every set is independent: one exercise can contain 60 kg × 10, 100 kg × 5, and 105 kg × 4 without sharing one exercise-level weight or rep value.

## What this phase adds

- independent persisted rows for every set;
- warmup and working sets;
- per-set weight and reps;
- complete/reopen state per set;
- add, copy, copy-last, and delete controls;
- dense one-based set numbering after deletion;
- plain bodyweight, added-weight, and assisted bodyweight modes;
- kg/lb display switching while PostgreSQL keeps canonical kilograms;
- guarded set mutation RPCs for active owned in-app lifting sessions;
- direct authenticated browser writes to `workout_sets` are revoked.

Copying a set copies its current values into a new incomplete set. The copied row is independent from the source after creation.

## Supabase

Apply:

1. `supabase/migrations/20260819001300_workout_set_tracking.sql`
2. `supabase/tests/018_workout_set_tracking.test.sql`

Test 018 contains **34 pgTAP assertions** covering permissions, independent set values, completion, copy/delete ordering, bodyweight modes, ownership, and completed-workout immutability.

## Measurement scope

This phase provides full set entry for:

- `WEIGHT_REPS`
- `BODYWEIGHT_REPS`

Duration/other measurement exercises remain selectable but their specialized entry controls are intentionally left for a later workout-capture slice.

## Scoring boundary

No lifting-v1 XP award or progression reconciliation is added or changed here. Phase 6.3 only captures authoritative workout data needed by later scoring persistence.

## Full local gate

```powershell
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:e2e
npm run test:internal
```
