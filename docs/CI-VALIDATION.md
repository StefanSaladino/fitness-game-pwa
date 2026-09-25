# Validation and Release Contract

This is the **single source of truth** for Top Set testing and release validation.

The repository separates focused development feedback, the canonical local
acceptance gate, browser release validation, and hosted Supabase proof.

## 1. Install reproducibly

Use the committed lockfile:

```bash
npm ci
```

## 2. Focused development feedback

During a slice, run the smallest relevant checks first. Examples:

```bash
npm run typecheck
npx vitest run path/to/focused.test.ts
npx playwright test path/to/focused.spec.ts
```

Focused checks are not a release gate.

## 3. Canonical local acceptance gate

Run:

```bash
npm run validate
```

The current `validate` script executes, in order:

```text
typecheck
unit/component tests
integration tests
production build + bundle budget
database repository-contract validation
```

Equivalent commands are:

```bash
npm run typecheck
npm test
npm run test:integration
npm run build
npm run db:test:ci
```

Do not document or invoke removed scripts such as `test:internal` or
`test:structure` unless they are deliberately reintroduced in `package.json`.

## 4. Production browser release gate

Before closing a production release checkpoint, run:

```bash
npm run test:release
```

`test:release` runs the canonical `validate` gate and then the normal Playwright
browser matrix.

The primary Playwright configuration covers:

- desktop Chromium;
- Android-class Chromium (Pixel 7 profile);
- iPhone-class WebKit (iPhone 15 profile).

The browser gate builds and starts a fresh production preview and does not reuse
an existing process on port `4173`.

## 5. Targeted visual/admin browser gates

The visual and administrator-layout suites are intentionally separate from the
normal Playwright matrix:

```bash
npm run test:e2e:visual
npm run test:e2e:admin-layout
```

Run a targeted suite when the touched surface falls within its scope. Run the
visual audit before a phase/release that changes major responsive presentation.
Phase 19's Reports surface is included in the visual audit fixture.

## 6. Database validation

`npm run db:test:ci` validates the repository database contract. It does not
start PostgreSQL, Docker, or a local Supabase stack and does not prove a
migration was applied to the hosted project.

For every database-bearing slice:

1. create/review the timestamped migration;
2. apply it to the linked hosted Supabase project;
3. verify hosted migration history contains the exact committed version;
4. execute the relevant `supabase/tests/*.test.sql` pgTAP suite against hosted Supabase;
5. require the hosted test suite to finish successfully and roll back fixtures;
6. regenerate `src/types/database.generated.ts` after public-schema changes;
7. review hosted Security and Performance advisors after relevant DDL/security changes;
8. run `npm run db:test:ci` locally to prove repository contract structure.

Static validation never substitutes for hosted database execution.

## 7. GitHub Actions

The GitHub Actions workflow is a build-sanity gate, not the whole release
matrix. A green hosted build does not replace the explicit unit, integration,
database, and browser gates above.

## 8. Release rule

A phase may be marked DONE only when its required focused checks and applicable
full gate pass. A production release additionally requires any hosted Supabase
changes to be applied/tested and any provider/deployment checks required by the
active roadmap to pass.

When a required command changes, update this document and `package.json` in the
same change.

## 9. Phase 20 program checks

During Phase 20 program work, use focused checks while iterating:

```bash
npm run typecheck
npx vitest run src/domain/trainingProgram*.test.ts src/features/training-program/*.test.ts
npx playwright test tests/e2e/training-program.spec.ts
```

The dedicated Program E2E fixture uses injected deterministic services. It validates responsive Program behavior without substituting for hosted database/RPC proof. Top Set's `SelectField` exposes a button with `role="combobox"` and portal-rendered `role="option"` buttons; Playwright should click the combobox then the option rather than using native `.selectOption()`.

Before Phase 20.7 release closeout, run the canonical full acceptance/release gates above and repeat the required hosted migration/pgTAP/advisor verification for the final Phase 20 migration set.
