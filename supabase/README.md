# Supabase Directory

Hosted Supabase is Top Set's authoritative runtime database environment. Docker and a local Supabase stack are not part of the supported developer or GitHub Actions workflow.

## Directory ownership

- `migrations/` — immutable versioned schema changes;
- `tests/*.test.sql` — canonical rollback-safe pgTAP database/RLS suites;
- `functions/` — trusted server-side Edge Function boundaries;
- `config.toml` — non-secret Supabase project configuration;
- `seed.sql` — historical/reproducibility seed artifact; it does not imply a supported local reset workflow;
- `release/` — database release-support artifacts where required.

## Database-bearing changes

For every migration-bearing slice:

1. author a new timestamped migration;
2. apply it to the linked hosted project;
3. run the relevant hosted pgTAP suite;
4. regenerate committed public database types when schema changes require it;
5. review hosted Security/Performance advisors where applicable;
6. run `npm run db:test:ci` for repository contract validation;
7. run the broader acceptance gate from [`../docs/CI-VALIDATION.md`](../docs/CI-VALIDATION.md).

`npm run db:test:ci` does not start PostgreSQL/Docker and does not prove hosted migration execution.

Do not edit already-applied migrations or reintroduce a Docker/local-Supabase dependency into the supported workflow. See [`../docs/SUPABASE-SETUP.md`](../docs/SUPABASE-SETUP.md) for the full operating procedure.
