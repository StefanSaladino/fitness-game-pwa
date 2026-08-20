# Fitness Game PWA — v0.5.2

Current checkpoint: **Phase 6.4B — Idempotent workout mutation queue**.

The app is a lifting-first React/TypeScript PWA backed by Supabase. The implemented product path now covers authentication/onboarding, groups, the lifting dashboard, active workout timing, exercise selection, independent set logging, local active-workout recovery, and idempotent ordered replay of workout-capture mutations.

## Current reliability state

- Phase 6.4A local active-workout recovery — DONE
- Phase 6.4B idempotent workout mutation queue — DONE
- Phase 6.4C conflict and destructive-edit safety — NEXT
- Phase 6.4D reliability integration gate — LATER

See `docs/ROADMAP.md` for the complete plan and `docs/PHASE6.4B-IDEMPOTENT-WORKOUT-MUTATIONS.md` for the current slice.

## Supabase for v0.5.2

Apply `supabase/migrations/20260820000100_idempotent_workout_mutations.sql`, then run the database test suite including `019_idempotent_workout_mutations.test.sql`.

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

No lifting-v1 scoring rules change in this phase.
