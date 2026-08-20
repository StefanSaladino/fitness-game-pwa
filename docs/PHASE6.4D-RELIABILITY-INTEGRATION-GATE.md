# Phase 6.4D — Reliability Integration Gate

## Objective

Prove that the lifting capture flow built across Phases 6.4A–6.4C survives ordinary connection loss, refresh/restart, ambiguous retries, stale writes, and workout lifecycle races without losing or duplicating workout data.

This phase is a validation gate. It does not introduce a new scoring rule, offline merge engine, or database schema change.

## Integration coverage

`tests/integration/workout-reliability-journey.test.tsx` exercises the real workout controller with in-memory service boundaries and browser storage/connectivity events.

The gate proves:

- offline set edit -> local queue -> refresh/restart -> recovered draft -> reconnect -> authoritative reconciliation;
- ambiguous post-commit network failure -> retry with the same idempotency key -> one persisted effect;
- stale offline edit -> explicit conflict -> no overwrite -> user chooses **Use server version** -> authoritative state reload;
- finish and cancel races -> authoritative active-workout re-check -> terminal workouts are not revived by recovery state.

## Browser coverage

The Playwright reliability fixture is compiled only when the E2E server sets `FITNESS_E2E_RELIABILITY=1`; it is not part of a normal production build.

Phone-sized browser checks prove:

- offline recovered sets remain editable while structural/lifecycle actions are disabled;
- a conflict disables editing and exposes the explicit server-version action;
- the recovery surfaces do not introduce horizontal overflow.

## Database gate

There is **no new migration** in Phase 6.4D.

Run the existing reliability database suites plus the composed gate:

1. `supabase/tests/019_idempotent_workout_mutations.test.sql`
2. `supabase/tests/020_workout_conflict_safety.test.sql`
3. `supabase/tests/021_workout_reliability_gate.test.sql`

The 021 suite composes idempotent replay, stale-write rejection, delete resurrection protection, and completed/cancelled workout immutability in one database journey.

## Exit condition

An ordinary connection interruption, refresh, retry, or competing device update cannot silently lose newer workout data, duplicate a persisted capture write, revive deleted data, or reopen a completed/cancelled workout.

Phase 7 — authoritative lifting-v1 scoring persistence — is next.
