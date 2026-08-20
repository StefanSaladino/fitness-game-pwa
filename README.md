# Fitness Game PWA — v0.5.4

Current checkpoint: **Phase 6.4D — Reliability integration gate**.

The lifting capture path now has local recovery, durable idempotent replay, optimistic-concurrency conflict protection, and integration/browser coverage proving those layers work together across offline, refresh, retry, and competing-device scenarios.

## Reliability state

- Phase 6.4A local active-workout recovery — DONE
- Phase 6.4B idempotent workout mutation queue — DONE
- Phase 6.4C conflict and destructive-edit safety — DONE
- Phase 6.4D reliability integration gate — DONE
- Phase 7 authoritative lifting-v1 scoring persistence — NEXT

## Supabase for v0.5.4

No new migration. Run:

1. `supabase/tests/019_idempotent_workout_mutations.test.sql`
2. `supabase/tests/020_workout_conflict_safety.test.sql`
3. `supabase/tests/021_workout_reliability_gate.test.sql`

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
