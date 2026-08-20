# Fitness Game PWA — v0.6.0

Current checkpoint: **Phase 7 — Authoritative lifting-v1 scoring persistence**.

Completed in this checkpoint:

- PostgreSQL-authoritative `lifting-v1` scoring reconciliation;
- 50 XP lifting-workout daily award;
- 5 XP canonical exercise completion with six-exercise daily cap;
- 5/10/15 exercise progression with baseline-first semantics and 30 XP daily cap;
- best-of-day 5/10/15 cardio bonus;
- 125 XP daily ceiling;
- deterministic progression observation / PB rebuilds;
- automatic edit/delete/backfill reconciliation for completed in-app source data;
- version-aware scoring-event uniqueness;
- authenticated self-rebuild recovery RPC;
- manual/external history remains non-scoring until an explicit import policy is added.

Next roadmap slice: **Phase 8 — Exercise progression engine + history**.

## Supabase for v0.6.0

Apply `supabase/migrations/20260820000300_authoritative_lifting_scoring.sql`, then run the Phase 7 database regression set ending with `022_authoritative_lifting_scoring.test.sql`.

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
