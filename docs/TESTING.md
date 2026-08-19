# Testing Strategy

Tests must protect product invariants, not just line coverage.

## Pure domain / Vitest

`src/domain/__tests__` is the executable lifting-v1 oracle.

Critical invariants include:

- lifting workout XP is 0 or 50/day;
- raw strength does not alter workout-completion XP;
- exercise XP requires two completed working sets;
- duplicate canonical exercises score once/day;
- exercise XP caps at 30/day;
- first valid progression observation is baseline-only;
- progression tiers are 5/10/15 and cap at 30/day;
- cardio uses its category minimum and best 5/10/15 bonus only;
- cardio caps at 15/day and does not become lifting qualification;
- total daily XP caps at 125;
- weekly consistency counts lifting days only;
- weekly-improvement XP is zero/removed.

## Component tests

React Testing Library covers user-visible behavior, accessibility semantics, validation, and controller/presentation boundaries. Group tests verify multi-group loading, controller state, invite failure mapping, form-level normalization/validation, zero-membership setup gating, successful create/join membership refresh, and service delegation without UI-owned Supabase access.

## Database / pgTAP

Database tests cover schema, RLS, group permissions, onboarding, qualification flags, and new lifting-v1 persistence boundaries.

After applying Phase 5.4 migration, run:

```text
supabase/tests/007_lifting_scoring_foundation.test.sql
```

## E2E / Playwright

Browser tests cover real user journeys. As workout capture lands, Playwright should test start/log/finish flows while authoritative scoring correctness remains primarily a domain/database concern.

## Concurrency

Authoritative XP concurrency/idempotency must be tested against real PostgreSQL when Phase 7 scoring reconciliation is implemented. Mocks are not sufficient for duplicate-event protection.
