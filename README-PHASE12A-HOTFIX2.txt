Phase 12A v0.11.0 hotfix 2

Fixes only:
- waits for asynchronously hydrated recovered set inputs in WorkoutController.test.tsx
- removes brittle README wording assertion from structural validation
- adds structural coverage that recovered set inputs are awaited

No production IndexedDB, scoring, Supabase, or E2E behavior changes.
