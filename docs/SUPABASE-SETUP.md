# Supabase Setup — Hosted-First, No-Docker Workflow

Hosted Supabase is Top Set's authoritative runtime database environment. The supported workflow does not require Docker, `supabase start`, a local PostgreSQL instance, or a local Supabase stack.

For the complete testing contract, see [`CI-VALIDATION.md`](CI-VALIDATION.md). For secret handling, see [`ENVIRONMENT.md`](ENVIRONMENT.md).

## 1. Install dependencies

```bash
npm ci
```

Node 20+ is supported by `package.json`; GitHub build sanity currently uses Node 24.

## 2. Configure browser-safe application values

Create the ignored local environment file:

```powershell
Copy-Item .env.example .env.local
```

or:

```bash
cp .env.example .env.local
```

Populate the browser-safe values described by `.env.example` and `ENVIRONMENT.md`.

Never place a service-role/secret key, database password, `DATABASE_URL`, JWT signing secret, provider token, or other privileged credential in a `VITE_*` variable. `VITE_*` values are compiled for browser use and are public.

## 3. Hosted Auth URL configuration

Configure Supabase Authentication URL settings for each real application origin. Local development uses `http://localhost:5173`; password-reset/confirmation routes must match the application's current redirect contract.

Keep production redirect allowlists as narrow as practical. Do not change the hosted Site URL to a temporary deploy-preview origin.

## 4. Run the app

```bash
npm run dev
```

The browser communicates with hosted Supabase through its publishable key and server-enforced RLS/RPC boundaries. There is no supported local database process to start.

## 5. Database migration workflow

Versioned files under `supabase/migrations/` are the immutable schema history.

For a database-bearing slice:

1. create the next canonical timestamped migration (`supabase migration new <descriptive_name>` when using the CLI);
2. review SQL, authorization, idempotency, rollback implications, and affected generated types;
3. apply the migration to the linked hosted Supabase project using the approved connected tooling/CLI/Dashboard workflow;
4. confirm hosted migration history contains the exact committed version/name;
5. execute the corresponding canonical `supabase/tests/*.test.sql` suite against hosted Supabase;
6. require every planned pgTAP assertion to pass and test fixtures to roll back;
7. regenerate `src/types/database.generated.ts` after public-schema changes;
8. review hosted Security and Performance advisors after relevant DDL/security changes;
9. run `npm run db:test:ci` for repository-side migration/test guardrails;
10. run the remaining acceptance gate from `CI-VALIDATION.md`.

Do not edit an already-applied migration to repair production. Add a new migration.

## 6. pgTAP conventions

Canonical database suites match:

```text
supabase/tests/*.test.sql
```

They should be transaction-scoped, declare an explicit plan, create rollback-safe fixtures, prove the relevant authorization/data invariants, and finish with rollback.

## 7. Edge Functions

When a trusted server-side boundary is required:

- keep privileged/provider credentials in Supabase server secrets only;
- authenticate requests and re-check authorization server-side;
- do not trust client navigation or client-supplied role metadata;
- deploy/test against the hosted project;
- inspect hosted logs when diagnosing failures.

## 8. Generated types

`src/types/database.generated.ts` should represent the public schema that was actually migrated and tested on hosted Supabase. Regenerate it after public-schema changes rather than hand-editing generated definitions.

## 9. Operational rule

Repository structural validation and hosted runtime validation are separate on purpose. A green static database validator does not prove the hosted schema was migrated or that hosted pgTAP passed.

Prefer current primary Supabase documentation for CLI, Auth, RLS, Storage, pgTAP, and Edge Function behavior rather than preserving copied commands that can drift.
