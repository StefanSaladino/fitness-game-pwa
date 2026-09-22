# Top Set Development Roadmap

Status: **Phase 20 active - 20.0â€“20.1 complete, 20.2 Personalized Program Generator next**

This document is the canonical milestone index. Detailed historical implementation records live in the corresponding `PHASE*.md` files.

## Completed foundations - Phases 0-19

Top Set has completed the major foundations needed for the current intelligence work:

- lifting-first `lifting-v1` domain and authoritative scoring;
- React/Vite/TypeScript PWA foundation;
- Supabase Auth, profiles, groups, invitations, Storage, RLS/RPC security, moderation, messaging, and administrator tooling;
- durable lifting sessions, set logging, IndexedDB recovery, idempotent mutations, conflict handling, progression/history, badges, cardio accessory logging, presets, competition, and social features;
- mobile-first application composition and responsive browser coverage;
- live-workout workflow including Supersets, Drop Sets, Pyramids, selective analytics, recovery/history/preset preservation, and mobile density polish;
- full PWA regression and production release checkpoint.

Historical details remain in the phase records and `CHANGELOG.md`. They are not duplicated here.

## Phase 18 — Live lifting workflow

| Phase | Status | Goal |
|---|---|---|
| 18.0 | **DONE** | Compact sticky active-workout timer/header |
| 18.1 | **DONE** | Collapsible completed sets |
| 18.2 | **DONE** | Superset data model/foundation |
| 18.3 | **DONE** | Revision-safe Superset builder/mutations |
| 18.4 | **DONE** | Active round-robin Superset guidance |
| 18.5 | **DONE** | Superset recovery and reliability |
| 18.6 | **DONE** | Preserve Superset structure in completed-workout history |
| 18.7 | **DONE** | Reproduce Superset structure in preset workouts |
| 18.7A | **DONE** | Drop Sets + full/ascending Pyramid set workflows |
| 18.7B | **DONE** | Selective E1RM/deep exercise analytics tracking + picker Recent refinement |
| 18.8 | **DONE** | Full active-workout mobile polish/density pass |
| 18.9 | **DONE** | Full PWA regression and production release checkpoint |

### Locked advanced-set contract

- A Drop Set or Pyramid is one logical workout set with ordered load/repetition stages.
- Drop Sets use DROP classification; pyramids use WORKING classification.
- Advanced stages contribute to normal lifting volume, while the logical parent counts once for existing completed-working-set/XP semantics.
- The Phase 18 logical-parent contract does **not** require Phase 19 muscle-volume analytics to treat every advanced pattern as exactly one effective set; structural counting and stimulus-equivalent analytics are separate concerns.
- Advanced stages must survive recovery/offline replay and completed-workout history without being flattened.

### Locked selective-analytics contract

- Track in analytics controls only whether an exercise appears in E1RM and other in-depth per-exercise analytics surfaces.
- Untracked exercises still count fully toward workout/session volume, aggregate volume, history, scoring/XP, and retained PR evidence.
- Tracking is a non-destructive user preference.

## Phase 19 — Muscle Volume Intelligence

| Phase | Status | Goal |
|---|---|---|
| 19.0 | **DONE** | Exercise Catalogue Expansion — add useful common commercial-gym exercises, especially machines, without adding new picker categories |
| 19.1 | **DONE** | Exercise Catalogue Audit — normalize names, aliases, measurement types, primary muscles, and duplicates; deploy high-confidence corrections and preserve ambiguous cases for explicit later review |
| 19.2 | **DONE** | Volume Intelligence specification lock — evidence-backed personalized set-quality methodology, advanced-set credit, benchmark bands, eligibility, contribution semantics, reporting semantics, and versioning |
| 19.3 | **DONE** | Complete exercise-to-muscle contribution matrix with direct/indirect credit, eligibility, confidence, and rationale |
| 19.3A | **DONE** | Exercise Catalogue Expansion II — aggressively expand useful missing exercises, especially dumbbell movements, then refresh and revalidate the complete muscle-volume matrix |
| 19.4 | **DONE** | Versioned database foundation for methodology, mappings, benchmarks, RLS, and tests |
| 19.5 | **DONE** | Versioned personalized set-stimulus/effective-volume calculation and authenticated rolling 7/28-day read model |
| 19.6 | **DONE** | TypeScript models and Progress service integration |
| 19.7 | **DONE** | Mobile-first Training Volume UI under Progress |
| 19.8 | **DONE** | Performance-aware volume recommendations plus actionable corrective volume plans when a muscle is below/above the appropriate target range |
| 19.9 | **DONE** | Completed weekly/monthly reports, frozen monthly source snapshots, downloadable monthly PDF, retention/capacity validation, hosted end-to-end proof, documentation, and Phase 19 production release |

