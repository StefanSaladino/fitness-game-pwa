# CI validation contract

## Purpose

GitHub Actions is the clean-environment regression gate for the repository. It is intentionally broader than the normal Windows development workflow and may use Docker on the hosted GitHub runner without requiring Docker on a developer machine.

## Application gate

GitHub uses Node 24 and `npm ci`, then runs:

```text
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:internal
```

## Browser gate

GitHub installs Chromium and WebKit through Playwright and runs:

```text
npm run test:e2e
```

The configured projects cover desktop Chromium, Android-class Chromium, and iPhone-class WebKit.

## Database gate

The repository commits `supabase/config.toml` so the CI stack is deterministic. The configured Postgres major version is 17, matching the hosted project major version verified when this contract was added.

CI performs:

```text
npx supabase start
npx supabase db reset
npm run db:test:local
npx supabase db lint --level warning --fail-on error
```

`db:test:local` is named explicitly because it requires a local Supabase/Docker stack. It is optional for the normal developer workflow; hosted Supabase remains the authoritative database validation path when Docker is not used locally.

## Canonical pgTAP discovery

Only files matching this convention are canonical database suites:

```text
supabase/tests/*.test.sql
```

`scripts/run-canonical-db-tests.cjs` enumerates those files and passes their explicit paths to `supabase test db`.

Do not place generated aggregate SQL containing multiple pgTAP `plan(...)` blocks in the canonical test discovery set. The historical `_all-hosted-tests.sql` path is retained only as a one-plan compatibility sentinel and is not selected by the canonical runner.

## Why the previous CI stayed red

The old workflow ran bare `supabase test db`. Supabase discovers every `.sql`/`.pg` file under `supabase/tests`, including the historical `_all-hosted-tests.sql` aggregate. That aggregate contained many independent pgTAP programs and therefore emitted multiple TAP plans inside one discovered file. The canonical suites could pass individually while the aggregate still made the GitHub database job fail.

## Local Windows release gate

The normal non-Docker application gate remains:

```text
npm install
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:e2e
npm run test:internal
```

Do not treat `npm run db:test:local` as required on a machine that does not run Docker. Database migrations/pgTAP for that workflow are executed against the hosted Supabase project instead.
