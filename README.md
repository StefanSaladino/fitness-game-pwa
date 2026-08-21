# Fitness Game PWA — v0.10.0

Current checkpoint: **Phase 11 — Cardio accessory logging**.

Completed in this checkpoint:

- lightweight completed-cardio logging for Running, Walking/Hiking, Cycling, Swimming, Sport, Cardio, and HIIT;
- duration-only 5/10/15 XP tier preview using the locked activity minimums;
- authoritative best-of-day cardio scoring through the existing `lifting-v1` reconciler;
- safe cardio deletion with automatic XP reconciliation;
- recent cardio history showing which activity currently owns the daily bonus;
- lightweight session/minute/30-day cardio analytics;
- dashboard and lifting-entry shortcuts into accessory cardio;
- no pace, GPS, distance, heart-rate, calorie, wearable, or cardio-progression system;
- cardio remains excluded from weekly lifting-day consistency.

Next roadmap slice: **Phase 12 — PWA/offline hardening**.

## Supabase for v0.10.0

Run `supabase/migrations/20260821000200_cardio_accessory_logging.sql` after the Phase 10 migration.

Cardio logging is accessory-only: completed IN_APP cardio rows reconcile through the existing lifting-v1 ledger, only the best eligible cardio bonus scores each day, and cardio never satisfies weekly lifting-day targets.

## Previous v0.9.0 Supabase checkpoint

Apply `supabase/migrations/20260821000100_group_competition_social.sql`, then run the database regression set ending with `025_group_competition_social.test.sql`.

## Local validation

```powershell
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:e2e
npm run test:internal
```
