# Top Set Development Roadmap

Status: **Phase 18 in progress**

This document is the canonical milestone index. Detailed historical implementation records live in the corresponding `PHASE*.md` files. The active Phase 18 → native plan is expanded in [`PHASE18-LIVE-WORKOUT-ROADMAP.md`](PHASE18-LIVE-WORKOUT-ROADMAP.md).

## Completed foundations — Phases 0–17

Top Set has completed the major foundations needed for the current live-workout work:

- lifting-first `lifting-v1` domain and authoritative scoring;
- React/Vite/TypeScript PWA foundation;
- Supabase Auth, profiles, groups, invitations, Storage, RLS/RPC security, moderation, messaging, and administrator tooling;
- durable lifting sessions, set logging, IndexedDB recovery, idempotent mutations, conflict handling, progression/history, badges, cardio accessory logging, presets, competition, and social features;
- mobile-first application composition and responsive browser coverage;
- Netlify hosting/auth/release hardening and production-oriented validation guardrails.

Historical details remain in the phase records and `CHANGELOG.md`. They are not duplicated here.

## Phase 18 — Live lifting workflow

| Phase | Status | Goal |
|---|---|---|
| 18.0 | **DONE** | Compact sticky active-workout timer/header |
| 18.1 | **DONE** | Collapsible completed sets |
| 18.2 | **DONE** | Superset data model/foundation |
| 18.3 | **DONE** | Revision-safe Superset builder/mutations |
| 18.4 | **DONE** | Active round-robin Superset guidance; full validation passed |
| 18.5 | **NEXT** | Superset recovery and reliability across refresh/offline/replay/conflicts |
| 18.6 | **PLANNED** | Preserve Superset structure in completed-workout history |
| 18.7 | **PLANNED** | Preserve Superset structure in preset workouts |
| 18.7B | **PLANNED** | User-selected tracked-exercise analytics + exercise-picker Recent refinement |
| 18.8 | **PLANNED** | Full active-workout mobile polish/density pass |
| 18.9 | **PLANNED** | Full PWA regression and production release checkpoint |

Drop Sets are deferred and are not on the current critical path. Pyramid training does not require a dedicated set type because each set already stores independent weight and rep values.

### Phase 18.7B locked additions

- A user can choose **Track in analytics** for an exercise before completing it.
- Tracking is an idempotent user preference layered over normal workout data.
- A user can later untrack/re-track an exercise without deleting workout history, sets, PR evidence, or underlying performance data.
- In the exercise picker, **Recent exercises appear below the body-part selector**.
- Recent exercises are collapsible and start **collapsed by default**.

## Phase 19 — Native architecture

| Phase | Status | Goal |
|---|---|---|
| 19.0 | **PLANNED** | Capacitor-first native architecture proof of concept |
| 19.1 | **PLANNED** | Supported iOS/Android native shell around the existing React product |
| 19.2 | **PLANNED** | Narrow native workout-state bridge, Superset-aware from day one |
| 19.3 | **PLANNED** | Native lifecycle hardening across lock/background/reopen/network/update cases |

The PWA remains independently deployable. Native work must not fork product rules or make native code authoritative for workout/scoring state.

## Phase 20 — Live workout surfaces

| Phase | Status | Goal |
|---|---|---|
| 20.1 | **PLANNED** | Display-focused iPhone Live Activity / Dynamic Island surface |
| 20.2 | **PLANNED** | Android ongoing/live workout surface using the same native bridge |
| 20.3 | **OPTIONAL** | Idempotent interactive lock-screen workout controls after passive surfaces are stable |

## Execution order

**Compact timer → collapsible sets → Superset foundation → Superset builder → active Superset flow → recovery → history → presets → tracked-exercise analytics/picker refinement → mobile workout polish → PWA regression/release → Capacitor proof → native shell → native workout bridge → native lifecycle hardening → iPhone Live Activity → Android live surface → optional interactive controls.**

Engineering/delivery rules live in [`../CONTRIBUTING.md`](../CONTRIBUTING.md); validation rules live in [`CI-VALIDATION.md`](CI-VALIDATION.md).
