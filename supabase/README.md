# Supabase directory

- `migrations/`: authoritative versioned schema changes.
- `tests/*.test.sql`: canonical pgTAP database/RLS suites.
- `_all-hosted-tests.sql`: compatibility sentinel only; never concatenate suites into it.
- `seed.sql`: reproducible seed data used by local/CI reset workflows.
- `config.toml`: deterministic non-secret local/CI configuration.
- `functions/`: Edge Functions when a server-side use case requires them.

## Normal developer workflow

This project does not require Docker on the developer machine. Hosted Supabase migration + pgTAP execution is the authoritative database gate for the current non-Docker workflow.

Run the application gate locally:

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

## GitHub CI / optional local Docker workflow

GitHub Actions intentionally uses an isolated local Supabase stack to prove that the repository can rebuild from migration zero. A developer who chooses to run Docker locally may use the same database sequence:

```text
npx supabase start
npx supabase db reset
npm run db:test:local
npx supabase db lint --level warning --fail-on error
```

`db:test:local` explicitly selects only `supabase/tests/*.test.sql`.
