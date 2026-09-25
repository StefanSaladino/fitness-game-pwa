# Top Set Architecture

This document describes the current application architecture. Historical phase files explain how individual slices were introduced; they do not override this document.

## Runtime shape

```text
React / TypeScript / Vite PWA
            ↓
screen + feature components
            ↓
focused hooks / controllers
            ↓
feature services / repositories
            ↓
Supabase Auth / Postgres / Storage / RPC / Edge Functions
```

Framework-independent scoring, validation, and other pure domain rules live under `src/domain/`.

## Frontend ownership

- `src/app/`: application composition, route/state integration, top-level gates;
- `src/components/`: reusable presentation/layout primitives;
- `src/features/`: feature-owned components, hooks/controllers, services, models, and styles;
- `src/domain/`: pure rules/calculations with no React/Supabase dependency;
- `src/lib/`: infrastructure clients and cross-cutting technical utilities;
- `src/pwa/`: PWA/service-worker/install behavior;
- `src/styles/`: global tokens/reset/base/shared utilities only;
- `src/types/`: shared/generated TypeScript types.

Presentation components do not directly own authoritative persistence or scoring. Supabase communication belongs behind feature services/repositories or reviewed infrastructure boundaries.

## Workout architecture

Workout sessions, exercises, and sets remain the core lifting model.

Top Set deliberately avoids creating separate set models for special workout styles. Supersets are structural metadata on ordinary `workout_exercises`; their sets remain ordinary `workout_sets`.

Drop Sets and Pyramids also preserve the ordinary logical-set model. One advanced parent `workout_set` owns ordered `workout_set_segments` containing stage load/repetition data. That parent remains one set number for workflow, history, recovery, and existing `lifting-v1` completed-set/XP semantics.

The active Superset sequence is derived from:

- Superset member/order metadata;
- the sets that actually exist;
- current completed-set state.

It is guidance, not independently persisted wizard progress.

## Durability and mutation safety

Active workout recovery uses browser-side durable state (IndexedDB) plus the existing synchronization/reconciliation flow. Server mutations that require retry safety use idempotent, guarded mutation boundaries and revision/conflict snapshots.

Design rules:

- retries must not duplicate domain actions;
- offline/reconnect behavior must converge on authoritative server state;
- conflict handling must fail visibly rather than silently overwrite unrelated edits;
- terminal workout actions must not leave recoverable ghost state.

Phase 18.5 extends these guarantees specifically across Superset structure and active-flow recovery. Advanced-set segment writes are also treated atomically through their guarded mutation boundary so a Drop Set or Pyramid cannot be persisted half-updated.

## Scoring and progression

The active scoring model is `lifting-v1`; [`DOMAIN-RULES.md`](DOMAIN-RULES.md) is authoritative.

Authoritative scoring/progression state is server-owned. Browser clients may render and request supported operations but do not directly write authoritative scoring ledgers or personal-best snapshots.

Canonical exercise identity is `exercise_catalog.id`; aliases/search labels must never create accidental duplicate progression identities.

### Phase 19 muscle-volume intelligence boundary

Phase 19 introduces a **separate, non-XP analytics methodology** for estimating muscle-group training volume. It must not be conflated with existing `lifting-v1` workout qualification, exercise-completion XP, progression XP, or logical completed-set counts.

The locked v1 methodology identifier is:

`muscle-volume-v1`

The current data flow is:

```text
completed workout data
        ↓
pre-workout personal exercise baseline
        ↓
baseline-relative set-quality proxy + confidence
        ↓
variant-aware set-stimulus equivalence
        ↓
versioned exercise → muscle contribution mapping
        ↓
effective sets per muscle group
        ↓
rolling 7/28-day read model
        ↓
performance-aware recommendation layer
        ↓
completed weekly/monthly report model
        ↓
frozen monthly source snapshot for completed months
        ↓
Reports UI + verified private latest-monthly PDF
```

The authoritative formula contract lives in [`DOMAIN-RULES.md`](DOMAIN-RULES.md). Architectural consequences are:

