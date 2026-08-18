# Testing Guide

## Philosophy

High coverage is not the goal by itself. We test the rule at the layer that is actually responsible for enforcing it.

Examples:

- Qualification math -> pure Vitest domain tests.
- `xp_events` cannot be forged -> Postgres grants/RLS pgTAP test.
- Password reset really changes credentials -> E2E/integration test against Supabase Auth.
- A button renders -> React Testing Library.

Never change a failing test merely to match new implementation output. First decide whether the product rule changed.

## Local validation order

```bash
npm install
npm run typecheck
npm test
npm run build
npx supabase start
npx supabase db reset
npx supabase test db
npx supabase db lint --level warning
```

## Pure domain tests

Location: `src/domain/__tests__`.

These cover:

- threshold boundaries
- base XP cap
- account eligibility
- benchmark calibration
- anti-sandbagging baseline
- performance tiers
- weekly consistency
- fairness invariants

Use exact boundary tests (for example 14:59 vs 15:00), not only generic happy paths.

## Database tests

Location: `supabase/tests`.

Run:

```bash
npx supabase test db
```

Current suites:

- `001_schema.test.sql`: required schema/functions
- `002_rls.test.sql`: cross-user privacy and non-writable authoritative tables
- `003_groups.test.sql`: invite/idempotency/roles/ownership
- `004_qualification.test.sql`: database qualification boundaries
- `005_profile_onboarding.test.sql`: one-time onboarding and pending weekly-target behavior

Database tests run in transactions and are rolled back by the Supabase CLI test harness.

## Database lint

```bash
npx supabase db lint --level warning
```

Treat new warnings as review items. Raise to `--level error` when the project is stable enough to enforce that in CI.

## React/component tests

Use Testing Library through visible semantics. Prefer:

```text
getByRole
getByLabelText
getByText
```

over internal class names/state implementation details.

## E2E

```bash
npx playwright install
npm run test:e2e
```

Planned critical flows:

1. signup + email confirmation
2. login/logout/session restoration
3. password recovery
4. onboarding
5. group create/join
6. workout completion
7. offline retry/idempotency

## Time tests

Freeze/control time. Never rely on the machine's current date for scoring assertions. Explicitly cover:

- midnight crossings
- `America/Toronto`
- DST boundaries
- timezone changes
- Monday/Sunday week boundaries

## Concurrency

Concurrency invariants must be tested against real PostgreSQL, not mocks:

- two simultaneous qualifying workouts cannot produce 200 base XP;
- duplicate sync cannot create a second benchmark observation;
- same workout finishing from two devices is idempotent.

## Test review checklist

Before accepting a new test, ask:

1. What product rule does this assert?
2. Is this the correct enforcement layer?
3. Could an incorrect implementation still pass this assertion?
4. Are the boundary values covered?
5. Are failure/security cases covered?
6. Does the test accidentally depend on execution order/current time/random external data?
