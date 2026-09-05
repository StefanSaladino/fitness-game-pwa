# Validation and Release Contract

This is the **single source of truth** for Top Set testing and release validation.

The repository deliberately separates fast local feedback, the full local acceptance gate, GitHub build sanity, and hosted Supabase database proof.

## 1. Install reproducibly

Use the committed lockfile:

```bash
npm ci
```

## 2. Focused development feedback

During a slice, run the smallest relevant tests first. Examples:

```bash
npm run typecheck
npx vitest run path/to/focused.test.ts
npx playwright test path/to/focused.spec.ts
```

Focused green tests are not a release gate.

## 3. Full local acceptance gate

Before closing a phase or production release checkpoint, run:

```bash
npm run typecheck
npm test
npm run test:integration
npm run test:internal
npm run db:test:ci
npm run test:structure
npm run build
npm run test:e2e
```

Run in this order so cheap/static failures are found before the browser suite.

### What these prove

- `typecheck` — TypeScript project compilation without emitting;
- `test` — Vitest unit/component behavior;
- `test:integration` — integration-configured Vitest suites;
- `test:internal` — project-specific internal lifting/reliability verification;
- `db:test:ci` — repository migration/pgTAP/phase database-contract structure;
- `test:structure` — test hygiene, current source structure, composition, release/admin/hosting guardrails;
- `build` — production TypeScript/Vite build plus bundle-size guard;
- `test:e2e` — deterministic fresh production-preview browser flows.

`npm run validate` is only a convenience subset (`typecheck + test + build`). It is **not** the complete release gate.

## 4. Browser matrix

The primary Playwright configuration currently covers:

- desktop Chromium;
- Android-class Chromium (Pixel 7 profile);
- iPhone-class WebKit (iPhone 15 profile).

`test:e2e` starts a fresh preview server and does not reuse an existing process on port `4173`. Keep that port free before running the suite. The deterministic E2E build clears real Supabase browser variables so test fixtures do not accidentally contact production.

Additional targeted browser gates:

```bash
npm run test:e2e:visual
npm run test:e2e:admin-layout
```

Run them when the touched surface falls within their scope and as part of the final visual/release checkpoints defined by the active phase.

## 5. Other targeted gates

Available as appropriate:

```bash
npm run test:coverage
npm run test:hosting
```

Do not turn optional diagnostic coverage into a competing source of release truth; required phase-specific gates belong in this document/active phase contract.

## 6. Database validation

`npm run db:test:ci` is a **repository contract validator**. It does not start PostgreSQL, Docker, or a local Supabase stack and it does not prove a migration was applied to the hosted project.

For every database-bearing slice:

1. create/review the timestamped migration;
2. apply it to the linked hosted Supabase project;
3. verify hosted migration history contains the exact committed version;
4. execute the relevant `supabase/tests/*.test.sql` pgTAP suite against hosted Supabase;
5. require the suite to finish successfully and roll back test fixtures;
6. regenerate `src/types/database.generated.ts` after public-schema changes;
7. review hosted Security and Performance advisors after relevant DDL/security changes;
8. run `npm run db:test:ci` locally to prove repository contract structure.

Static validation never substitutes for hosted database execution.

## 7. GitHub Actions

The current GitHub Actions workflow is intentionally a **build-sanity gate**, not the entire acceptance matrix. On qualifying pull requests it runs Node 24, `npm ci`, then `npm run build` (which includes TypeScript compilation and bundle-size validation).

Documentation-only changes are ignored by that workflow.

Do not assume a green GitHub build-sanity check means unit, integration, database, structural, or browser release gates were run. Those remain explicit phase/release responsibilities until CI is deliberately expanded.

## 8. Release rule

A phase may be marked DONE only when its required focused checks and applicable full gate pass. A production release additionally requires any hosted Supabase changes to be applied/tested and the deployment-specific checks in the active roadmap/release phase to pass.

When a command or required gate changes, update this document and the relevant package/workflow configuration in the same change.
