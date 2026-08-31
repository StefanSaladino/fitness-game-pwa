# Supabase Setup — Hosted-First, No-Docker Workflow

This is the current setup guide for the Fitness Game PWA.

The project uses a **hosted Supabase project for runtime database development and validation**. The supported workflow does not require Docker, `supabase start`, a local PostgreSQL instance, or a local Supabase stack.

For the validation contract, also see `docs/CI-VALIDATION.md`.

## 1. Install application dependencies

From the repository root:

```bash
npm install
```

Node 24 is used in GitHub Actions. The package currently accepts Node 20+.

## 2. Configure the React application

Create the ignored local environment file from the sanitized template.

### Windows PowerShell

```powershell
Copy-Item .env.example .env.local
```

### macOS / Linux / Git Bash

```bash
cp .env.example .env.local
```

Set only browser-safe values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_REAL_KEY
VITE_APP_URL=http://localhost:5173
VITE_NETLIFY_CAPACITY_ENABLED=false
```

Get the Project URL and publishable key from the hosted Supabase project. Leave the optional Netlify switch false until its server adapter is deliberately configured. Do not put a service-role key, `sb_secret_...` key, database password, `DATABASE_URL`, JWT signing secret, Netlify token, or other privileged credential in any `VITE_*` variable.

See `docs/ENVIRONMENT.md` for the complete secret-handling policy.

## 3. Configure hosted Auth URLs

In the hosted Supabase Dashboard, configure Authentication URL settings for every real application origin.

For local Vite development, include:

```text
Site URL: http://localhost:5173
Redirect URL: http://localhost:5173/reset-password
```

Add the actual staging and production origins when those environments exist. Keep production redirect patterns as narrow as practical.

The application's password-reset flow constructs its redirect from `VITE_APP_URL`.

## 4. Run the application locally

```bash
npm run dev
```

The browser talks directly to hosted Supabase through the publishable key and the project's RLS/RPC boundaries.

There is no local database process to start.

## 5. Normal application validation

Before publishing a slice, run:

```bash
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:e2e
npm run test:internal
npm run db:test:ci
```

`npm run db:test:ci` validates the repository's migration and pgTAP contracts. It does **not** execute migrations or pgTAP against a local database.

## 6. Database migration workflow

Versioned files under `supabase/migrations/` remain the source of truth.

For a database-bearing slice:

1. create the next canonical timestamped migration with `supabase migration new <descriptive_name>`;
2. review the SQL and authorization boundary;
3. apply the migration to the linked hosted Supabase project using the connected Supabase tooling or the Dashboard SQL Editor workflow;
4. confirm the hosted migration history contains the exact version/name committed to the repository;
5. run the corresponding canonical `supabase/tests/*.test.sql` suite against the hosted database;
6. require every planned pgTAP assertion to pass and the test transaction to finish with `ROLLBACK`;
7. regenerate TypeScript database types from the hosted schema after public-schema changes;
8. run hosted security and performance advisors;
9. run `npm run db:test:ci` to validate repository structure and prevent regression back to a Docker/local-stack CI dependency.

Do not treat a static repository-contract pass as a substitute for hosted SQL execution.

## 7. pgTAP conventions

Canonical database suites match:

```text
supabase/tests/*.test.sql
```

Every canonical suite must:

- begin a transaction;
- declare one explicit pgTAP `plan(...)`;
- create only rollback-safe fixtures;
- prove the relevant RLS/RPC/security invariants;
- finish with `ROLLBACK`.

## 8. Type generation

When the hosted public schema changes, regenerate `src/types/database.generated.ts` from the linked hosted project rather than a local schema.

The generated file must reflect the schema that was actually migrated and tested.

## 9. Edge Functions

When a phase requires an Edge Function:

- keep privileged/provider credentials in the Supabase server environment only;
- enable JWT verification unless the function has an explicitly reviewed alternate authentication contract;
- re-check authorization server-side instead of trusting client navigation or metadata;
- deploy and test the function against the hosted project;
- inspect relevant hosted logs when debugging failures.

## 10. Advisors

After DDL/security changes, run both hosted advisor classes:

- Security
- Performance

Fix new ERROR findings before release. Review new warnings in context rather than weakening a deliberate guarded RPC merely to silence a generic advisor.

## 11. Current no-Docker architecture

The supported path is intentionally:

```text
React / Vite PWA
        ↓
feature hooks/controllers
        ↓
services/repositories
        ↓
Hosted Supabase
```

GitHub Actions validates application behavior, browser behavior, and repository database contracts. Runtime database migrations and pgTAP execute against hosted Supabase.

Legacy local-runner files may remain for historical compatibility, but they are not instructions to install Docker or rebuild a local Supabase stack.