- a `WORKING` label alone is not enough to guarantee `1.0` hypertrophy-volume credit;
- weighted set quality is personalized against the user's **prior** same-exercise performance history, never future data;
- the personalized performance signal is a **set-quality proxy**, not a factual RIR estimate;
- `muscle-volume-v1` uses coarse full/partial/minimal set-stimulus tiers rather than false continuous precision;
- the baseline calculation must carry confidence/source metadata so downstream reports know how much volume is personalized vs provisional;
- new/sparse-history users receive provisional volume rather than fabricated individualized certainty;
- Pyramid stages are independently evaluated through the quality layer even though the Pyramid remains one logical workout set;
- Drop Set continuations use a fatigue-aware fractional formula based on first-stage quality and valid lower-load continuation stages; they are not independently compared to a fresh baseline;
- Supersets receive no multiplier or penalty;
- raw repetitions and tonnage remain descriptive workload measures rather than linear hypertrophy multipliers.

Exercise-to-muscle mappings remain independent from `exercise_catalog.primary_muscle_group`. The picker can continue sorting by one primary muscle while the volume engine attributes direct and meaningful indirect work to multiple reportable muscles. Multiple muscles may receive direct `1.0` credit when justified; contribution weights are muscle exposures, not pieces of a sum constrained to 1.0.

### Personal-baseline boundary

The volume engine must reconstruct the baseline that existed **before the workout being scored**. This prevents look-ahead bias and prevents a future PR from silently changing the meaning of an older set.

For weighted work, Phase 19.2 locks a recent Epley-compatible exercise baseline using prior valid observations and a primary 180-day history window. For plain bodyweight work, prior same-exercise repetition performance forms the baseline. Exact qualification/confidence rules are in `DOMAIN-RULES.md`.

The browser should not independently derive these baselines from whatever history happens to be loaded on screen. The versioned server/database read boundary owns the calculation.

### Advanced-set boundary

The advanced-set persistence model remains unchanged:

- Pyramid: one logical parent, ordered stages; Phase 19 sums the quality credit of its completed stages;
- Drop Set: one logical parent, ordered stages; Phase 19 scores first-stage quality then applies the methodology-versioned continuation multiplier/cap;
- no Phase 19 calculation creates extra `workout_sets` rows or changes XP semantics.

### Read-model and report boundary

The browser must not independently recompute authoritative muscle-volume methodology from raw rows. Versioned server-side/database read boundaries produce the volume/report source and return methodology, effective sets, direct/indirect components, benchmark inputs/status context, confidence coverage, and descriptive set/stage counts.

Completed reports add a separate interpretation layer in TypeScript:

- `trainingReportModel.ts` validates completed week/month boundaries and builds the report payload;
- monthly calendar totals remain frozen as raw month facts while their effective-set pace is normalized to the methodology's 28-day benchmark for comparison;
- `performanceTrendEngine.ts` and `musclePerformanceMonitor.ts` classify normalized comparable performance evidence;
- `volumeRecommendationEngine.ts` combines volume state, evidence quality, trend persistence, and confidence so an out-of-range benchmark does not mechanically trigger a prescription;
- the user-facing report excludes Neck while the frozen database source continues to preserve all 13 benchmark muscle rows.

For a completed month, `freeze_my_monthly_training_report_source(date)` idempotently freezes the source before the application builds the report. The frozen source includes period facts, muscle-volume/benchmark inputs, and the performance observations used by the recommendation layer. The source row is verified with a fingerprint so later report rendering is not silently based on a moving methodology source.

### Reports UI and QA boundary

`/progress/reports` is a real application route under Progress. It supports completed Week/Month navigation and uses the same report screen for live and QA data.

Development-only QA is implemented by service injection rather than a parallel fake screen. When Vite is running in `DEV` mode, a deliberate `?qa=` value can substitute a deterministic `TrainingReportService` fixture for the real Supabase service. Supported scenarios are `mixed`, `healthy`, `monitor`, `empty`, and `stress`. Production builds ignore this QA path.

The QA fixtures construct deterministic completed report payloads; they do **not** write fake workouts to Supabase and therefore do not prove the database-to-recommendation chain. They are intended to validate real screen rendering, grouping, long copy, all recommendation states, PDF generation, and pagination. A separate disposable hosted QA-account test remains required for true end-to-end proof.

