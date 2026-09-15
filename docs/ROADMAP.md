# Top Set Development Roadmap

Status: **Phase 19 in progress**

This document is the canonical milestone index. Detailed historical implementation records live in the corresponding `PHASE*.md` files.

## Completed foundations — Phases 0–18

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
| 19.1 | **IN PROGRESS** | Exercise Catalogue Audit — normalize names, aliases, measurement types, primary muscles, and duplicates |
| 19.2 | **PLANNED** | Volume Intelligence specification lock — evidence-backed effective-set methodology, standard/failure/drop/pyramid credit, benchmarks, eligibility, contribution semantics, report semantics, and methodology version |
| 19.3 | **PLANNED** | Complete exercise-to-muscle contribution matrix with direct/indirect credit |
| 19.4 | **PLANNED** | Versioned database foundation for methodology, mappings, benchmarks, RLS, and tests |
| 19.5 | **PLANNED** | Versioned set-stimulus/effective-volume calculation and authenticated rolling 7/28-day read model |
| 19.6 | **PLANNED** | TypeScript models and Progress service integration |
| 19.7 | **PLANNED** | Mobile-first Training Volume UI under Progress |
| 19.8 | **PLANNED** | Performance-aware volume recommendations using existing progression signals |
| 19.9 | **PLANNED** | Weekly/monthly reporting, downloadable monthly PDF, data lifecycle/retention, capacity validation, regression, documentation, and production release |

### Phase 19.0 locked catalogue rules

- **Muscle group is the only exercise-picker sorting/filtering taxonomy.**
- Do not add new picker categories or equipment hierarchies.
- Exercise/equipment type is metadata only; existing broad schema values are reused.
- BB, DB, Smith, Cable, Machine, and Bodyweight distinctions may be represented in exercise naming/metadata without becoming picker sections.
- Plate-loaded, selectorized, lever, converging, manufacturer, or brand distinctions do not become categories.
- Brand-specific duplicates are avoided; aliases capture common alternate names where useful.
- Add exercises for useful real-world commercial-gym coverage, not to meet an arbitrary catalogue-size target.
- Muscle contribution metadata is deferred until Phase 19.3 after the catalogue audit and methodology lock.

### Locked volume-intelligence architecture

- Primary muscle group remains the exercise browsing/sorting taxonomy; it is not the secondary-muscle scoring engine.
- Phase 19 uses **set-stimulus equivalents** internally and presents muscle-group totals as **effective sets**. This is analytics, not XP.
- Exercise-to-muscle contributions are modeled independently so one exercise can contribute to multiple reportable muscle groups.
- Direct muscle contribution uses `1.0`; meaningful indirect/secondary contribution uses `0.5` in the v1 methodology.
- A completed standard `WORKING` set contributes `1.0` set-stimulus equivalent. A completed standard `FAILURE` set also contributes `1.0`; failure receives no automatic hypertrophy bonus.
- Warmups, incomplete work, and work from cancelled/non-completed sessions contribute `0` effective sets.
- **Pyramids:** each completed Pyramid stage contributes `1.0` set-stimulus equivalent for muscle-volume analytics. The Pyramid still remains one logical parent set for the existing Phase 18 workflow/history/XP contract.
- **Drop Sets:** the first eligible stage contributes `1.0`; each subsequent positive-rep stage that reduces load from the immediately preceding stage contributes `0.5`; a logical Drop Set is capped at `2.0` set-stimulus equivalents in v1. This is a conservative, methodology-versioned Top Set calibration because current Drop Set research supports the method's effectiveness but does not establish a universal stage-to-straight-set conversion.
- Supersets receive no volume bonus or penalty; the underlying sets are scored normally for their exercises.
- Raw repetitions and tonnage/volume-load remain valuable descriptive workload metrics but are **not linearly converted into hypertrophy/effective-set credit**. A set with twice the reps or load is not automatically worth twice the muscle-volume score.
- Phase 19 v1 does not fabricate RIR/RPE from reps and load. A future methodology may use explicit effort data if Top Set captures it reliably.
- `WEIGHT_REPS` and `BODYWEIGHT_REPS` resistance exercises may be volume-eligible after contribution review; `DURATION` and `OTHER` require explicit inclusion/exclusion.
- Contribution mappings, set-credit rules, benchmarks, and calculations are methodology-versioned so future evidence-based changes can be introduced without silently changing the meaning of historical reports.
- Rolling 7-day and 28-day analytics are live views of current training status; completed-period weekly/monthly reports are a separate reporting concept.
- The detailed research basis and formula contract live in [`DOMAIN-RULES.md`](DOMAIN-RULES.md); Phase 19 implementation must not substitute a raw-rep or raw-tonnage formula for that contract.

