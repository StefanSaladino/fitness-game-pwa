# Fitness Game PWA — v0.8.0

Current checkpoint: **Phase 9 — Weekly lifting consistency + badges**.

Completed in this checkpoint:

- authoritative Monday-Sunday lifting-goal snapshots;
- completed-week current and best streak state;
- next-Monday effective dates for scheduled weekly-target changes;
- PR, lift-day, consistency, and accessory-cardio badges;
- badges remain recognition-only and award no XP;
- historical reconciliation removes stale streak/badge state after corrected workout history;
- dashboard surfaces completed-week consistency, recent weekly snapshots, and earned badges;
- current lifting days are derived from authoritative `lifting-v1` scoring events rather than transitional qualification flags.

Next roadmap slice: **Phase 10 — Group competition/social**.

## Supabase for v0.8.0

Apply `supabase/migrations/20260820000500_weekly_consistency_badges.sql`, then run the database regression set ending with `024_weekly_consistency_badges.test.sql`.

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
