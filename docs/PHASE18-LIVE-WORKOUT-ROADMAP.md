# Phase 18 — Live Lifting Workflow Roadmap

Status: **IN PROGRESS**

Phase 18 builds richer active-lift behavior on the existing durable workout, scoring, recovery, and PWA foundations. Superset structure does not create bonus XP or alternate scoring rules.

- **18.0 Active timer/header — DONE:** compact sticky active-lift timer with session metadata in normal document flow.
- **18.1 Collapsible sets — DONE:** completed sets collapse to dense summaries while remaining reopenable/editable.
- **18.2 Superset foundation — DONE:** nullable Superset membership/order metadata, recovery-safe snapshots, and database constraints.
- **18.3 Superset builder — DONE:** create/manage/break Supersets through revision-safe queued workout mutations; grouped exercises share one visual Superset card.
- **18.4 Active Superset flow — IN PROGRESS:** derive A1/A2/A3 round-robin guidance from existing sets, show live completion progress, highlight the next member, and offer an optional one-tap jump without forcing navigation.
- **18.5 Superset recovery:** prove grouped structure and active-flow state remain coherent through refresh, offline recovery, queued mutations, and conflict resolution.
- **18.6 Superset history:** preserve and display completed Superset structure in workout history without altering exercise progress attribution.
- **18.7 Superset presets:** allow preset workout starts to preserve intentional Superset structure.
- **18.7A Drop Sets:** add deliberate Drop Set creation/editing on top of the existing set model, preserving normal exercise progress/scoring boundaries and recovery semantics.
- **18.8 Mobile polish:** final narrow-screen interaction, touch-target, hierarchy, and containment pass for live lifting workflows.
- **18.9 Regression/release:** complete unit/integration/E2E/database gates and release validation for Phase 18.

## Set-structure decision

**Drop Sets are locked into 18.7A.** There is no separate Pyramid Set feature. Top Set already lets the user edit weight and reps independently on every set, which naturally supports ascending and descending pyramid training without a new persistence or UI concept.

After Phase 18, Phase 19 investigates native architecture and Phase 20 adds platform-native live workout surfaces where supported.
