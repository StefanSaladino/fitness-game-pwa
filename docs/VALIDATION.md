# Validation Record — Phase 4 Package

This file distinguishes **tests actually executed in the packaging environment** from tests that require a developer machine with network access and Docker.

## Passed during package creation

- Dependency-independent domain verification: **62 assertions passed**.
- Project/schema structural validator: **95 assertions passed**.
- TypeScript/TSX syntax transpilation for every `src/**/*.ts(x)` file: passed as part of structural validation.
- JavaScript syntax checks for service worker/internal scripts: passed.
- Shell syntax check for `scripts/internal-test.sh`: passed.
- PWA icon dimension checks: 180x180, 192x192, and 512x512 passed.
- Migration lexical balance check: balanced parentheses, quotes, comments, and `$$` function bodies.
- pgTAP plan counts: every authored SQL test plan matches its test assertion count.
- Secret-pattern scan: no actual service-role/database credentials are included in the package.

## Not executable in the packaging environment

### npm dependency-backed pipeline

The environment could not reach the npm registry, so these were not executed here:

```bash
npm install
npm run typecheck
npm test
npm run test:coverage
npm run build
npm run test:e2e
```

The source was still syntax-checked and the framework-independent domain layer was compiled/executed directly.

### Local Supabase/PostgreSQL pipeline

The packaging environment has no Docker engine, so these could not be executed here:

```bash
npx supabase init
npx supabase start
npx supabase db reset
npx supabase test db
npx supabase db lint --level warning
```

**Phase 4 must not be marked fully verified until those commands pass on a developer machine.** The detailed steps are in `docs/SUPABASE-SETUP.md`.

## First local validation gate

From a fresh unzip/clone:

```bash
npm install
npx supabase init
# Edit supabase/config.toml Auth URLs per docs/SUPABASE-SETUP.md
npx supabase start
npx supabase db reset
npx supabase test db
npx supabase db lint --level warning
npm run typecheck
npm test
npm run build
```

If any command fails, fix the underlying migration/code or revise the product specification intentionally; do not simply weaken the test to make CI green.

## v0.2.1 environment-safety validation

The environment/documentation revision was checked after the Phase 4 package was created.

Passed in the packaging environment:

- framework-independent domain verification: 62 assertions
- project structural validation: 107 assertions
- `.env.example` contains only browser-safe placeholder assignments
- no real `.env`, `.env.local`, `.env.production`, or `.env.test.local` file is present in the package
- `.gitignore` ignores `.env`, `.env.*`, common private-key files, and Supabase local env/temp state
- `.env.example` is explicitly allowed to be committed
- Git `check-ignore` verification confirms `.env.local`, `.env.production`, `.env.test.local`, `*.pem`, and `supabase/.env` are ignored
- PWA service-worker JavaScript syntax check passed
- package and web-manifest JSON parsing passed

The existing limitation remains: the packaging environment does not provide a working Docker/Supabase local stack or dependency installation path, so the authored pgTAP tests and full Vite/Vitest/Playwright pipeline still require execution on the developer machine.

## Phase 5.2 shared-UI foundation validation

The Phase 5.2 packaging pass keeps the same distinction between dependency-independent checks and the developer-machine frontend pipeline.

Passed in the packaging environment:

- framework-independent domain verification: **62 assertions**
- project/schema/UI structural validation: **198 assertions**
- TypeScript/TSX syntax transpilation for every `src/**/*.ts(x)` file
- shared `src/components/**` files verified to contain no Supabase imports
- shared component layer verified not to own scoring calculations/constants
- primary navigation verified to exclude Nutrition and calorie tracking
- phone/tablet/desktop responsive shell contracts detected
- future smartwatch experience documented as a separate native companion
- existing Phase 5 onboarding migration and pgTAP plan-count checks retained

The packaging environment again could not complete `npm install`, so the dependency-backed commands below remain the authoritative developer-machine gate for this slice:

```bash
npm run typecheck
npm test
npm run build
npm run test:structure
npm run test:e2e
```

The new component tests are intended to run inside the normal Vitest suite on the developer machine. Do not treat syntax/structural validation as a substitute for that run.

## Phase 5.3A validation additions

The authentication/onboarding UI slice adds checks for:

- Auth input normalization and validation
- sign-in form delegation only after local validation
- password confirmation before sign-up delegation
- generated placeholder username suppression
- canonical onboarding submission
- persisted profile reload after successful onboarding
- duplicate username error mapping
- presentation components remaining free of Supabase/service imports
- password-reset account-enumeration-safe messaging
- responsive Auth/onboarding CSS contracts

Run the authoritative dependency-backed checks on the development machine with:

```bash
npm run typecheck
npm test
npm run build
npm run test:structure
npm run test:e2e
```

## Phase 5.5C profile pictures

After applying `20260819000200_profile_pictures.sql`, run `supabase/tests/008_profile_pictures.test.sql` in the hosted SQL Editor. It validates the profile path column, public-read bucket configuration, file-size/MIME restrictions, own-folder Storage policies, and profile-path ownership constraint.