### Phase 19.0–19.1 locked catalogue rules

- **Muscle group is the only exercise-picker sorting/filtering taxonomy.**
- Do not add new picker categories or equipment hierarchies.
- Exercise/equipment type is metadata only; existing broad schema values are reused.
- BB, DB, Smith, Cable, Machine, and Bodyweight distinctions may be represented in exercise naming/metadata without becoming picker sections.
- Plate-loaded, selectorized, lever, converging, manufacturer, or brand distinctions do not become categories.
- Brand-specific duplicates are avoided; aliases capture common alternate names where useful.
- Add exercises for useful real-world commercial-gym coverage, not to meet an arbitrary catalogue-size target.
- Phase 19.1 deployed only high-confidence normalization. Ambiguous cases such as adductor taxonomy, back-extension family primary-muscle conventions, generic-vs-equipment-specific curl/extension naming, Machine Chest Fly vs Pec Deck, and assisted Pull-Up/Dip measurement semantics remain intentionally unresolved rather than guessed.
- Muscle contribution metadata is deferred until Phase 19.3 after the catalogue audit and methodology lock.

### Phase 19.2 locked volume-intelligence architecture

The authoritative methodology is `muscle-volume-v1`; full formulas and evidence live in [`DOMAIN-RULES.md`](DOMAIN-RULES.md).

- Primary muscle group remains the exercise browsing/sorting taxonomy; it is not the secondary-muscle scoring engine.
- Phase 19 uses **set-stimulus equivalents** internally and presents muscle-group totals as **effective sets**. This is analytics, not XP.
- A completed `WORKING` label alone does not guarantee full volume credit.
- For established weighted-exercise history, Top Set compares the set's Epley-derived performance index against the user's **pre-workout recent personal baseline**. This is a set-quality proxy, **not factual RIR**.
- Personalized baseline rules use only prior workouts, a 180-day primary window, and confidence based on prior-session coverage. Future performances must never rewrite an earlier set's baseline.
- Full/partial/minimal personalized set-quality tiers are `1.0`, `0.5`, and `0` using `>=0.90`, `0.80–<0.90`, and `<0.80` baseline-relative performance bands.
- A one-repetition set is capped at `0.5` in v1. Explicit completed Failure sets with at least 2 reps receive `1.0` because the user supplied stronger effort evidence.
- New/sparse-history users receive provisional credit plus low confidence rather than a fabricated personalized estimate.
- Pyramids score each completed stage independently through the set-quality layer; a Pyramid remains one logical set for Phase 18 history/workflow/XP semantics.
- Drop Sets score the first stage through normal set quality, then apply fatigue-aware fractional continuation credit: `first_stage_credit × min(1 + 0.5 × valid_continuations, 2.0)`.
- A valid Drop continuation has at least 2 reps and a lower load than the immediately preceding stage. Extra segments beyond the cap still count toward raw reps/tonnage.
- Supersets receive no volume bonus or penalty.
- Raw repetitions and tonnage/volume-load remain descriptive workload metrics; they are not linearly converted into hypertrophy credit.
- Exercise-to-muscle mappings are independent of `primary_muscle_group`: direct contribution `1.0`, meaningful indirect contribution `0.5`, absent/insignificant `0`. Multiple muscles may receive direct `1.0` credit when justified.
- `WEIGHT_REPS` and plain `BODYWEIGHT_REPS` are eligible only after Phase 19.3 mapping approval. `DURATION`, `OTHER`, assisted, and special-mode movements require explicit review rather than automatic inclusion.
- General muscle benchmark bands are applied to combined direct + fractional indirect effective sets. `HIGH_REVIEW` is a context/review state, not an automatic claim of excessive training.
- Rolling 7-day and 28-day analytics are live views; completed weekly/monthly reports are distinct completed-period products.
- Report payloads must return methodology version plus set-quality confidence coverage so later recommendations can refuse to overstate conclusions when too much volume is provisional.
- Contribution mappings, set-credit rules, baseline rules, benchmark bands, and calculations are methodology-versioned so future revisions do not silently change frozen historical reports.