### Monthly PDF boundary

Monthly PDFs are currently generated on demand in the browser with `pdf-lib` from the same `CompletedTrainingReport` model rendered by the Reports screen. The generator owns text wrapping, dynamic action-card heights, page breaks, repeated page headers, report/methodology footers, and deterministic month-based file naming.

The stress QA fixture deliberately makes all 12 user-facing muscles actionable and uses long rationale/exercise text. The automated test re-opens the generated bytes with `pdf-lib` and requires at least three pages, so multi-page pagination is tested rather than only the `%PDF-` signature.

Private persisted PDF retention is implemented. The browser generates the monthly PDF, uploads a unique private candidate, verifies the uploaded bytes with SHA-256, promotes only a verified candidate, and only then removes the previous retained PDF. The database keeps one current artifact pointer per user while long-term structured monthly snapshots remain the historical source.

## Groups and social features

Group membership is optional and many-to-many. The application must not assume a user belongs to exactly one group or that a group has a fixed member count.

Group roles/permissions are enforced server-side. Competition, social activity, chat, invitations, and administrator actions use purpose-built guarded data boundaries instead of weakening raw-table access for convenience.

## Authentication, administration, and secrets

Supabase Auth provides identity/session infrastructure. Authorization is re-checked by server/database boundaries; client navigation is never an authorization boundary.

Privileged credentials are server-only. Anything compiled through a `VITE_*` variable is public browser configuration.

Platform administration/moderation uses bounded RPC/Edge Function surfaces and must not expose raw Auth secrets, service credentials, unrestricted session data, or unrelated user data.

## Storage

Profile image bytes live in Supabase Storage; the profile stores the object path/reference. Replacement/removal must clean up obsolete owned objects instead of accumulating abandoned profile images.

Phase 19.9 stores monthly PDFs in the private `monthly-training-reports` bucket. One verified latest PDF is retained per user. A new candidate is uploaded to a unique user/snapshot path, downloaded back for byte/hash verification, then promoted through an authenticated server boundary. The previous valid artifact remains until promotion succeeds and is tracked through `pending_delete_path` until Storage deletion is confirmed.

Historical completed-month PDFs remain reproducible from long-term frozen structured snapshots. Opening an older month when a newer PDF is retained generates an ephemeral download and does not replace the newer retained artifact.

Capacity measurements and the retention decision are recorded in [`PHASE19-CAPACITY-VALIDATION.md`](PHASE19-CAPACITY-VALIDATION.md).
## UI and CSS

See [`UI-ARCHITECTURE.md`](UI-ARCHITECTURE.md) and [`CSS-ARCHITECTURE.md`](CSS-ARCHITECTURE.md). Mobile composition is primary; desktop is an intentional adaptation rather than the source layout.

## Future native boundary

Phase 20 is reserved for Personalized Training Programs. Native-shell work begins in Phase 21 with a Capacitor-first architecture proof and must not rewrite or fork Top Set's React/Supabase authority boundaries.

Nothing in the current PWA architecture depends on future Phase 21/22 native live-workout surfaces.

## Personalized-program planning layer

Phase 20 is a planning/template layer above the existing workout engine.

- Domain generation/scheduling/constraints/adaptation live under `src/domain/trainingProgram*`.
- Supabase composition/persistence lives under `src/features/training-program/`.
- `/program` owns planning UI. `/settings/training` owns reusable equipment/training preferences.
- Program launch creates/links an ordinary workout session. The normal workout subsystem remains authoritative for performed sets, completion state, XP/scoring, PRs, history, and downstream Phase 19 analytics.
- Phase 19 remains the source for muscle-volume/performance evidence. Phase 20 may consume that evidence; it must not fork a second hypertrophy/scoring model.
- User volume overrides are presentation/planning intent. Keep the system recommendation separately so future adaptation can still explain its baseline.
- Injury/physical-limitation inputs are exclusion intent only. Suggested exercises require explicit user confirmation before becoming hard exclusions.
