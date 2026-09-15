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
- Advanced stages contribute to normal lifting volume, while the logical parent counts once for completed-working-set semantics.
- Advanced stages must survive recovery/offline replay and completed-workout history without being flattened.

### Locked selective-analytics contract

- Track in analytics controls only whether an exercise appears in E1RM and other in-depth per-exercise analytics surfaces.
- Untracked exercises still count fully toward workout/session volume, aggregate volume, history, scoring/XP, and retained PR evidence.
- Tracking is a non-destructive user preference.

## Phase 19 — Muscle Volume Intelligence

| Phase | Status | Goal |
|---|---|---|
| 19.0 | **IN PROGRESS** | Exercise Catalogue Expansion — add useful common commercial-gym exercises, especially machines, without adding new picker categories |
| 19.1 | **PLANNED** | Exercise Catalogue Audit — normalize names, aliases, measurement types, primary muscles, and duplicates |
| 19.2 | **PLANNED** | Volume Intelligence specification lock — benchmarks, eligibility, set-credit rules, methodology version |
| 19.3 | **PLANNED** | Complete exercise-to-muscle contribution matrix with direct/indirect credit |
| 19.4 | **PLANNED** | Versioned database foundation for methodology, mappings, benchmarks, RLS, and tests |
| 19.5 | **PLANNED** | Effective-volume calculation/read model for authenticated rolling 7/28-day reports |
| 19.6 | **PLANNED** | TypeScript models and Progress service integration |
| 19.7 | **PLANNED** | Mobile-first Training Volume UI under Progress |
| 19.8 | **PLANNED** | Performance-aware volume recommendations using existing progression signals |
| 19.9 | **PLANNED** | Weekly/28-day reports, regression, documentation, and production release |

### Phase 19.0 locked catalogue rules

- **Muscle group is the only exercise-picker sorting/filtering taxonomy.**
- Do not add new picker categories or equipment hierarchies.
- Exercise/equipment type is metadata only; existing broad schema values are reused.
- BB, DB, Smith, Cable, Machine, and Bodyweight distinctions may be represented in exercise naming/metadata without becoming picker sections.
- Plate-loaded, selectorized, lever, converging, manufacturer, or brand distinctions do not become categories.
- Brand-specific duplicates are avoided; aliases capture common alternate names where useful.
- Add exercises for useful real-world commercial-gym coverage, not to meet an arbitrary catalogue-size target.
- Muscle contribution metadata is deferred until Phase 19.3 after the catalogue audit and methodology lock.

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

**PWA release complete → exercise catalogue expansion → catalogue audit → lock volume methodology → contribution matrix → database foundation → effective-volume engine → Progress integration → Training Volume UI → performance-aware recommendations → volume reports/release → Capacitor proof → native shell → native workout bridge → native lifecycle hardening → iPhone Live Activity → Android live surface → optional interactive controls.**

Engineering/delivery rules live in [`../CONTRIBUTING.md`](../CONTRIBUTING.md); validation rules live in [`CI-VALIDATION.md`](CI-VALIDATION.md).
