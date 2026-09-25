# Phase 20.6 — Personalized Program Product Surface

Status: **IMPLEMENTED IN HANDOFF — local validation required**

Phase 20.5 adaptive progression is **CLOSED/DONE** based on completed local validation plus the existing hosted end-to-end proof.

Phase 20.6 exposes the completed Phase 20 planning, persistence, substitution, and adaptation engine as a normal user-facing product surface.

## Product route

`/program` is the dedicated personalized-program surface. It visually belongs to Lift without adding a sixth permanent primary-navigation item.

The Lift start screen links to this route.

## Program creation

The UI collects only explicit generator inputs already locked by Phase 20:

- goal;
- 1–6 sessions/week;
- 4 or 8 weeks;
- calendar start date;
- exactly one selected weekday per weekly session;
- AUTO or a frequency-compatible split.

Equipment access remains in Settings → Training and is a hard generation boundary. Goal/frequency are persisted through the existing revision-guarded Phase 20.2 preference RPC before generation when changed.

The deterministic generator produces a reviewable preview. A program is not durable until the user explicitly saves the preview as a DRAFT.

## Active program

A persisted program shows exact planned dates, current prescriptions, execution state, and the latest revision.

An ACTIVE planned slot can:

- launch its programmed structure into the ordinary Top Set lifting engine;
- launch an ordinary own workout while preserving program lineage;
- be marked missed with no XP penalty;
- review completed evidence through `training-program-adaptation-v1`.

Actual workout history remains authoritative.

## Preferences, exclusions, and substitution

The product surface exposes the existing 20.3 constraint model:

- PREFER is a bounded generator/substitution ranking signal;
- EXCLUDE is a hard constraint;
- PHYSICAL_LIMITATION is only exclusion intent and is not diagnosis, rehabilitation guidance, clearance, or a claim that a substitute is medically safe.

A planned unstarted exercise can use the deterministic substitution engine to find the best compatible replacement preserving target muscle, contribution role, selection intent, measurement semantics, load-mode support, equipment, occupied-exercise uniqueness, and current hard exclusions. The existing revision-guarded replacement RPC remains the mutation boundary.

## Adaptation

Completed program-linked workouts expose **Review progression**.

That action invokes the existing 20.5 adaptation service. It may append a bounded future-plan change or persist a `NO_CHANGE` evaluation. Retries are idempotent through the 20.5 audit boundary.

## User-adjustable total workout volume

An unstarted DRAFT or ACTIVE planned workout exposes a **Total planned volume** control.

- `+` adds one working set to the exercise whose current target/evidence best supports additional work.
- `-` removes one working set from the exercise whose current target/evidence best supports trimming work.
- Per-exercise planning remains inside the existing 1–8 working-set domain.
- The system recommendation remains in `working_sets`; user choices are stored separately in `user_working_sets_override`.
- **Restore recommended** clears user overrides and returns to the latest system recommendation, including any later 20.5 adaptation.
- Programmed workout launch uses the effective override when present. Ordinary completed sets remain the only authoritative training evidence.

Before a user proceeds with a change that conflicts with sufficiently supported Phase 19 evidence, the UI shows an overridable warning. It does not warn merely because a benchmark number is technically high or low. `MONITOR` and limited-evidence states remain non-prescriptive.

Examples include removing work against a supported `ADD_VOLUME_CAUTIOUSLY` signal, pushing planned exposure above target while the current signal says `MAINTAIN`, or adding work against `REDUCE_VOLUME_CAUTIOUSLY` while performance is plateauing, declining, or regressing.

The warning language describes recovery/performance risk as a possibility rather than claiming that volume caused a regression. Current 7-day evidence is a decision aid; later weeks can change through 20.5 adaptation.

Manual volume mutations use a guarded revision-checked RPC and append an audit record. Browser clients cannot directly update planned prescription rows.

## Learned personal volume baseline

Phase 20.6 now uses population benchmark ranges as a cold-start prior rather
than treating them as a permanent personal optimum.

For each muscle, Top Set can pair actual historical weekly effective sets from
the reviewed Phase 19 stimulus ledger with comparable performance observations.
Only weeks with a positive within-week performance response contribute to the
learned range.

The personal signal is deliberately gated:

- fewer than 6 qualifying positive-response weeks or less than 35 days:
  population targets remain unchanged;
- 6+ qualifying weeks across at least 35 days: an emerging personal range gets
  40% weight and the population prior retains 60%;
- 10+ qualifying weeks across at least 63 days: an established personal range
  gets 70% weight and the population prior retains 30%.

The learned range is muscle-specific and uses the 25th/50th/75th percentiles of
effective volume associated with positive response. It does not use body weight,
sex/gender, or age as direct set multipliers.

The personalized 7-day target is fed into the same Phase 19 recommendation
matrix. Therefore improving performance can still suppress unnecessary volume
increases, negative trends can still trigger hold/reduce behavior, 20.5
adaptation consumes the personalized signal, and the 20.6 manual-volume warning
system evaluates edits against the same personalized target.

This is conservative by design: insufficient personal evidence falls back to
the reviewed population benchmark instead of inventing an individualized
optimum.

## PDF

The user may download the current persisted program as a PDF.

The PDF is a portable snapshot only. It deliberately states that the in-app structured program is authoritative because substitutions, adaptations, execution state, and workout history can change after export.

No PDF persistence or Storage retention is added in 20.6.

## Database impact

Hosted Supabase already contains three Phase 20.6 support migrations:

- `20260924014131_phase20_6_program_ui_workflow_support`;
- `20260924015313_phase20_6_training_program_substitution_ui_boundary`;
- `20260924015542_phase20_6_remove_duplicate_substitution_overload`.

They add the guarded **Do my own workout** launch boundary, the substitution audit table, and the revision-guarded planned-exercise replacement RPC used by this UI. Those migrations were present in hosted Supabase but missing from GitHub at inspection time, so this handoff includes source-controlled copies that reproduce the hosted final state. No additional hosted migration is applied by this ZIP.

## Focused validation

Run:

```powershell
npx vitest run `
  src/domain/trainingProgramVolume.test.ts `
  src/features/training-program/trainingProgramProductService.test.ts `
  src/features/training-program/trainingProgramPdf.test.ts `
  src/features/training-program/trainingProgramGeneratorService.test.ts `
  src/features/training-program/trainingProgramPersistenceService.test.ts `
  src/features/training-program/trainingProgramAdaptationService.test.ts

npm run typecheck
npm run build
npm run db:test:ci
git diff --check
```

20.7 remains the full regression/safety/release gate.
## Guided limitations and printable logging

- Injuries and physical limitations now use a guided review flow: affected area, issue type, editable movement restrictions, suggested exercises, and explicit user confirmation before exclusions are saved.
- Suggestions are movement-pattern review prompts only. They do not diagnose injuries, prescribe rehabilitation, or determine medical safety.
- Split labels use slash separators between workout days (for example Push / Pull / Legs and Upper / Lower / Full Body).
- Saved-program weeks are collapsible, with Week 1 open initially.
- Program start dates are constrained to today or later in the user's profile timezone.
- Program PDF exports are print-oriented workout sheets with blank Actual sets, Weight / load, Reps, and Done fields for handwritten logging.
- Program-page custom action buttons use explicit high-contrast text, borders, and backgrounds across responsive viewports.