### Phase 19.2 benchmark bands

| Muscle group | 7-day target effective sets | High-review above |
|---|---:|---:|
| Chest | 10–18 | 20 |
| Back | 12–20 | 22 |
| Shoulders | 10–16 | 18 |
| Biceps | 10–16 | 18 |
| Triceps | 12–20 | 22 |
| Quads | 12–18 | 20 |
| Hamstrings | 10–16 | 18 |
| Glutes | 10–16 | 18 |
| Calves | 10–16 | 18 |
| Forearms / Grip | 6–12 | 14 |
| Core | 6–12 | 14 |
| Obliques | 4–10 | 12 |
| Neck | 6–9 | 10 |

The 28-day v1 bands are exactly `4 ×` the weekly values. Muscle-specific confidence varies; the detailed confidence labels and status semantics are defined in `DOMAIN-RULES.md`.

### Phase 19.3 locked contribution matrix

- The reviewed source artifact is `supabase/release/phase19-3-exercise-muscle-matrix.json`.
- The Phase 19.3 catalogue snapshot contains **406 active canonical exercises**: **276 volume-eligible** in `muscle-volume-v1` and **130 explicitly excluded/deferred**.
- Every eligible exercise has at least one `DIRECT` (`1.0`) contribution. Meaningful secondary work uses `INDIRECT` (`0.5`). Contribution weights do not need to sum to `1.0` across an exercise.
- `primary_muscle_group` remains picker/browsing taxonomy only. Phase 19.4 must persist the reviewed matrix rather than infer contributions from the primary category or exercise name.
- `DURATION` and `OTHER` exercises remain excluded in v1 because no compatible set-stimulus calibration is locked for those measurement types.
- `FULL_BODY` catalogue movements are excluded in v1 because the personalized Epley/bodyweight set-quality model is not calibrated for mixed ballistic/whole-body work.
- Hip-adduction movements are excluded because adductors are not a reportable v1 muscle group; tibialis raises are excluded because tibialis anterior must not be mislabeled as calf volume.
- Rotator-cuff/scapular-control, mobility-dominant, and push-press power patterns that would distort the benchmark model are explicitly excluded rather than forced into a misleading muscle total.
- Each row carries mapping confidence, a review flag, set-quality mode, and rationale. Review flags preserve technique-sensitive or deferred cases without silently guessing.
- The matrix validator must remain green before Phase 19.4 consumes the artifact. Phase 19.4 may normalize the matrix into versioned relational rows, but it must not silently alter the reviewed Phase 19.3 semantics.

### Phase 19.3A locked expansion

- Expand the catalogue before Phase 19.4 so the database foundation is generated from the final reviewed exercise set rather than immediately becoming stale.
- Primary emphasis is missing **dumbbell** coverage while preserving the existing muscle-group-only picker taxonomy and existing equipment/workout-type metadata model.
- Phase 19.3A adds **58 dumbbell exercises**, taking the active catalogue from **406 to 464** and active dumbbell coverage from **35 to 93**.
- **50** new dumbbell resistance exercises are explicitly mapped into `muscle-volume-v1`; **8 FULL_BODY dumbbell ballistic/whole-body patterns** are added to the catalogue but remain explicitly excluded from v1 effective-volume calculations.
- The existing `supabase/release/phase19-3-exercise-muscle-matrix.json` remains the single reviewed source matrix and is refreshed to **464 total / 326 eligible / 138 excluded-deferred** rather than creating a parallel mapping source.
- No new picker categories, equipment hierarchies, or reportable muscle groups are introduced.
- Phase 19.4 must not begin until the expanded catalogue, refreshed matrix, catalogue tests, and matrix validator are all green.

### Phase 19.9 completion checkpoint

Phase 19.9 is complete and released as part of Top Set v1.1.0.

