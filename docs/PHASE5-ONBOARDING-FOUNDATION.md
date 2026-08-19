# Phase 5.1 — Onboarding Foundation

Phase 5.1 is intentionally non-visual. It prepares the contracts and persistence layer the approved onboarding UI will consume later.

## What changes

### Database

`20260818000200_phase5_onboarding_foundation.sql` replaces the Phase 4 onboarding RPC with an atomic four-field operation:

```text
username + display name + timezone + weekly target
```

The database remains authoritative for canonical username format/uniqueness, timezone validity, the 1–7 weekly-target boundary, one-time completion, and the weekly-goal snapshot.

### Frontend feature architecture

```text
src/features/onboarding/
  model.ts                 feature contracts only
  validation.ts            pure normalization/validation
  state.ts                 pure state derivation
  onboardingService.ts     Supabase queries/RPCs only
  *.test.ts                focused unit/service tests
```

No final React onboarding screen belongs in Phase 5.1.

## Apply to the hosted Supabase project

In Supabase Dashboard:

1. Open **SQL Editor -> New query**.
2. Paste the entire contents of:

```text
supabase/migrations/20260818000200_phase5_onboarding_foundation.sql
```

3. Run it. Do not manually edit the function in the Dashboard.
4. Run the updated:

```text
supabase/tests/001_schema.test.sql
supabase/tests/005_profile_onboarding.test.sql
supabase/tests/006_phase5_onboarding_username.test.sql
```

Expected plans:

```text
001_schema.test.sql                     24 tests
005_profile_onboarding.test.sql          8 tests
006_phase5_onboarding_username.test.sql  9 tests
```

All assertions should be `ok`; there should be no `not ok` output.

## Local validation

Run from the repository root:

```powershell
npm run typecheck
npm test
npm run build
npm run test:structure
npm run test:e2e
```

The new onboarding TypeScript tests should run under Vitest. Playwright remains separate under `tests/e2e`.

## UI stop point

After Phase 5.1 is green, do **not** immediately build the production onboarding screens.

The next step is the required visual-design gate in `docs/UI-DEVELOPMENT-GATE.md`:

1. define exact onboarding/group screen states;
2. generate a phone-first concept image;
3. review/revise the concept;
4. define responsive behavior and component boundaries;
5. then implement the approved layout.
