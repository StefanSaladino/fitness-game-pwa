# Fitness Game PWA — v0.7.0

Current checkpoint: **Phase 8 — Exercise progression engine + history**.

Completed in this checkpoint:

- active Progress destination in the primary product navigation;
- self-scoped exercise progression overview read model;
- per-exercise session history read model;
- current PR / previous PR / latest-performance separation;
- weighted Epley e1RM history from authoritative Phase 7 observations;
- plain-bodyweight best-rep history;
- baseline, PR, and current-PR timeline states;
- completed-session frequency and last-performed context;
- completed working-set volume exposed as analytics-only;
- added-weight/assisted bodyweight work retained as analytics without being compared to plain-bodyweight PRs;
- service, hook, presentation, integration, structural, and pgTAP coverage.

Next roadmap slice: **Phase 9 — Weekly lifting consistency + badges**.

## Supabase for v0.7.0

Apply `supabase/migrations/20260820000400_exercise_progress_history.sql`, then run the database regression set ending with `023_exercise_progress_history.test.sql`.

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
