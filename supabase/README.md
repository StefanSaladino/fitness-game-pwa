# Supabase directory

This repository uses **hosted Supabase as the authoritative runtime database environment**. Docker and a local Supabase stack are not part of the supported developer workflow or GitHub Actions pipeline.

- `migrations/`: authoritative versioned schema changes.
- `tests/*.test.sql`: canonical rollback-safe pgTAP database/RLS suites.
- `_all-hosted-tests.sql`: historical compatibility sentinel only; it is not part of canonical `*.test.sql` discovery.
- `seed.sql`: historical/reproducibility artifact retained with the migration history; the current hosted-first workflow does not reset a local database from it.
- `config.toml`: non-secret Supabase project configuration retained for repository compatibility; it does not imply a local Docker stack.
- `functions/`: Edge Functions used when a trusted server-side boundary is required.

## Supported developer workflow

Run the application gates locally:

```text
npm install
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:e2e
npm run test:internal
npm run db:test:ci
```

`npm run db:test:ci` is a **repository database-contract gate**. It validates migration/test structure and phase invariants; it does not start PostgreSQL, Docker, or a local Supabase stack.

## Database-bearing slices

For every migration-bearing phase:

1. author the versioned migration under `supabase/migrations/`;
2. apply that migration to the linked hosted Supabase project;
3. execute the corresponding canonical `supabase/tests/*.test.sql` suite against hosted Supabase;
4. require the pgTAP transaction to finish successfully and roll back its test fixtures;
5. regenerate committed database types from the hosted schema when the public schema changes;
6. run hosted security and performance advisors after DDL changes;
7. run `npm run db:test:ci` so GitHub validates the repository-side migration/pgTAP contract.

Hosted runtime execution and repository structural validation are intentionally separate gates. A migration is not considered database-validated merely because the static CI contract passes.

## GitHub Actions

GitHub Actions runs application, browser, and repository database-contract jobs. The database job runs:

```text
npm ci
npm run db:test:ci
```

It must not depend on Docker, `supabase start`, local database resets, or local pgTAP execution. See `docs/CI-VALIDATION.md` for the complete contract.

## Legacy local-runner artifacts

`scripts/run-canonical-db-tests.cjs` and the `db:test:local` package alias are retained only for historical structural compatibility. They are not part of the supported developer or CI workflow and must not be invoked by GitHub Actions.

Do not reintroduce a Docker/local-Supabase dependency merely because those legacy artifacts remain in repository history.
