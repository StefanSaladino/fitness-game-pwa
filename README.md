# Fitness Game PWA — v0.5.3

Current checkpoint: **Phase 6.4C — Conflict and destructive-edit safety**.

The lifting workout flow now has local recovery, an idempotent ordered mutation queue, and optimistic-concurrency protection for stale set/exercise edits. Conflicts never overwrite newer server data automatically; the user can explicitly discard the unsafe local queue and reload the authoritative server version. Completed/cancelled workouts remain immutable.

## Reliability state

- Phase 6.4A local active-workout recovery — DONE
- Phase 6.4B idempotent workout mutation queue — DONE
- Phase 6.4C conflict and destructive-edit safety — DONE
- Phase 6.4D reliability integration gate — NEXT

## Supabase for v0.5.3

Apply `supabase/migrations/20260820000200_workout_conflict_safety.sql`. Then run `supabase/tests/019_idempotent_workout_mutations.test.sql` and `supabase/tests/020_workout_conflict_safety.test.sql`.

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