### Phase 19.9 locked reporting and retention plan

- **In-app delivery is the primary report surface.** Training Volume remains available under Progress with live rolling 7-day and 28-day views.
- Weekly reporting summarizes a completed weekly period and compares it with the previous comparable period where sufficient data exists.
- Each completed month produces a **frozen monthly training snapshot** before report rendering so the report remains historically stable even if mappings, benchmarks, or recommendation logic change later.
- Each user receives an in-app monthly report with a **view/download PDF** action.
- The monthly PDF is stored privately and exposed only through an authenticated/short-lived access path.
- **Only the latest monthly PDF is retained per user.** A prior PDF is deleted only after the replacement snapshot and PDF have both been generated and verified successfully.
- Deleting/replacing a PDF must never delete the user's underlying workout history.
- Compact structured monthly snapshots are retained long-term so Top Set can support historical trends without retaining an unlimited number of PDF artifacts.
- Monthly snapshots should preserve the minimum useful historical intelligence, including workout count, active training time, completed working sets, relevant volume totals, PR/performance summary, muscle-volume totals, methodology version, and other fields approved during implementation.
- Ephemeral and operational records that no longer provide product value should use short, table-appropriate retention schedules rather than accumulate indefinitely.
- Detailed raw workout data may become eligible for future compaction/archival after a **conservative initial target of approximately 24 months**, but only after the archival contract is defined and a verified historical snapshot exists. Phase 19.9 must not introduce destructive workout-history cleanup until dependencies and restore/history requirements are proven safe.
- Archival eligibility must require, at minimum: age beyond the approved retention period, a successfully generated/verified snapshot, no unresolved dependency on the raw rows, and validation that retained aggregates are sufficient for supported historical features.
- Production validation includes Supabase capacity health: database/table size growth, database egress, Storage usage, Realtime usage, Edge Function usage where applicable, and query performance.
- Capacity measurements should be used to establish real per-active-user growth/egress rates before any aggressive retention tuning.
- Report generation/replacement and retention jobs must be retry-safe and must preserve the previous valid artifact when a new generation attempt fails.

## Phase 20 — Native architecture

| Phase | Status | Goal |
|---|---|---|
| 20.0 | **PLANNED** | Capacitor-first native architecture proof of concept |
| 20.1 | **PLANNED** | Supported iOS/Android native shell around the existing React product |
| 20.2 | **PLANNED** | Narrow native workout-state bridge, Superset-aware from day one |
| 20.3 | **PLANNED** | Native lifecycle hardening across lock/background/reopen/network/update cases |

The PWA remains independently deployable. Native work must not fork product rules or make native code authoritative for workout/scoring state.

## Phase 21 — Live workout surfaces

| Phase | Status | Goal |
|---|---|---|
| 21.1 | **PLANNED** | Display-focused iPhone Live Activity / Dynamic Island surface |
| 21.2 | **PLANNED** | Android ongoing/live workout surface using the same native bridge |
| 21.3 | **OPTIONAL** | Idempotent interactive lock-screen workout controls after passive surfaces are stable |

## Execution order

**PWA release complete → exercise catalogue expansion → catalogue audit → lock evidence-backed set-stimulus/muscle-volume methodology + report semantics → contribution matrix → database foundation → effective-volume engine → Progress integration → Training Volume UI → performance-aware recommendations → weekly/monthly reports + retention/capacity validation → production release → Capacitor proof → native shell → native workout bridge → native lifecycle hardening → iPhone Live Activity → Android live surface → optional interactive controls.**

Engineering/delivery rules live in [`../CONTRIBUTING.md`](../CONTRIBUTING.md); validation rules live in [`CI-VALIDATION.md`](CI-VALIDATION.md).