Implemented and validated in the current repository/hosted project:

- exact completed-period weekly/monthly report source through `get_my_completed_training_report_period`;
- idempotent frozen monthly source snapshots with structured parent, muscle, and performance rows plus a verified source fingerprint;
- hardened authenticated snapshot/RLS boundaries and pgTAP coverage;
- TypeScript completed-report model with monthly normalization, performance-aware recommendations, and bounded next-7-day corrective plans;
- `/progress/reports` Week/Month navigation and decision-focused report presentation;
- real monthly `pdf-lib` generation with pagination/stress coverage and methodology/report-version footers;
- deterministic development-only synthetic report QA;
- a true hosted disposable-account E2E proof from workout rows through frozen source, report model, UI, and PDF;
- reconciled checked-in Supabase generated TypeScript types for the report tables/RPCs;
- private `monthly-training-reports` Storage with one retained verified PDF artifact per user, short-lived signed download URLs, candidate integrity verification, previous-artifact preservation until successful promotion, and retry-safe cleanup;
- hosted reuse proof showing two downloads of the same completed month leave one retained artifact row and one Storage object;
- Phase 19.9 capacity/retention measurement and security hardening documented in [`PHASE19-CAPACITY-VALIDATION.md`](PHASE19-CAPACITY-VALIDATION.md);
- report PDF privileged mutation logic moved behind non-exposed `report_private` SECURITY DEFINER helpers with public SECURITY INVOKER wrappers;
- redundant monthly-source user/period index removed after verifying the unique user/month index serves the same lookup.

Final release validation completed:

- canonical local validation was green before release closeout;
- the normal Playwright browser suite was green;
- the Reports-specific browser regression passed across desktop Chromium, Android-class Chromium, and iPhone-class WebKit;
- the Reports responsive visual audit passed all 36 targeted viewports/breakpoints;
- hosted Phase 19.9B, 19.9C, and 19.9D pgTAP suites passed;
- final hosted migration history and report-specific Security Advisor state were verified;
- provider Usage-page capacity confirmation is recorded in [`PHASE19-CAPACITY-VALIDATION.md`](PHASE19-CAPACITY-VALIDATION.md).

Capacity validation does **not** justify destructive workout-history cleanup. Long-term structured snapshots and latest-only PDF retention remain the Phase 19 contract.
### Phase 19.9 locked reporting and retention plan

This is the shipped Phase 19 release contract.

- **In-app delivery is the primary report surface.** Training Volume remains available under Progress with live rolling 7-day and 28-day views.
- Weekly reporting summarizes a completed weekly period and compares it with the previous comparable period where sufficient data exists.
- Monthly and weekly reporting must include an **actionable corrective plan** when volume is meaningfully below or above the applicable target range. The plan should quantify the approximate effective-set adjustment, prefer exercises compatible with the user's established history/equipment, and must account for confidence and performance trend rather than reacting mechanically to a threshold.
- Each completed month produces a **frozen monthly training snapshot** before report rendering so the report remains historically stable even if mappings, benchmarks, or recommendation logic change later.
- Each user receives an in-app monthly report with a **view/download PDF** action.
- The monthly PDF is stored privately and exposed only through an authenticated/short-lived access path.
- **Only the latest monthly PDF is retained per user.** A prior PDF is deleted only after the replacement snapshot and PDF have both been generated and verified successfully.
- Deleting/replacing a PDF must never delete the user's underlying workout history.
- Compact structured monthly snapshots are retained long-term so Top Set can support historical trends without retaining an unlimited number of PDF artifacts.
- Monthly snapshots preserve the minimum useful historical intelligence, including workout count, active training time, completed working sets, relevant volume totals, PR/performance summary, muscle-volume totals, methodology version, and the confidence/benchmark inputs needed by the frozen report source.
- Ephemeral and operational records that no longer provide product value should use short, table-appropriate retention schedules rather than accumulate indefinitely.
- Detailed raw workout data may become eligible for future compaction/archival after a **conservative initial target of approximately 24 months**, but only after the archival contract is defined and a verified historical snapshot exists. Phase 19.9 must not introduce destructive workout-history cleanup until dependencies and restore/history requirements are proven safe.
- Archival eligibility must require, at minimum: age beyond the approved retention period, a successfully generated/verified snapshot, no unresolved dependency on the raw rows, and validation that retained aggregates are sufficient for supported historical features.
- Production validation includes Supabase capacity health: database/table size growth, database egress, Storage usage, Realtime usage, Edge Function usage where applicable, and query performance.
- Capacity measurements should be used to establish real per-active-user growth/egress rates before any aggressive retention tuning.
- Report generation/replacement and retention jobs must be retry-safe and must preserve the previous valid artifact when a new generation attempt fails.

