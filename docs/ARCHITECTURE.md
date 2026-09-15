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

The planned data flow is:

```text
completed workout data
        ↓
variant-aware set-stimulus equivalence
        ↓
versioned exercise → muscle contribution mapping
        ↓
effective sets per muscle group
        ↓
rolling 7/28-day read model
        ↓
weekly/monthly reports + frozen monthly snapshots
```

The initial methodology contract is defined in [`DOMAIN-RULES.md`](DOMAIN-RULES.md). In summary:

- standard completed Working and Failure sets contribute `1.0` set-stimulus equivalent;
- warmups, incomplete work, and cancelled/non-completed-session work contribute `0`;
- each completed Pyramid stage contributes `1.0` set-stimulus equivalent for muscle-volume analytics even though the Pyramid remains one logical parent set for Phase 18 workflow/history/XP semantics;
- a Drop Set contributes `1.0` for the first eligible stage plus `0.5` for each valid lower-load continuation stage, capped at `2.0` in methodology v1;
- Supersets receive no extra volume multiplier or penalty; their underlying eligible work is evaluated normally;
- raw repetitions and tonnage/volume-load remain descriptive workload measures and are not linearly converted into effective hypertrophy sets;
- Phase 19 v1 does not infer RIR/RPE from reps and load.

Exercise-to-muscle mappings remain independent from `exercise_catalog.primary_muscle_group`. The picker can continue sorting by one primary muscle while the volume engine attributes direct and meaningful indirect work to multiple reportable muscles.

The browser should not independently recompute authoritative muscle-volume methodology from raw rows. Versioned server-side/database read boundaries should produce the report model, including the methodology version, so clients render one consistent interpretation and future methodology changes do not silently rewrite historical meaning.

Frozen monthly snapshots retain the methodology version used when the report was produced. Later evidence-based revisions can therefore coexist with historical reports rather than retroactively mutating them.

## Groups and social features

Group membership is optional and many-to-many. The application must not assume a user belongs to exactly one group or that a group has a fixed member count.

Group roles/permissions are enforced server-side. Competition, social activity, chat, invitations, and administrator actions use purpose-built guarded data boundaries instead of weakening raw-table access for convenience.

## Authentication, administration, and secrets

Supabase Auth provides identity/session infrastructure. Authorization is re-checked by server/database boundaries; client navigation is never an authorization boundary.

Privileged credentials are server-only. Anything compiled through a `VITE_*` variable is public browser configuration.

Platform administration/moderation uses bounded RPC/Edge Function surfaces and must not expose raw Auth secrets, service credentials, unrestricted session data, or unrelated user data.

## Storage

Profile image bytes live in Supabase Storage; the profile stores the object path/reference. Replacement/removal must clean up obsolete owned objects instead of accumulating abandoned profile images.

Phase 19.9 adds private monthly report artifacts. Only the current monthly PDF is retained per user; replacement must be verified before the prior PDF is deleted. Compact structured monthly snapshots remain the long-term historical record rather than an unlimited PDF archive.

## UI and CSS

See [`UI-ARCHITECTURE.md`](UI-ARCHITECTURE.md) and [`CSS-ARCHITECTURE.md`](CSS-ARCHITECTURE.md). Mobile composition is primary; desktop is an intentional adaptation rather than the source layout.

## Future native boundary

Phase 20 investigates a Capacitor-based native shell without rewriting Top Set in Swift/Kotlin. React/Supabase remains authoritative. Native integrations will consume a narrow explicit workout-state bridge rather than reaching arbitrarily into React state.

Nothing in current PWA architecture depends on Phase 21 Live Activities/live workout surfaces.
