# Validation

`docs/CI-VALIDATION.md` is the current source of truth for release validation.

This file intentionally replaces the old package-era validation notes that described a Docker/local-Supabase requirement. Those instructions are historical and no longer describe the supported architecture.

## Supported application gate

Run from the repository root:

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

The application/browser checks are dependency-backed Node/Vitest/Vite/Playwright gates.

## Database validation

The project uses a hosted-Supabase-authoritative database workflow.

For every database-bearing phase:

1. commit a canonical migration under `supabase/migrations/`;
2. apply that migration to the hosted Supabase project;
3. run the corresponding canonical rollback-safe `supabase/tests/*.test.sql` suite against the hosted database;
4. require all planned assertions to pass;
5. regenerate database types from the hosted schema when public schema changes;
6. run hosted security and performance advisors;
7. run `npm run db:test:ci` to validate repository migration/test contracts.

`npm run db:test:ci` is deliberately a repository contract check, not a local database execution step.

## No-Docker invariant

Neither the normal developer workflow nor GitHub database validation starts Docker or a local Supabase stack. Executable CI is guarded against accidental dependencies on Docker, local Supabase startup/reset, or local pgTAP execution.

Legacy scripts/configuration retained for repository history are not part of the supported release gate.

## Phase records

Phase-specific implementation documents record their own hosted migration version, pgTAP plan/result, advisor review, and focused/full application validation where applicable. Those records supplement this contract; they do not replace it.
