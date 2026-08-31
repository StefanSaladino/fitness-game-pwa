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
npm run test:internal
npm run db:test:ci
npm run test:structure
npm run test:e2e
npm run build
npm run test:e2e:admin-layout
```

These checks remain release requirements even though they are not duplicated in the lightweight GitHub Actions workflow.

`npm run test:structure` also runs the Phase 16.10A application-composition validator. It prevents raw select controls outside the shared SelectField, verifies shell-owned scroll/spacing markers, rejects nested feature `main` landmarks inside AppShell, checks canonical product paths and the mobile overflow/scrollbar and selector-sheet contracts, protects the Home/Settings composition reset, and guards purposeful destination banners, header action ownership, inbox deletion confirmation, the Lift task rail, lifecycle confirmation, exercise-picker focus/scroll, 320px set containment, Progress chart/history regions, Cardio quick-log/accessory separation, Groups task views plus group-chat containment, Standings/Activity split, Auth/Onboarding/Legal composition, Supabase-backed Admin Overview, deferred Netlify boundary, and shared system-state/notice contracts from silent regression.

## Browser validation

Playwright remains part of the local release gate through:

```text
npm run test:e2e
```

The configured projects cover desktop Chromium, Android-class Chromium, and iPhone-class WebKit.

Phase 15.3D includes a deterministic user-administration browser fixture that selects a suspended account, submits an audited restore reason, verifies the refreshed ACTIVE controls, and checks for horizontal overflow at every configured viewport.

Phase 16.10A.3 includes deterministic Progress and Cardio fixtures. They verify surface hierarchy and analytics/accessory content across all configured projects, plus an explicit 320px pass that checks document overflow, chart containment, and Cardio history-row width.

Phase 16.10A.4 adds deterministic Groups and Competition fixtures. They verify group-context selection, Members/Invites/Settings separation, Standings/Activity separation, privacy copy, reaction behavior, and explicit 320px horizontal-overflow containment.

Phase 16.10A.5 adds deterministic Auth, Onboarding, Legal, and Capacity/Admin fixtures. They verify the first-viewport sign-in task, focused onboarding progression, public document hierarchy, Top Set administration shell, bounded telemetry surface, and explicit 320px horizontal-overflow containment. The existing user-administration fixture continues to prove real one-pane account selection and an audited restore interaction.

Phase 16.10A.6 adds a 320px shell-action fixture proving that Messages, Settings, and Sign out remain independently visible, touch-sized, non-overlapping, and horizontally contained. The repaired reliability fixture starts incomplete so its completion-control assertion tests the intended state; the install lifecycle assertion uses current Top Set naming.

The normal Playwright config excludes the separately invoked exhaustive visual
matrix and 44-case Chromium admin geometry suite. Those suites use
`playwright.visual.config.ts` and `playwright.admin.config.ts` respectively, so
normal behavioral E2E remains bounded and each specialized gate runs exactly
once.

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
- recipient-only inbox deletion and member-only group-chat security/retention invariants;
- notification-persistence and push-delivery database contracts;
- and the static repository contracts that can be proven without starting a local Supabase stack.

The JavaScript gate intentionally does not mirror exact pgTAP plan counts or
assertion descriptions. Runtime behavior and detailed coverage belong to the
canonical SQL suites; repository validators own file structure and durable
implementation/security boundaries.

Runtime database migrations and pgTAP execution remain authoritative on the **hosted Supabase project**. The project does not require Docker, `supabase start`, or local database resets for the supported developer/release workflow.

The database contract validator deliberately does not inspect GitHub Actions orchestration. Database correctness and CI scheduling are separate responsibilities.

## Canonical pgTAP discovery

Only files matching this convention are canonical database suites:

```text
supabase/tests/*.test.sql
```

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

## Local Windows release gate

The normal non-Docker application gate is:

```text
npm install
npm run typecheck
npm test
npm run test:integration
npm run test:internal
npm run db:test:ci
npm run test:structure
npm run test:e2e
npm run build
npm run test:e2e:admin-layout
```

Database migrations and pgTAP are executed against the hosted Supabase project instead of a local Docker stack.

Phase 15.3C hosted validation must use rollback-safe pgTAP test users only. Never call the destructive Edge action against a real account as a test.

Phase 15.3E hosted validation uses only rollback-safe fake reports/cases. It must prove reporter confidentiality, private-table denial, self-report rejection, current evidence ownership, duplicate/rate controls, active-platform-admin reads/mutations, terminal closure, two-year retention, and immutable report/note/event history.

Phase 15.3F hosted validation applies its migration and pgTAP fixtures in one rollback-safe transaction. It proves private immutable access audit, active-admin-only 15-minute review grants, actor/case/subject binding, selected-source enforcement, cursor/page bounds, workout-note redaction, originating-case links, two-year audit retention, and deletion-safe identity snapshots. Communication history remains absent until Phase 15.4 creates a durable source.

Phase 15.4 hosted validation proves server-resolved audience previews, set-based and idempotent fan-out, immutable revisions and deliveries, recipient isolation, delivery/read/acknowledged state, edit/withdraw audit, two-year retention, suspension enforcement, moderation-timeline communication context, and zero scoring effects. Full-app delivery is additionally constrained to NOTICE messages that cannot require acknowledgement and that the PWA presents once as a dismissible “What’s new” popup.

Phase 15.9 hosted validation must apply the two migrations in order and run the 27-assertion inbox-deletion suite plus the 45-assertion group-chat suite. It proves recipient-only deletion, acknowledgement gating, retained shared audit/deliveries, RPC-only chat tables, outsider/removal denial, duplicate/rate controls, bounded reactions, self-delete, OWNER/ADMIN moderation, content-free private Realtime invalidation, and zero XP effects. Hosted completion also requires disabling public Realtime channel access, regenerating public database types, and reviewing both advisor classes.

Phase 15.6A hosted validation proves authenticated self-only profile updates, deny-by-default RPC execution, removal of direct identity/preference column writes, persisted kg/lb display preference, next-Monday weekly-target scheduling, suspended-account rejection, and zero scoring/history rewrites.

Phase 15.6B hosted validation proves default-off account-level optional notification preferences, own-row RLS visibility, direct-mutation denial, authenticated self-only RPC updates, master OFF preserving category selections for later ON, suspended-account rejection, and zero scoring/badge side effects. Browser/device permission and push subscriptions remain explicitly deferred to Phase 15.6C.