## Phase 20 — Personalized Training Programs

| Phase | Status | Goal |
|---|---|---|
| 20.0 | **DONE** | Personalized-program specification, safety boundaries, four-week `training-program-v1` structure, source-snapshot rules, and persistence responsibilities |
| 20.1 | **DONE** | Equipment/access profile â€” explicit commercial-gym vs custom/home access, persisted equipment taxonomy, RLS/RPC mutation boundary, Settings editor, and 568/512 generator-loggability audit |
| 20.2 | **IN VALIDATION** | Deterministic four-week generator using persisted goal/frequency, explicit equipment resolution, established same-exercise history, and Phase 19 volume/performance inputs; hosted DB validation pending |
| 20.3 | **PLANNED** | Exercise exclusion and intelligent substitution flow for unavailable equipment, physical limitations/injury restrictions, and user preference without making medical-safety claims |
| 20.4 | **PLANNED** | Persist generated monthly programs in-app as structured workout templates/presets that can launch into the normal workout flow |
| 20.5 | **PLANNED** | Adaptive progression across the month using completed-workout and performance feedback |
| 20.6 | **PLANNED** | Program UI plus optional downloadable PDF export; the in-app structured program remains authoritative |
| 20.7 | **PLANNED** | Regression, safety/quality validation, documentation, and production release |

Phase 20 consumes Phase 19 intelligence rather than duplicating it. Program generation should use the user's goals, schedule, equipment, established exercise history/E1RM confidence, recent performance, and muscle-volume status. A generated exercise can be marked unavailable and replaced with a compatible alternative that preserves program intent as closely as possible. Injury/physical-limitation input is treated as an exclusion constraint, not a diagnosis or claim that a substitute is medically safe.

## Phase 21 — Native architecture

| Phase | Status | Goal |
|---|---|---|
| 21.0 | **PLANNED** | Capacitor-first native architecture proof of concept |
| 21.1 | **PLANNED** | Supported iOS/Android native shell around the existing React product |
| 21.2 | **PLANNED** | Narrow native workout-state bridge, Superset-aware from day one |
| 21.3 | **PLANNED** | Native lifecycle hardening across lock/background/reopen/network/update cases |

The PWA remains independently deployable. Native work must not fork product rules or make native code authoritative for workout/scoring state.

## Phase 22 — Live workout surfaces

| Phase | Status | Goal |
|---|---|---|
| 22.1 | **PLANNED** | Display-focused iPhone Live Activity / Dynamic Island surface |
| 22.2 | **PLANNED** | Android ongoing/live workout surface using the same native bridge |
| 22.3 | **OPTIONAL** | Idempotent interactive lock-screen workout controls after passive surfaces are stable |

## Execution order

**PWA release complete → exercise catalogue expansion → catalogue audit → volume methodology lock → exercise-to-muscle contribution matrix → dumbbell-heavy catalogue expansion + matrix refresh → database foundation → personalized effective-volume engine → Progress integration → Training Volume UI → performance-aware recommendations/corrective actions → weekly/monthly reports + frozen monthly source + corrective PDF → hosted end-to-end proof + generated-type reconciliation + PDF retention/capacity validation → Phase 19 production release → personalized monthly-program foundation → equipment/access profile → program generator → exclusions/substitutions → in-app program persistence/adaptation + optional PDF → personalized-program release → Capacitor proof → native shell → native workout bridge → native lifecycle hardening → iPhone Live Activity → Android live surface → optional interactive controls.**

Engineering/delivery rules live in [`../CONTRIBUTING.md`](../CONTRIBUTING.md); validation rules live in [`CI-VALIDATION.md`](CI-VALIDATION.md).
