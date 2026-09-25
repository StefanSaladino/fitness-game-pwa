# Top Set Maintainer Guide

Status: **current handoff reference for the v1.1.1 + active Phase 20 codebase**

This guide is for an engineer entering the repository after the original implementation work. Read it together with `ARCHITECTURE.md`, `DOMAIN-RULES.md`, `DATABASE.md`, `CI-VALIDATION.md`, and `SUPABASE-SETUP.md`.

## 1. Current product checkpoint

Top Set v1.1.1 contains the completed Phase 19 Muscle Volume Intelligence release plus catalogue/load-capability maintenance. Phase 20 Personalized Training Programs is active. Phases 20.0–20.5 are complete. Phase 20.6 is implemented and is being closed out; Phase 20.7 is the final Phase 20 regression/safety/release gate.

Do not read old `PHASE*.md` files as current operating instructions unless `docs/README.md` explicitly identifies one as active. They are historical implementation records.

## 2. Runtime architecture in one page

```text
React/Vite PWA
  |
  +-- app shell / route composition
  |
  +-- feature controllers/services
  |     |
  |     +-- pure domain models/engines
  |     +-- Supabase RLS/read models/RPC boundaries
  |
  +-- IndexedDB recovery + queued workout mutations
  |
  +-- hosted Supabase (authoritative runtime database)
```

There is intentionally no supported local Supabase/Docker database workflow.

## 3. High-risk ownership boundaries

### Workout execution

The ordinary workout subsystem owns actual exercises, sets, completion, timing, XP/scoring inputs, PR/history inputs, offline recovery, and mutation replay. Never make Program persistence a second workout engine.

### Phase 19 intelligence

Phase 19 owns muscle-volume methodology, contribution rules, performance evidence, recommendations, completed-period reports, frozen monthly sources, and report PDF retention. Phase 20 consumes Phase 19 evidence; it must not fork a second volume/scoring model.

### Phase 20 programs

The Program layer owns planning: generation, schedule, exercise constraints, durable program instances, substitutions, planned-volume overrides, and future-plan adaptation.

`working_sets` is the recommendation/adaptation baseline.  
`user_working_sets_override` is optional user intent.  
Keep them separate.

### Injury/limitation handling

The UI may help a user review exercises based on body-area and movement selections. It must not diagnose an injury, prescribe rehabilitation, or claim an exercise is medically safe. Suggestions require explicit user confirmation before persisting `EXCLUDE + PHYSICAL_LIMITATION`.

### Supabase

Hosted Supabase is authoritative. Keep browser code on the publishable key and server-enforced RLS/RPC boundaries. Never expose service-role secrets to Vite/browser code.

## 4. Route ownership

- `/` — Home
- `/lift` — ordinary lifting workflow
- `/program` — Lift-owned Program planning
- `/cardio`
- `/groups`
- `/progress`
- `/progress/volume`
- `/progress/reports`
- `/compete`
- `/settings`
- `/settings/training` — direct Program training/equipment preferences
- `/platform-admin/*` — independently re-authorized admin surfaces

The app intentionally uses a small history/popstate navigation layer instead of a general routing dependency. If adding a deep link, update route recognition, direct-refresh behavior, navigation tests, and browser tests together.

## 5. Generated and immutable files

Do not hand-edit:

- `src/types/database.generated.ts`
- already-applied `supabase/migrations/*.sql`

Regenerate database types from the linked hosted project after public-schema migrations. Fix database behavior with a new migration.

## 6. Offline workout reliability

Workout recovery and queued mutations are safety-critical. Queued mutations are serialized deliberately. Optimistic revision conflicts are surfaced rather than silently reordered. Do not parallelize replay for speed without redesigning the conflict/idempotency model.

IndexedDB recovery is a local durability aid, not a replacement for authoritative server state.

## 7. SelectField test gotcha

`SelectField` is not a visible native `<select>`. The visible control is a button with `role="combobox"`; options are portal-rendered buttons with `role="option"`. Browser tests should:

```ts
await page.getByRole('combobox', { name: '...' }).click();
await page.getByRole('option', { name: '...' }).click();
```

Do not use Playwright `.selectOption()` against the visible control.

## 8. Program change checklist

When changing generation:

1. keep the pure generator deterministic;
2. make input changes explicit in the source snapshot/version;
3. preserve hard equipment/exclusion failure rules;
4. add domain tests before UI tests.

When changing persistence:

1. use optimistic revisions;
2. use owner/active-account guards;
3. preserve actual-workout authority;
4. add/apply a migration only when the schema/RPC contract truly changes;
5. run hosted pgTAP and regenerate types.

When changing Program UI:

1. check `/program` direct refresh;
2. check `/settings/training` return behavior;
3. check 320px;
4. check Chromium + WebKit;
5. check saved-program switching/collapsible weeks;
6. check PDF output if plan presentation changed.

## 9. PDF ownership

Training-report PDFs and Program PDFs are presentation artifacts.

- Report PDF: derived from the completed/frozen report model.
- Program PDF: snapshot of the current persisted plan and may include blank print/write-in fields.

Neither PDF is an authoritative replacement for structured database state.

## 10. Database workflow

For a database-bearing change:

1. create the next timestamped migration;
2. review SQL locally;
3. apply it to linked hosted Supabase;
4. verify the exact hosted migration;
5. run the relevant rollback-safe pgTAP;
6. regenerate public database types;
7. review Security/Performance advisors;
8. run repository validation.

`npm run db:test:ci` is structural SQL hygiene. It does not prove hosted execution.

## 11. Testing hierarchy

Fast feedback:
- `npm run typecheck`
- focused Vitest files
- focused Playwright spec

Acceptance:
- `npm run validate`

Production release:
- `npm run test:release`
- required visual/admin gates
- hosted database proof where applicable

Do not rerun the entire gate after a selector-only test repair; rerun the changed scope. Do run the full gate at a release checkpoint.

## 12. Comment policy

Useful comments explain:
- why a boundary exists;
- what is authoritative;
- what must stay deterministic;
- what must not be parallelized;
- what is generated/immutable;
- security/medical/product constraints;
- unintuitive browser/test behavior.

Avoid comments that simply translate the next line of code into English.

## 13. Before handing the repo to the next engineer

- `git status --short` is understood.
- Current docs describe the active release line.
- Generated DB types match hosted schema.
- New migrations are applied and tested on hosted Supabase.
- Focused tests for the changed slice are green.
- Full release gates are green when closing a release.
- No release claim is made from uncommitted/local-only state.
