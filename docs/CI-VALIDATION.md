# CI validation contract

## Purpose

GitHub Actions is intentionally a **lightweight build-sanity check**, not the full release gate.

For pull requests targeting `master` (except documentation-only changes), and for manual `workflow_dispatch` runs, GitHub Actions uses Node 24, installs the locked dependency tree with `npm ci`, and runs:

```text
npm run build
```

The production build already includes TypeScript compilation and the JavaScript bundle-size guard. Keeping GitHub Actions bounded to this sanity check avoids spending Actions minutes duplicating the much broader local/hosted release gate.

There is intentionally **no automatic `push` trigger**.

## Full release gate

Before a phase is committed/published, the supported local release gate remains:

```text
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:internal
npm run db:test:ci
npm run test:e2e
```

These checks remain release requirements even though they are not duplicated in the lightweight GitHub Actions workflow.

## Browser validation

Playwright remains part of the local release gate through:

```text
npm run test:e2e
```

The configured projects cover desktop Chromium, Android-class Chromium, and iPhone-class WebKit.

Phase 15.3D includes a deterministic user-administration browser fixture that selects a suspended account, submits an audited restore reason, verifies the refreshed ACTIVE controls, and checks for horizontal overflow at every configured viewport.

## Database validation

The repository database contract gate remains:

```text
npm run db:test:ci
```

It is intentionally run as part of the local release gate rather than duplicated in GitHub Actions.

That gate validates:

- canonical migration naming and unique migration timestamps;
- non-empty migration artifacts;
- canonical numbered pgTAP suite discovery;
- explicit pgTAP plans;
- rollback-safe test transactions;
- required Phase 15 database migration/test invariants;
- notification-persistence and push-delivery database contracts;
- and the static repository contracts that can be proven without starting a local Supabase stack.

Runtime database migrations and pgTAP execution remain authoritative on the **hosted Supabase project**. The project does not require Docker, `supabase start`, or local database resets for the supported developer/release workflow.

The database contract validator deliberately does not inspect GitHub Actions orchestration. Database correctness and CI scheduling are separate responsibilities.

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
5. Regenerate committed database types from the hosted schema when the public schema changes.
6. Run hosted security/performance advisors after DDL changes.
7. Run `npm run db:test:ci` locally to validate repository structure and prevent local-stack/Docker regression.

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
npm run test:e2e
npm run test:internal
npm run db:test:ci
```

Database migrations and pgTAP are executed against the hosted Supabase project instead of a local Docker stack.

Phase 15.3C hosted validation must use rollback-safe pgTAP test users only. Never call the destructive Edge action against a real account as a test.

Phase 15.3E hosted validation uses only rollback-safe fake reports/cases. It must prove reporter confidentiality, private-table denial, self-report rejection, current evidence ownership, duplicate/rate controls, active-platform-admin reads/mutations, terminal closure, two-year retention, and immutable report/note/event history.

Phase 15.3F hosted validation applies its migration and pgTAP fixtures in one rollback-safe transaction. It proves private immutable access audit, active-admin-only 15-minute review grants, actor/case/subject binding, selected-source enforcement, cursor/page bounds, workout-note redaction, originating-case links, two-year audit retention, and deletion-safe identity snapshots. Communication history remains absent until Phase 15.4 creates a durable source.

Phase 15.4 hosted validation proves server-resolved audience previews, set-based and idempotent fan-out, immutable revisions and deliveries, recipient isolation, delivery/read/acknowledged state, edit/withdraw audit, two-year retention, suspension enforcement, moderation-timeline communication context, and zero scoring effects. Full-app delivery is additionally constrained to NOTICE messages that cannot require acknowledgement and that the PWA presents once as a dismissible “What’s new” popup.

Phase 15.6A hosted validation proves authenticated self-only profile updates, deny-by-default RPC execution, removal of direct identity/preference column writes, persisted kg/lb display preference, next-Monday weekly-target scheduling, suspended-account rejection, and zero scoring/history rewrites.

Phase 15.6B hosted validation proves default-off account-level optional notification preferences, own-row RLS visibility, direct-mutation denial, authenticated self-only RPC updates, master OFF preserving category selections for later ON, suspended-account rejection, and zero scoring/badge side effects. Browser/device permission and push subscriptions remain explicitly deferred to Phase 15.6C.
