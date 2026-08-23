# CI validation contract

## Purpose

GitHub Actions is the clean-environment regression gate for application, browser, and repository database contracts. The project does not require Docker for the normal developer workflow or for GitHub database validation.

Runtime database migrations and pgTAP execution remain authoritative on the hosted Supabase project through the Dashboard SQL Editor workflow.

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

Phase 15.3D includes a deterministic user-administration browser fixture that selects a suspended account, submits an audited restore reason, verifies the refreshed ACTIVE controls, and checks for horizontal overflow at every configured viewport.

## Database gate

GitHub does not start a local Supabase stack and does not run Docker-backed database resets.

The blocking repository database gate is:

```text
npm run db:test:ci
```

That gate validates:

- canonical migration naming and unique migration timestamps;
- non-empty migration artifacts;
- canonical numbered pgTAP suite discovery;
- explicit pgTAP plans;
- rollback-safe test transactions;
- required Phase 15.3A, 15.3B, 15.3C, and 15.3E migration/test invariants;
- the 68-assertion Phase 15.3A, 52-assertion Phase 15.3B, 68-assertion Phase 15.3C, 88-assertion Phase 15.3E, and 45-assertion Phase 15.3F pgTAP contracts;
- and that executable GitHub CI contains no Docker, `supabase start`, `supabase db reset`, or `supabase test db` dependency.

This repository gate is intentionally separate from runtime SQL execution. A migration or pgTAP suite is executed against hosted Supabase before its phase is considered database-validated.

## Canonical pgTAP discovery

Only files matching this convention are canonical database suites:

```text
supabase/tests/*.test.sql
```

The historical `_all-hosted-tests.sql` path remains a compatibility sentinel and is not part of canonical `*.test.sql` discovery.

## Hosted Supabase workflow

For database-bearing slices:

1. Apply the new migration to the hosted Supabase project.
2. Run the corresponding canonical pgTAP file against the hosted database.
3. Confirm the transaction rolls back cleanly and all planned assertions pass.
4. Deploy any phase Edge Function with JWT verification enabled.
5. Run hosted security/performance advisors after DDL changes.
6. Run the GitHub Database gate to validate repository structure and prevent local-stack/Docker regression.

No service-role secret, database password, or privileged Supabase credential belongs in GitHub workflow source merely to reproduce hosted validation.

## Legacy local runner

`scripts/run-canonical-db-tests.cjs` and the `db:test:local` package alias are retained only for historical structural compatibility. They are not part of the supported developer or GitHub CI workflow and must not be invoked by CI.

## Local Windows release gate

The normal non-Docker application gate is:

```text
npm install
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:internal
```

Database migrations and pgTAP are executed against the hosted Supabase project instead of a local Docker stack.

Phase 15.3C hosted validation must use rollback-safe pgTAP test users only. Never call the destructive Edge action against a real account as a test.

Phase 15.3E hosted validation uses only rollback-safe fake reports/cases. It must prove reporter confidentiality, private-table denial, self-report rejection, current evidence ownership, duplicate/rate controls, active-platform-admin reads/mutations, terminal closure, two-year retention, and immutable report/note/event history.

Phase 15.3F hosted validation applies its migration and pgTAP fixtures in one rollback-safe transaction. It proves private immutable access audit, active-admin-only 15-minute review grants, actor/case/subject binding, selected-source enforcement, cursor/page bounds, workout-note redaction, originating-case links, two-year audit retention, and deletion-safe identity snapshots. Communication history remains absent until Phase 15.4 creates a durable source.
