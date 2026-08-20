# v0.5.2 — Phase 6.4B Idempotent Workout Mutation Queue

Apply after the green v0.5.1 / Phase 6.4A checkpoint.

## What this phase adds

- durable per-user workout mutation queue;
- explicit UUID idempotency key for every queued write;
- one PostgreSQL idempotency receipt per user/key;
- FIFO replay after reconnect;
- retryable transport failure classification;
- terminal authorization/validation failure separation;
- safe retry for exercise/set add, move, remove, copy, and save operations;
- existing set edits can be queued while offline;
- authoritative exercise/set reload after successful replay.

## Supabase

Apply:

1. `supabase/migrations/20260820000100_idempotent_workout_mutations.sql`
2. run `supabase/tests/019_idempotent_workout_mutations.test.sql` with the database test suite.

## Deliberate non-goals

- no scoring changes;
- no conflict/merge engine;
- no optimistic offline structural edits;
- no offline finish/cancel replay.

Those safety rules belong to Phase 6.4C.

## Full project gate

```powershell
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:e2e
npm run test:internal
```
