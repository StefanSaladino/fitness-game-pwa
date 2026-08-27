# Detailed Development Roadmap

Status legend: **DONE**, **IN PROGRESS**, **NEXT**, **LATER**.

## Product-wide UI implementation gate — REQUIRED

Before implementing any substantial user-facing screen or redesign:

1. define the screen's purpose, states, data, and actions without styling it;
2. generate concept images for the relevant form factors (phone first; desktop and native watch when relevant);
3. review/revise the visual direction with the product owner;
4. document responsive behavior and component boundaries;
5. implement only after the visual direction is approved;
6. validate accessibility, loading/error/empty states, responsive behavior, and browser behavior.

UI separation rules:

- screen/page components compose features and own route-level layout only;
- feature components receive data/actions through props or focused hooks;
- hooks/controllers orchestrate state and async behavior;
- services/repositories are the only feature layer that talks directly to Supabase;
- pure validation/scoring stays framework-independent;
- shared primitives are created only after real reuse is demonstrated.

CSS separation rules are equally strict:

- `src/styles/tokens.css`, `reset.css`, and `base.css` hold application-wide concerns;
- component styles belong beside reusable components;
- feature styles belong inside that feature;
- page styles own composition only;
- new feature/component selectors must not be added to the legacy `global.css` bucket.

See `docs/UI-DEVELOPMENT-GATE.md`, `docs/UI-ARCHITECTURE.md`, and `docs/CSS-ARCHITECTURE.md`.

## Engineering execution rules — REQUIRED

These rules apply to every remaining phase, including non-visual backend/reliability work.

### Separation of concerns

- domain rules and pure calculations stay framework-independent and must not import React, Supabase, or browser APIs;
- presentation components render state and emit user intent; they do not own persistence, scoring, or cross-feature orchestration;
- focused hooks/controllers own feature state, async orchestration, optimistic UI, and recovery behavior;
- services/repositories are the only feature layer that communicates directly with Supabase;
- persistence DTOs and UI view models should be mapped at clear boundaries rather than leaking database-row shapes throughout the component tree;
- feature-specific CSS remains colocated in CSS Modules; application-wide style files remain limited to tokens/reset/base/shared utilities;
- migrations should solve one database concern at a time; historical migrations remain immutable and repairs use new migrations;
- tests should be written at the same layer as the behavior they prove: pure logic -> unit tests, components -> RTL, service contracts -> focused service tests, authorization/data invariants -> pgTAP, real flows -> integration/E2E;
- avoid god components, god hooks, and god services. If a file begins owning unrelated state, persistence, presentation, and domain rules, split the responsibility before adding more behavior.

### Small-slice delivery

- do not combine unrelated features, cleanup, schema changes, and UI redesigns into one implementation patch;
- each subphase should have one primary behavior boundary, explicit non-goals, its own tests, and a clear exit condition;
- prefer the smallest deployable/testable vertical slice over completing an entire large phase at once;
- database migration + service + hook/controller + UI + tests may ship together only when they are all required for that one vertical behavior;
- cleanup discovered during a slice should be fixed immediately only when it blocks correctness or directly touches the same boundary; otherwise add it to the roadmap as a separate slice;
- after each slice, run the relevant focused tests first, then the full project gate before advancing;
- keep checkpoint commits narrow so a regression can be bisected to one behavior change;
- when a phase is still large after decomposition, split it into lettered subphases before coding rather than creating a large patch and dividing it afterward.

## Phase 0 — Original product rules — SUPERSEDED

The original v0.2 general-fitness model (100 base XP/day + calibrated Performance XP) was implemented and tested, then intentionally superseded by the lifting-first v0.3 product direction.

The migration history remains valuable; new product behavior follows `lifting-v1`.

## Phase 1 — Domain/test oracle — DONE, UPDATED FOR v0.3

Objective: keep scoring behavior executable and independent of React/Supabase.

Current lifting-v1 oracle covers:

- lifting qualification;
- cardio-bonus eligibility;
- one 50-XP lifting-workout award/day;
- exercise-completion XP and six-exercise cap;
- weighted/bodyweight progression;
- first-observation baseline behavior;
- summed progression XP with 30/day cap;
- cardio 5/10/15 tiers with best-of-day cap;
- 125 total daily cap;
- weekly lifting consistency and completed-week streak semantics;
- fairness/anti-padding invariants.

## Phase 2 — React/PWA technical foundation — DONE

- React/TypeScript/Vite
- PWA manifest/service worker
- Vitest/RTL/Playwright
- CI shell

## Phase 3 — Repository/testing scaffold — DONE

- domain verifier
- structural validator
- GitHub Actions frontend shell
- PWA assets

## Phase 4 — Supabase data/auth foundation — DONE

Delivered:

- profiles/auth
- groups/members/invites and scalable role model
- exercise catalog
- workout sessions/exercises/sets
- original v0.2 XP/performance persistence
- weekly goal snapshots
- RLS/security boundaries
- password recovery
- pgTAP database coverage

The project currently uses a hosted-Supabase/dashboard-first migration workflow.

## Phase 5 — Onboarding + product foundation — IN PROGRESS

### 5.1 Non-visual onboarding foundation — DONE

- atomic username/display-name/timezone/weekly-target onboarding RPC
- validation/state/service contracts
- pgTAP coverage

### 5.2 Visual-design checkpoint + shared UI foundation — DONE

- approved phone, desktop, and future smartwatch directions
- responsive `AppShell`
- UI primitives and accessibility tests
- Nutrition/Calories explicitly excluded

### 5.3A Authentication + onboarding UI — DONE

- sign in/create account/recovery
- email-verification handoff
- persisted profile gate
- profile onboarding
- weekly target control
- phone/desktop responsive production flow

### 5.4 Lifting-first domain refactor — DONE

Foundational v0.3 change. The app is now a **lifting progression game**, not a general fitness consistency game.

Locked scoring:

- qualifying lifting workout: **50 XP/day max**;
- meaningful canonical exercise: **5 XP**, at least 2 working sets, max 6/day = **30 XP**;
- exercise progression: **5/10/15 XP per exercise**, summed, max **30 XP/day**;
- cardio: duration bonus **5/10/15**, best eligible activity only, max **15 XP/day**;
- total: **125 XP/day max**;
- first valid exercise performance establishes baseline and earns 0 progression XP;
- no 168-hour account gate;
- no two-observation calibration;
- no progression cooldown;
- no weekly-improvement XP;
- weekly target now means **lifting days**;
- cardio never satisfies the weekly lifting target;
- weekly consistency can drive a completed-week lifting-goal streak.

Persistence foundation:

- new `scoring_events` ledger for `lifting-v1`;
- new `exercise_progress_observations`;
- new `exercise_progress` personal-best snapshot table;
- explicit `qualifies_lifting` and `qualifies_cardio_bonus` workout flags;
- legacy v0.2 XP/performance tables retained only for safe migration history.

CSS architecture is also locked in this phase. Existing Phase 5 global selectors remain temporarily for visual stability; all new UI styling must follow colocated separation of concerns.

See `docs/DOMAIN-RULES.md` and `docs/CSS-ARCHITECTURE.md`.

### 5.5 Group setup + first real lifting dashboard — DONE

The lifting-first mobile/desktop/watch concept direction has been explored. Implementation remains componentized and follows the CSS architecture rules even where the concept art is still provisional.

#### 5.5A Non-visual group foundation — DONE

- typed multi-group summaries and member models;
- load all active groups for a user (no single-group assumption);
- scalable member counts with no four-person limit;
- create group through the existing RLS-protected insert + owner trigger;
- create owner/admin invites through existing invite RLS;
- join by raw invite UUID or invite link through `join_group_by_invite`;
- load shared-group profile identity for member lists;
- focused `useGroups`, `useCreateGroup`, and `useJoinGroup` controllers;
- user-facing group error mapping;
- no feature UI or feature CSS added in this subphase.

#### 5.5B Create / Join Group UI — DONE

- create-group form with local validation and normalized group names;
- join-by-invite form accepting raw invite UUIDs or invite URLs;
- historical behavior at delivery: authenticated group gate: zero memberships -> setup, one-or-more -> app; **superseded by Phase 15.7 optional-group entry**;
- create/join controller refreshes persisted membership before advancing;
- loading/error states and retry behavior;
- multiple-group membership remains supported;
- all new feature styling is colocated CSS Modules; no group CSS added to `global.css`.

#### 5.5C Profile pictures — DONE

Profile pictures only; this is not an avatar/customization system.

- upload, replace, and remove a profile picture;
- initials placeholder when none exists or image loading fails;
- centered square-crop presentation; manual crop positioning can be added later if needed;
- public-read Supabase Storage bucket with authenticated own-folder mutation rules;
- JPEG/PNG/WebP only and a 2 MiB stored-object cap;
- store `profile_picture_path` on the profile, not image bytes in PostgreSQL;
- group-member identity now carries the PFP path for upcoming leaderboards/activity;
- reusable `ProfilePicture` presentation with colocated CSS Modules;
- profile pictures remain cosmetic and never affect XP, rankings, or permissions.

See `docs/PHASE5.5C-PROFILE-PICTURES.md`.

#### 5.5D First real lifting dashboard — DONE

- persisted weekly lifting-day status from completed `qualifies_lifting` sessions;
- lifting-v1 weekly XP and category breakdown from `scoring_events`;
- recent completed strength sessions with duration, exercise count, and attached XP when scoring events exist;
- personal-record surfaces from `exercise_progress` plus canonical exercise names;
- weekly group leaderboard through a membership-gated read-only RPC;
- real PFP rendering for the current user and group members;
- restrained responsive presentation with flat sections and colocated CSS Modules;
- cardio remains visibly secondary inside the XP breakdown;
- no invented level formula or decorative analytics chart was introduced.

See `docs/PHASE5.5D-LIFTING-DASHBOARD.md`.

### 5.6 Group administration UI — DONE

- product-level Home / Groups navigation boundary;
- multi-group switcher without introducing a single-group assumption;
- active member list with real PFPs and role labels;
- owner/admin targeted invitation by username or stable profile invite ID;
- owner-only promote/demote and ownership-transfer controls;
- owner/admin member-removal controls matching database permissions;
- non-owner leave-group flow; owners must transfer ownership first;
- group renaming through existing RLS-protected group updates;
- explicit authenticated-only EXECUTE grants for membership-mutating RPCs;
- all new group administration styling remains colocated in CSS Modules.

#### 5.6.1 Targeted user invitations — DONE

- invite a specific user by canonical username or stable `FG-...` profile invite ID;
- each profile receives a stable invite ID that is not a reusable group secret;
- recipients see pending invitations and explicitly Accept or Decline;
- accepting creates/reactivates MEMBER membership and removes the invitation row;
- declining removes the invitation row;
- revoking removes the invitation row;
- the invite table represents pending invitations only;
- the old reusable token/URL join flow is retired from the active product.

### 5.7 Phase 5 integration validation — DONE

Historical checkpoint: the forced zero-group setup transition below was valid when Phase 5 shipped and is superseded by Phase 15.7.

- onboarding -> persisted group setup transition
- zero-group -> create -> membership refresh -> lifting dashboard
- zero-group -> recipient pending invite -> accept -> membership refresh -> lifting dashboard
- owner targeted-invite and member-promotion controls across real controllers/hooks
- member presentation excludes outgoing invite controls, preserves incoming accept/decline, and preserves leave-group access
- service-level scalable member-count coverage remains green
- pgTAP/RLS/RPC permission suites remain the authority for database authorization
- onboarding labels continue to describe lifting-day targets

## Phase 6 — Lifting workout capture engine

Objective: make logging a real lifting session fast, resilient, and progression-aware.

Apply the UI design gate before coding the workout builder.

### 6.1 Active lifting session — DONE

#### 6.1A Session lifecycle foundation — DONE

- Start Lift with idempotent create-or-resume semantics
- persisted timer with pause/resume
- finish/cancel through authenticated-only lifecycle RPCs
- active-session recovery after refresh/backgrounding
- single-active-in-app-lift database invariant
- client direct workout-session mutation removed

#### 6.1B Exercise composition — DONE

- canonical exercises attach through authenticated-only composition RPCs
- duplicate adds are idempotent per workout/canonical exercise
- reorder/remove operations preserve dense zero-based ordering
- direct browser mutation of `workout_exercises` is removed
- active workout UI renders persisted canonical exercise order and move/remove controls
- service/hook boundary is ready for the real catalog search picker

#### 6.1C Exercise picker integration — DONE

- active workout opens the real canonical exercise picker
- selected exercises attach only by canonical exercise ID
- duplicate adds remain blocked by the composition layer
- phone-first picker locks background scroll and closes with Escape

### 6.2 Exercise search — CORE DONE

- searchable expanded 356-exercise catalog
- instant case-insensitive local search
- aliases (`RDL`, `OHP`, DB / KB variants, etc.)
- conservative typo tolerance where identity remains unambiguous
- browse/group by primary muscle group
- browse/group by workout type (barbell, dumbbell, kettlebell, plyometric, etc.)
- filter one taxonomy by the other
- user-scoped recents from completed lifting workouts
- canonical IDs always remain scoring/progression identity
- favorites remain a later convenience, not a blocker for set logging

#### 6.2A Favorites — LATER

- favorite/unfavorite canonical exercises
- favorites shortcut in the picker without changing exercise identity

#### 6.1C.1 Muscle group icon integration — DONE

- replace plain-text muscle-group choices with compact icon + visible-label controls
- cover Chest, Back, Shoulders, Biceps, Triceps, Forearms/Grip, Core/Abs, Obliques, Quads, Hamstrings, Glutes, Calves, Neck, and Full Body
- keep workout-type filtering intentionally simpler and text-first (Barbell, Dumbbell, Kettlebell, Cable, Machine, Plyometric, etc.)
- phone-first responsive layout: compact 2-3 column muscle grid; desktop wraps cleanly without oversized cards
- use individual transparent assets; SVG preferred, optimized transparent PNG acceptable
- keep visual treatment restrained: no glow, decorative feature cards, or unnecessary shadow/chrome
- icons remain a picker affordance only; do not spread muscle illustrations throughout unrelated app surfaces
- exercise picker panel is fully opaque; only the outside backdrop may be translucent

#### 6.1C.2 Picker drill-down + timer synchronization — DONE

- muscle-group icons are navigation destinations, not toggle filters
- selecting a muscle group opens a dedicated exercise-library screen for that group
- the muscle-group screen can be narrowed further by workout/equipment type
- Search all exercises remains a separate top-level path across the entire canonical catalogue
- detail screens provide an explicit back arrow to return to the top-level exercise selector
- Escape returns from a detail screen before closing the picker from its top level
- workout start shows an immediate local timer while the start request is in flight
- pause freezes at the exact user click timestamp; resume begins locally at the exact user click timestamp
- intent-aware lifecycle RPCs use a narrowly bounded client action timestamp so network transport time is not counted as workout time
- intent-aware start/pause/resume RPCs return the session snapshot directly, removing the extra follow-up select round trip

### 6.3 Set tracking — DONE

- every set is stored independently; an exercise never has one shared weight/reps value for all sets
- warmup vs working sets
- per-set weight and reps (for example 135 × 10, 185 × 8, 205 × 6 in the same exercise)
- bodyweight reps and supported bodyweight loading modes
- completed set state
- add/remove sets and preserve stable set ordering
- duplicate/copy previous set conveniences without forcing copied values to stay linked
- unit display conversion without changing canonical stored units

### 6.4 Workout reliability — DONE

Phase 6.4 is intentionally split into small reliability slices. Do not implement it as one large offline/sync patch.

#### 6.4A Local active-workout recovery — DONE

Primary boundary: preserve the user's in-progress workout locally when connectivity disappears.

- define a local active-workout snapshot contract separate from Supabase row types
- persist active session, exercise order, and current set-entry state locally
- recover the local snapshot after refresh/app restart before attempting remote reconciliation
- make online/offline/recovering state explicit in the workout controller
- do not introduce a general mutation queue yet
- no scoring changes

Exit criteria: refreshing or losing connectivity during an active lift does not make the visible workout disappear.

#### 6.4B Idempotent workout mutation queue — DONE

Primary boundary: safely retry workout-capture mutations created while offline or during transient failures.

- queue only workout-capture mutations that have explicit idempotency keys
- preserve mutation order where ordering is semantically required
- retry safely after reconnect without duplicating exercises or sets
- distinguish retryable transport failures from authorization/validation failures
- keep queue persistence/orchestration separate from presentation components
- no scoring reconciliation in this slice

Exit criteria: replaying the same queued mutation more than once cannot duplicate persisted workout data.

#### 6.4C Conflict and destructive-edit safety — DONE

Primary boundary: reconcile local and remote workout state without silently overwriting newer data.

- define conflict rules for set edits, deletes, reorder operations, finish, and cancel
- prevent stale local state from resurrecting deleted data
- preserve completed/cancelled workout immutability
- surface actionable recovery UI when automatic reconciliation is unsafe
- keep destructive operations explicit and independently retryable

Exit criteria: reconnect/retry cannot silently lose newer workout data or revive intentionally removed data.

#### 6.4D Reliability integration gate — DONE

Primary boundary: prove the complete capture flow survives ordinary connectivity failures.

- integration coverage for offline -> edit -> reconnect -> reconcile
- refresh/restart recovery coverage
- duplicate retry/idempotency coverage
- finish/cancel race coverage
- browser/E2E validation for phone-first recovery states
- full project gate remains required before Phase 7

Exit criteria: an ordinary connection interruption cannot lose or duplicate a workout, exercise, or set.

## Phase 7 — Authoritative lifting-v1 scoring persistence — DONE

Objective: make PostgreSQL compute/reconcile the new score safely.

- `LIFTING_WORKOUT` reconciliation (50/day)
- `EXERCISE_COMPLETE` reconciliation (5 each, six/day)
- `EXERCISE_PROGRESS` reconciliation (5/10/15, 30/day)
- `CARDIO_BONUS` best-of-day reconciliation (15/day)
- enforce 125/day total
- scoring-version metadata
- idempotency/concurrency protection
- edit/delete reconciliation
- backfill/manual-history policy
- leaderboard-safe scoring summaries

Exit criteria: duplicate, concurrent, retried, edited, or deleted data cannot manufacture or orphan XP.

## Phase 8 — Exercise progression engine + history — DONE

Objective: make each canonical lift a first-class progression timeline.

- weighted best-set Epley observations (1–12 reps)
- bodyweight best-rep observations
- personal-best snapshot updates
- previous PR / current PR history
- weight/reps/e1RM history
- session volume tracked for analytics but not XP
- frequency/last-performed data
- added-weight/assisted comparison rules when defensible
- no cross-user comparison in progression calculation

## Phase 9 — Weekly lifting consistency + badges — DONE

- weekly lifting-goal snapshots
- completed-week goal streak
- PR badges
- lifting-frequency milestones
- consistency badges
- cardio accessory milestones where useful
- badges remain non-XP initially

## Phase 10 — Group competition/social — DONE

Apply the UI design gate before leaderboard/activity-feed implementation.

- weekly/all-time leaderboard
- authoritative weekly/all-time XP totals; level formula remains intentionally undefined rather than invented
- curated lift/PR activity feed
- badge feed
- lightweight reactions
- privacy-safe summaries rather than raw workout-set exposure

## Phase 11 — Cardio accessory logging — DONE

Cardio remains deliberately secondary.

- running
- walking/hiking
- cycling
- swimming
- sport/cardio/HIIT
- duration-based 5/10/15 bonus
- history/analytics
- no cardio contribution to lifting-day weekly target

## Phase 12 — PWA/offline hardening — DONE

Phase 12 is split into reliability slices so durable storage, shell caching, retry behavior, and mobile-browser validation can be proven independently.

### 12A IndexedDB workout durability — DONE

Primary boundary: move active-lift recovery and the queued workout-mutation journal from synchronous localStorage persistence to IndexedDB without changing the v1 recovery/mutation contracts.

- active workout snapshot persisted in IndexedDB;
- queued workout mutations persisted in IndexedDB before replay;
- one-time migration of existing v1 localStorage recovery/queue keys;
- hydration gate prevents an offline refresh from deciding the workout is absent before IndexedDB loads;
- idempotency keys and FIFO queue ordering are preserved across migration/reload;
- localStorage is fallback-only when IndexedDB is unavailable or rejects a write;
- no scoring, Supabase schema, or workout behavior changes.

### 12B Offline shell + install UX — DONE

- production offline app shell;
- service-worker cache/version lifecycle;
- explicit install affordance where supported;
- standalone/display-mode handling;
- update/reload UX that does not interrupt an active workout.

### 12C Reconnect + retry hardening — DONE

- reconcile IndexedDB state with the authoritative server after reconnect;
- preserve existing idempotency/conflict guarantees through app restart;
- bounded retry/backoff for safe queued mutations;
- no background mutation that bypasses explicit conflict policy.

### 12D Mobile PWA validation — DONE

- iOS Safari/installed-web-app lifecycle validation;
- Android Chrome/installed-PWA lifecycle validation;
- refresh/background/foreground/offline/reconnect scenarios;
- storage persistence and eviction behavior documentation;
- final Phase 12 reliability integration gate.

## Phase 13 — Lifting analytics — DONE

The product-wide UI design gate was completed before implementation. Phase 13 is split so per-exercise analytics and cross-session calendar summaries can be proven independently.

### 13A Per-exercise lifting analytics — DONE

Primary boundary: turn the existing authoritative Phase 8 exercise-history read model into useful personal lifting analytics without changing scoring or persistence.

- lift-by-lift progression chart for comparable e1RM or bodyweight-rep observations;
- e1RM / comparable-rep history stays personal and uses the existing progression metric;
- best completed working-set weight and best reps across the selected exercise history;
- per-session volume history plus total volume, explicitly analytics-only;
- exercise frequency and last-performed context from the existing overview read model;
- dedicated baseline/PR/current-PR timeline;
- added-weight and assisted bodyweight work remains analytics-visible but does not become comparable plain-bodyweight progression;
- responsive desktop, Android-class Chromium, and iPhone-class WebKit browser fixture;
- no Supabase migration and no scoring/XP changes.

### 13B Weekly/monthly lifting summaries — DONE

Primary boundary: aggregate completed lifting history into calendar summaries without changing the per-exercise progression contract.

- weekly completed lifting sessions, exercises, working sets, volume, and PR counts;
- monthly equivalents and trend context;
- use a focused read model/RPC only if existing read models cannot provide the aggregate efficiently;
- volume remains analytics-only;
- no cross-user comparison and no scoring changes.

## Phase 14 — Wearables / native companion — LATER

The PWA never requires a smartwatch. A future native watch companion may support:

- quick workout status
- rest timer / active session controls
- glanceable weekly lifting progress
- workout completion feedback
- cardio provenance/import where appropriate

Wearables never increase scoring simply because a device was used.

## Phase 15 — Platform administration, moderation + capacity dashboard — IN PROGRESS

Objective: give trusted platform administrators a secure operational console for capacity monitoring, account moderation, and direct user notices without granting those powers to ordinary group owners/admins.

Apply the UI design gate before implementing the administrator console. This phase must be split into the following subphases rather than shipped as one large patch.

### 15.1 Platform-admin authorization + audit foundation — DONE

Primary boundary: establish the non-visual security substrate before any administrator console is exposed.

- define a platform-admin permission model that is completely separate from group OWNER / ADMIN roles;
- no self-service admin elevation and no client-controlled admin claims;
- keep platform account state, platform-admin membership, and audit history in a non-exposed private schema;
- bootstrap the first trusted platform administrator through an operator-only database function that browser roles cannot execute;
- privileged account operations run only through guarded security-definer boundaries with explicit authenticated grants;
- never expose the Supabase service-role key, Netlify access tokens, or comparable infrastructure credentials to the browser;
- immutable admin audit log recording actor, target, action, reason, timestamp, and relevant before/after state;
- protect the final active platform administrator against revoke, suspension-state transition, and profile deletion;
- explicit authorization tests for platform admin, normal user, suspended admin, and unauthenticated caller;
- do not add the administrator console in this slice.

#### 15.1B Production bundle chunking/performance gate — DONE

This required engineering cleanup ships with the v0.13.0 checkpoint but does not change product behavior.

- lazy-load authenticated feature sections instead of pulling dashboard, workout, cardio, progress, groups, and social into the initial module graph;
- use Vite 8 / Rolldown code-splitting configuration rather than hiding the warning by raising the chunk limit;
- separate stable React and Supabase vendor code;
- fail the production build when any emitted JavaScript chunk exceeds 500 kB;
- emit a production asset manifest and precache every emitted lazy chunk so installed-PWA offline availability is preserved;
- extend Chromium PWA E2E coverage to prove every emitted manifest asset is cached before offline navigation;
- preserve the existing navigation, feature state, PWA, and E2E contracts.

Exit criterion: v0.13.0 has a tested platform-admin authorization/audit boundary and no production JavaScript chunk is allowed to exceed the configured 500 kB release budget.

### 15.2 Capacity + platform-health dashboard — IN PROGRESS

Phase 15.2 is deliberately split so local operational measurements, provider-authoritative quota data, historical persistence, and the eventual administrator UI can be proven independently without putting infrastructure credentials in the browser.

#### 15.2A Capacity semantics + provider contract — DONE

Primary boundary: define deterministic capacity states and provider-neutral telemetry contracts before persistence or UI.

- distinguish database-local operational measurements from provider-authoritative billing/quota measurements;
- never label a local recent-sign-in count as Supabase billable MAU;
- default warning bands are 60% WATCH, 75% WARNING, and 85% CRITICAL, with 100%+ EXCEEDED;
- represent missing limits as UNCONFIGURED and failed provider reads as UNAVAILABLE rather than zero usage;
- validate custom threshold bands as finite, strictly increasing percentages between 0 and 100;
- estimate positive growth and time-to-limit only from comparable metric/source/unit samples with valid elapsed time;
- define DATABASE_LOCAL, SUPABASE_MANAGEMENT, and NETLIFY_API provider boundaries without storing credentials;
- repair the repository CI gate so Node 24 application/browser validation and the hosted-Supabase database contract run on every push/PR;
- commit non-secret `supabase/config.toml` for repository compatibility and select only canonical `supabase/tests/*.test.sql` suites in database CI;
- keep the developer and GitHub validation workflows Docker-free; runtime database validation remains hosted-Supabase authoritative;
- no database migration, admin UI, scoring, XP, badge-award, ranking, or user-visibility change in this slice.

#### 15.2B Database-local telemetry + historical snapshots — DONE

Delivered non-visual persistence/read boundary:

- added `private.platform_capacity_allowances`, `private.platform_capacity_snapshots`, and `private.platform_capacity_snapshot_metrics` with browser access revoked;
- added append-only snapshot history with immutable snapshot headers and normalized metric rows;
- added `private.read_database_local_capacity_metrics()` for trusted database-local collection;
- added active-platform-admin-only `public.get_platform_capacity_current()`, `public.capture_platform_capacity_snapshot()`, and `public.get_platform_capacity_history(integer)` boundaries;
- database-local telemetry now measures PostgreSQL database bytes, Storage bytes/object count, current Postgres connections against live `max_connections`, total Auth users, and 30-day recent sign-ins;
- Auth counts remain explicitly operational and must never be presented as provider-authoritative billable MAU;
- absent configured allowances remain null/UNCONFIGURED rather than being invented in client code;
- history reads are bounded to 1..365 snapshots and each snapshot freezes the allowance that applied when it was captured;
- hosted migration `20260822040727_platform_capacity_local_telemetry` is applied and the 42-assertion rollback-safe pgTAP authorization/snapshot suite passes;
- no real platform administrator, capacity allowance, or capacity snapshot was seeded by this slice.

Locked route + authorization architecture:

- reserve `/platform-admin` as the private administrator shell and `/platform-admin/capacity` as the capacity dashboard route;
- route `/platform-admin/*` from the authenticated application boundary **before** ordinary onboarding / `GroupGate` / `ProductController`, so trusted platform administrators do not need fitness-group membership to operate the console;
- protect the admin shell with a `PlatformAdminGate` that requires a valid authenticated Supabase session and calls `public.get_my_platform_access()`;
- render admin content only when `account_status = ACTIVE` and `is_platform_admin = true`; unauthenticated callers return to sign-in, while every authenticated but unauthorized caller (normal user, group OWNER/ADMIN, or suspended platform admin) must be handled exactly like an unknown/non-existent authenticated route using a replace redirect to canonical home `/`, with no admin-specific denial state or route disclosure and no retained admin-route history entry;
- ordinary group `OWNER` / `ADMIN` roles never satisfy platform-admin authorization and the admin routes stay out of ordinary primary product navigation; unauthorized authenticated callers must not be able to distinguish a reserved admin URL from any other invalid route based on visible app behavior;
- reserve `/settings` as the ordinary authenticated Profile/Settings surface and use it as the in-PWA discovery point for trusted admins: render an `Admin` action to `/platform-admin` **only** after server-backed access resolves to `account_status = ACTIVE` and `is_platform_admin = true`; for normal users, group OWNER/ADMIN users, suspended admins, loading access, or failed access checks, render no admin heading, disabled item, placeholder, reserved gap, or admin-specific copy;
- the conditional Profile/Settings Admin action is navigation convenience only and never replaces `PlatformAdminGate` or RPC authorization; its state must come from `public.get_my_platform_access()` (or a shared wrapper around that RPC), never group role, client storage, profile metadata, or a client-controlled claim;
- treat the React route guard as UX only, **not** as the security boundary: every capacity read/capture/configuration RPC must independently call `private.require_active_platform_admin()` before returning or mutating operational data;
- keep capacity allowance records, snapshots, and operational state in the non-exposed `private` schema with no direct browser-table grants;
- platform-admin-only PostgreSQL database size and connection telemetry;
- platform-admin-only Supabase Storage object/byte telemetry derived from trusted database metadata;
- operational auth-user and recent-sign-in counts, clearly labeled as local operational signals rather than provider billable MAU;
- configured allowance records kept in private operational storage rather than hard-coded in the client;
- private historical snapshots so growth can be derived from retained measurements;
- guarded snapshot capture/read RPCs using the Phase 15.1 active-platform-admin boundary;
- authorization and rollback-safe pgTAP coverage for normal, group-owner/group-admin, suspended, unauthenticated, and active-platform-admin callers.

#### 15.2C Supabase provider quota adapter — IN PROGRESS (PROVIDER BILLING-USAGE API GAP)

Provider billing is organization-scoped, so Supabase billing metrics must be identified as organization usage rather than mislabeled as a project-only quota.

##### 15.2C1 Secure Management API boundary + capability adapter — DONE

- add the authenticated `platform-capacity-supabase` Edge Function with `verify_jwt = true`;
- authorize the caller with `public.get_my_platform_access()` and require `account_status = ACTIVE` plus `is_platform_admin = true` before touching Management API credentials;
- return a generic 404 for unauthorized callers so the protected provider boundary does not disclose administrator functionality;
- keep `SUPABASE_MANAGEMENT_ACCESS_TOKEN` and `SUPABASE_ORGANIZATION_SLUG` server-side only; no Management token, service-role/secret credential, or equivalent provider secret enters Vite/browser code;
- call only documented `GET /v1/organizations/{slug}` and `GET /v1/organizations/{slug}/entitlements` Management API surfaces for provider/configuration capability checks;
- never expose raw provider responses to the PWA and never accept a caller-controlled Management API origin;
- reserve explicit organization-scoped metric identities for provider MAU, uncached egress, cached egress, Realtime message count, and Realtime peak connections;
- validate the normalized Edge response in a provider adapter and degrade malformed/missing/provider-failed metrics to UNAVAILABLE with null values rather than zeroes.

##### 15.2C2 Provider-authoritative billing-cycle usage feed — BLOCKED ON DOCUMENTED SUPABASE API/EXPORT

- Supabase currently documents authoritative billing-cycle MAU/egress/Realtime usage on the organization Usage page but does not document a stable Management API endpoint for those organization billing-cycle totals;
- do not invent an undocumented `/usage` endpoint, scrape the Dashboard, derive billable MAU from local 30-day sign-ins/Auth logs, or infer unified billing egress from partial project reports;
- do not hard-code mutable Free/Pro/Team plan quotas into runtime application logic;
- keep provider billing metrics UNAVAILABLE until a documented machine-readable billing-cycle source exists, then normalize it through the already-secured Edge boundary;
- the provider API gap does not block independent Netlify adapter work.

#### 15.2D Netlify provider usage adapter — IN PROGRESS (PROVIDER ACCOUNT-USAGE API GAP)

Netlify billing/usage is team/account scoped. The public API calls a team an account, so provider measurements use the explicit ACCOUNT scope rather than pretending the billing totals belong to one project.

##### 15.2D1 Secure Netlify API boundary + capability adapter — DONE

- add the authenticated `platform-capacity-netlify` Edge Function with `verify_jwt = true`;
- authorize the caller with `public.get_my_platform_access()` and require `account_status = ACTIVE` plus `is_platform_admin = true` before touching Netlify credentials;
- return a generic 404 for unauthorized callers, preserving the locked administrator non-disclosure behavior;
- keep `NETLIFY_ACCESS_TOKEN` and `NETLIFY_ACCOUNT_ID` server-side only, with optional `NETLIFY_SITE_ID` for target-project verification;
- call only documented `GET /accounts/{account_id}` and `GET /sites/{site_id}` API surfaces for configuration/capability checks;
- verify an optional configured site belongs to the configured account before reporting it as verified;
- add ACCOUNT to the provider-neutral capacity scope model;
- validate normalized Netlify provider responses in a browser-safe adapter and degrade failed/malformed/missing metrics to UNAVAILABLE/null rather than zero;
- never expose raw account/site provider payloads or allow a caller-controlled Netlify API origin.

##### 15.2D2 Provider-authoritative account usage feed — BLOCKED ON DOCUMENTED NETLIFY API/EXPORT

- Netlify currently documents authoritative bandwidth, web-request, build/compute and credit consumption in Usage & billing / Account usage insights, but the public OpenAPI does not expose stable endpoints for those billing totals;
- do not invent an undocumented usage endpoint, scrape the Dashboard, derive billable bandwidth/requests from logs, sum deploy durations into build usage, or calculate credits from public pricing tables;
- do not infer credit-based versus legacy billing from undocumented account-type identifiers;
- do not hard-code mutable plan allowances into runtime application logic;
- keep Netlify billing metrics UNAVAILABLE until a documented machine-readable source exists, then normalize it through the already-secured Edge boundary.

#### 15.2E Capacity dashboard visual gate + implementation — DONE

- completed the required phone-first + desktop visual gate and locked the approved cleaner operational direction before implementation;
- added project-wide anti-AI layout rules in `docs/UI-ANTI-AI-LAYOUT-RULES.md` so future concepts cannot invent routes, metrics, quotas, history, provider success, or generic dashboard chrome;
- implemented real `/platform-admin` -> `/platform-admin/capacity` routing before ordinary onboarding / `GroupGate` / `ProductController`;
- kept authenticated unauthorized/suspended callers non-disclosed with the same replace redirect to `/` used for ordinary unknown authenticated routes;
- implemented `/settings` as the ordinary authenticated Profile/Settings entry point after onboarding and before group gating; the existing Profile navigation now opens that route;
- Settings shows an Administration action only after `public.get_my_platform_access()` positively resolves ACTIVE + platform admin, and leaves no admin heading/placeholder/gap while access is loading, unavailable, errored, suspended, or false;
- added a responsive platform-admin shell with only the real Capacity destination plus Back to app; no future admin sections are fabricated in the navigation;
- wired the capacity dashboard to `public.get_platform_capacity_current()`, `public.get_platform_capacity_history(30)`, and `public.capture_platform_capacity_snapshot()`;
- show database size, Storage bytes/object count, Postgres connections, total Auth users, and 30-day recent sign-ins using real database-local values only; local Auth figures remain explicitly non-billing signals;
- render utilization only when a trustworthy positive denominator exists; Postgres connections can use live `max_connections`, while absent allowances remain Unconfigured without fake progress bars;
- snapshot history is honest: zero snapshots show an empty state, one snapshot asks for another comparable sample, and 2+ snapshots can show real rows/positive-growth context; no chart data or automatic snapshot schedule is invented;
- consume the secured Supabase and Netlify provider adapters and present unavailable provider billing feeds as unavailable/null rather than Connected, Healthy, zero, or reconstructed billing usage;
- the only capacity actions in this slice are Refresh, Record snapshot, and Back to app; no Export, provider settings, quota editor, auto-refresh schedule, or fake detail actions;
- phone layout uses a compact sticky admin header and one-column operational rows; desktop uses a narrow real-only admin rail and denser two-column telemetry rows without a KPI card wall;
- no database migration, platform-admin bootstrap, scoring, XP, badge, ranking, workout, group, or ordinary-user domain behavior change in this slice.

### 15.3 User account administration — DONE

- searchable/paginated user directory with stable user ID, username, display name, account status, created date, and limited operational metadata;
- ACTIVE / SUSPENDED / DELETION_PENDING account states;
- suspend an account with required reason, optional expiry/review date, and immediate enforcement across authenticated application RPCs;
- revoke/expire active sessions when an account is suspended where supported safely;
- restore a suspended account with an audited administrator action;
- remove an account through a deliberate two-step destructive flow with clear cascade/data-retention behavior;
- prevent accidental self-removal or removal of the final platform administrator;
- never expose password hashes, auth secrets, raw tokens, or unrelated private user data in the admin UI;
- suspension/removal must reconcile or exclude affected social/leaderboard visibility without corrupting authoritative historical scoring.

#### 15.3A Account directory + lifecycle foundation — DONE

- extend the existing private account-state row with suspension-review and reversible deletion-request metadata;
- add a reusable `private.require_active_account()` status guard for the next enforcement slice;
- add ACTIVE-platform-admin-only searchable/paginated account directory and account-detail RPCs without exposing email/password/token/raw Auth metadata;
- add audited suspend/restore boundaries with self-suspension prevention and existing final-admin protection;
- add the first reversible deletion step: DELETION_PENDING request + cancellation, preserving the exact previous ACTIVE/SUSPENDED state;
- refuse deletion requests for any account that is still a platform administrator;
- keep irreversible Auth/profile deletion out of this slice until Storage/cascade/session behavior is reviewed;
- no user-administration UI is added before the required visual gate.

#### 15.3B Suspension enforcement + Auth session coordination — DONE

- installed an authenticated PostgREST pre-request boundary so every Data API table/view/RPC request requires ACTIVE account state and a live `auth.sessions` row matching the JWT `session_id` claim;
- applied the same active-session helper to authenticated profile-picture Storage policies; the PWA has no Realtime subscriptions in this slice;
- added a JWT-verified `platform-account-auth` Edge Function that re-validates the caller token and ACTIVE platform-admin authorization before any service-role operation;
- revoked browser execution of historical state-only suspend/restore RPCs and moved those actions behind revisioned service-only preparation/completion RPCs;
- made suspension database-authoritative before Auth ban, while restoration remains SUSPENDED until Auth unban succeeds; failures are retryable and stale completions are rejected;
- kept Auth ban separate from session semantics: no claim that `ban_duration` invalidates an issued JWT and no direct mutation of Supabase-managed Auth session rows;
- added hosted pgTAP coverage for ACTIVE/SUSPENDED/DELETION_PENDING state, live/missing/expired sessions, Storage policies, retries, revision races, and non-deletion.

#### 15.3C Irreversible account removal — DONE

- require an already-DELETION_PENDING target plus exact server-verified `DELETE <username>` confirmation;
- support both ACTIVE-platform-admin deletion of another non-admin account and ordinary-user self-deletion through the same retryable backend engine;
- re-check actor/mode, self-removal, platform-admin, group-ownership, pending-state, and exact-confirmation protections at the destructive boundary;
- delete every owned profile-picture object through the Storage API before hard Auth deletion, with revisioned retry/failure coordination;
- permit the profile/data cascade only from a prepared Auth deletion transaction; block direct profile/Auth deletion otherwise;
- delete profile-linked scoring, workout, progression, group-membership/social, badge, and preference rows by existing cascades while retaining UUID-only deletion jobs and append-only audit history;
- require group ownership transfer first; never silently transfer or delete a group;
- keep both administrator and ordinary-user deletion controls out of this non-visual slice.

#### 15.3D User-administration visual gate + UI — DONE

- audit the real 15.3 account data/actions/states first;
- generate phone-first and desktop user-directory/detail/action concepts using only implemented fields and actions;
- obtained explicit product-owner approval for the phone and desktop concepts before adding the Users admin destination;
- implemented the searchable/paginated directory, detail, suspend/restore, and deliberate two-step deletion UX after approval;
- keep destructive actions reasoned, explicit, accessible, and non-color-only.

#### 15.3E User reports + moderation case foundation — DONE

- let an authenticated user report another user, never themselves, with a required category/reason and optional validated reference to a supported group, completed workout, or group social activity; message references remain deferred until a real message source exists;
- deliver reports into a private moderation queue for moderation-capable platform administrators; the first operational moderator is the existing platform administrator, without inventing a browser-only moderator role;
- keep the reporter identity visible to authorized moderators for abuse review but hidden from the reported user unless an explicit later disclosure policy requires otherwise;
- support NEW, IN_REVIEW, RESOLVED, and DISMISSED case states, moderator notes, assignment, timestamps, and append-only action history;
- rate-limit and de-duplicate abusive submissions without preventing a user from reporting distinct incidents;
- define report, evidence-reference, moderator-note, and resolution retention before exposing the reporting control;
- alerts must be durable in-app moderation work, not a best-effort toast; later email/push delivery may supplement but never replace the queue.

#### 15.3F Privacy-bounded user activity review + moderation UI — DONE

- let an authorized moderator open a reported or directory-selected account’s review timeline using purpose-built read models rather than unrestricted table access;
- include relevant account lifecycle events, workouts recorded, group membership/activity, reports, and communication history once each source exists;
- show the minimum fields needed to investigate context, with links back to the originating moderation case where applicable;
- audit moderator access to sensitive review data and every case/status/note/action mutation;
- never expose password material, raw tokens, Auth identities/providers, private keys, unrestricted session rows, unrelated IP/device telemetry, or unrelated user data;
- keep moderation review read-only with respect to workouts, scoring, badges, rankings, and progression; lifecycle enforcement continues through the existing audited account actions;
- define pagination, retention, redaction, deletion effects, and group/message visibility before implementing the activity timeline.

### 15.4 Admin-to-user messaging — DONE

- send an in-app message to a specific user account, every current member of a selected group, or all eligible user accounts;
- support message types such as NOTICE, WARNING, ACTION_REQUIRED, and ACCOUNT_STATUS;
- administrator-entered subject/body plus optional expiry or acknowledgement requirement;
- user inbox/banner surface with delivered/read/acknowledged state;
- resolve and persist the recipient set at send time so group membership changes do not rewrite delivery history;
- use a server-side, retryable fan-out boundary for group and all-user messages; never loop over privileged recipients from the browser;
- provide an explicit audience preview/count and a second confirmation before a group or all-user send;
- exclude deleted accounts and define how SUSPENDED/DELETION_PENDING recipients receive required account or moderation notices;
- warnings and moderation notices remain visible according to an explicit retention policy;
- every message send/edit/withdraw action is audit logged;
- admin messages never affect XP, badges, rankings, or progression.
- full-app blasts are NOTICE-only and appear once as a dismissible, non-blocking “What’s new” popup; dismissal records read state so the popup does not reopen for that revision.

### 15.5 Admin integration + security gate — DONE

- admin sign-in/authorization boundary cannot be reached by normal users through client-side navigation tricks;
- suspension takes effect across dashboard, workouts, cardio, groups, progress, and social RPCs;
- account removal behavior is validated against foreign-key cascades, Storage cleanup, and retained audit records;
- user reports enter the private moderation queue, activity review is authorization- and audit-bounded, and reporter confidentiality is preserved;
- targeted, group, and all-user message audiences are resolved server-side with durable per-recipient delivery history;
- admin messaging is covered by service, component, integration, and authorization tests;
- capacity metrics degrade safely when an external provider metric is unavailable;
- phone/desktop administrator UI is responsive, but the admin console is not exposed in ordinary user navigation;
- destructive actions require explicit confirmation and produce an auditable result.

### 15.6 Profile/Settings + notification preferences — DONE

This is the ordinary authenticated PWA account surface defined in `docs/PHASE15.6-PROFILE-SETTINGS-NOTIFICATIONS.md`; it is not an administrator-only feature.

#### 15.6A Profile/Settings foundation — DONE

- implement `/settings` as the canonical authenticated Profile/Settings route, reachable once profile identity exists and not blocked by `GroupGate`;
- provide Profile + identity, Training preferences, Account + security, Groups, Privacy + data, App/PWA, Notifications, and conditionally authorized Administration sections;
- support profile picture, display name, username, email/account identity, timezone, weekly lifting target, and a persisted preferred `kg` / `lb` unit without rewriting historical scoring/workout data;
- link to existing group administration rather than duplicating group-role controls;
- provide the approved deliberate two-step self-service account-deletion control, using the Phase 15.3C request/cancel/confirm service contract, exact server phrase, immediate local sign-out after deletion, and group-transfer requirement;
- do not expose fake data-export, session-management, or unsupported notification controls.

#### 15.6B Notification preference persistence — DONE

- persist a user-owned master Notifications ON/OFF preference server-side;
- persist individual optional categories for workout reminders, weekly goal reminders, badges + achievements, personal-record alerts, group activity, and group invitations;
- master OFF suppresses optional delivery and disables child controls while preserving the individual category selections for a later master ON;
- users may read/update only their own preferences through authenticated service/RPC/RLS boundaries;
- required in-app account, security, moderation, suspension, and ACTION_REQUIRED notices remain visible regardless of optional notification settings.

#### 15.6C PWA notification permission + delivery integration — DONE

- account notification preferences and device/browser permission are distinct states;
- request browser/OS notification permission only from an explicit user gesture, never automatically on Settings load;
- support default/not-requested, granted, denied/blocked, and unsupported-device states;
- a blocked device must not silently flip the server-side account master preference OFF;
- push subscriptions are device-specific, support multiple devices per account, and can be revoked independently;
- only expose category toggles as working when the associated delivery behavior actually exists;
- push/provider credentials remain outside the browser bundle.

#### 15.6D Settings integration gate — DONE

- validate mobile/desktop Settings, no-group access, profile/training preference persistence, master notification ON/OFF, every supported category toggle, and preserved child selections across OFF -> ON;
- validate default/granted/denied/unsupported notification-permission states, explicit permission prompting, multi-device subscription separation, and required in-app notices remaining visible;
- validate conditional Admin discovery remains ACTIVE-platform-admin-only and direct `/platform-admin/*` authorization still re-checks independently;
- no settings preference changes scoring, XP, badge awards, rankings, qualification, or historical workout data.

Exit criterion: a trusted platform admin can see approaching free-tier limits, inspect account status, suspend/restore/remove users safely, and send auditable in-app policy/moderation notices; ordinary users also have a secure Profile/Settings foundation with explicit notification controls, without exposing privileged credentials or weakening scoring/privacy boundaries.

## Phase 15.7 — Optional groups + multi-group product entry — DONE

Product correction before the visual overhaul:

- completing onboarding enters the personal dashboard even with zero groups;
- group membership is optional and no longer gates Home, lifting, cardio, progress, or Settings;
- pending targeted invitations can be accepted or declined later without blocking solo use;
- users may create a group later from Groups;
- users may belong to and own multiple groups simultaneously;
- accepting another invitation adds membership rather than replacing an existing group;
- group-only Competition fails honestly when no group is selected;
- the hosted `(group_id, user_id)` membership model remains authoritative and required no schema change.

See `docs/PHASE15.7-OPTIONAL-MULTI-GROUPS.md`.

## Phase 15.8 — Curated training tips + preset workouts — DONE

Functional content added before the visual overhaul resumes:

- deterministic source-controlled training tips on Home and the pre-workout surface;
- no LLM/remote-AI coaching and no scoring effects from tips;
- Full Body Strength, Upper Strength, Lower Strength, Push, and Pull presets;
- presets resolve through the active canonical exercise catalogue;
- presets choose ordered exercises only; sets, reps, weights, substitutions, and completion remain user-controlled;
- ordinary empty-lift start remains available;
- `start_lifting_workout_from_preset` applies the validated preset atomically through the existing lifting lifecycle;
- hosted migration `20260823223635_phase15_8_preset_workouts` and 10/10 hosted pgTAP are authoritative.

See `docs/PHASE15.8-TRAINING-TIPS-PRESETS.md`.

## Phase 15.9 — Recipient inbox deletion + member-only group chat — HOSTED DATABASE VALIDATED; REALTIME SETTING CHECK PENDING

- let a recipient delete a platform message from only their own inbox while retaining shared content, delivery identity/progress, administrator audit, and every other recipient delivery;
- require acknowledgement of the current required revision before deletion;
- add one persistent plain-text conversation per group, separate from the automated Competition activity feed;
- restrict reads, posts, reactions, and deletion to current ACTIVE members through guarded RPCs;
- allow authors to delete their own messages and group OWNER/ADMIN roles to moderate any message through body-free tombstones;
- support one bounded emoji reaction per member/message, cursor pagination, duplicate protection, and a rolling post rate limit;
- use private Realtime Broadcast only for content-free invalidation, followed by a fresh membership-authorized RPC read;
- preserve zero scoring, XP, workout, progression, badge, and ranking effects;
- record all three migrations under their exact repository timestamps, including foreign-key covering indexes discovered by the Performance advisor;
- pass 27/27 inbox-deletion and 45/45 group-chat hosted pgTAP assertions, refresh hosted database types, and pass the complete repository gate;
- keep only the operator confirmation that Realtime public channel access is disabled pending before release.

See `docs/PHASE15.9-INBOX-DELETION-GROUP-CHAT.md`.

## Phase 16 — Mobile-first visual overhaul — IN PROGRESS

Objective: redesign the existing user-facing product **page by page** so it feels purpose-built as a polished mobile application while preserving authoritative behavior, accessibility, reliability, and responsive desktop support.

This is not a one-shot reskin. Each page/surface is its own approved slice. Do not implement the next slice until the current slice has completed the visual gate and has been validated in the real app.

### Phase 16 execution contract — REQUIRED FOR EVERY VISUAL SLICE

For each page or major surface:

1. audit the current screen, real data, user actions, loading/error/empty/offline states, and known usability problems;
2. define the mobile information hierarchy and interaction model before styling;
3. generate one or more phone-first concept views using the actual product requirements rather than generic dashboard patterns;
4. review/revise the concepts with the product owner and explicitly approve one direction;
5. document tablet/desktop adaptation, safe-area behavior, scrolling, keyboard behavior, and component boundaries;
6. implement only that approved surface using existing services/controllers unless behavior changes are explicitly part of the slice;
7. validate 320px-class phones, modern iPhone/Android sizes, desktop, accessibility, loading/error/empty/offline states, and the existing test suite;
8. compare the implemented screen against the approved concept before marking the slice DONE.

Global rules for the overhaul:

- mobile is the primary composition, not a compressed desktop dashboard;
- preserve real product data and flows; do not add decorative fake metrics;
- favor clear hierarchy, comfortable touch targets, native-feeling controls, and restrained visual depth;
- avoid repetitive AI-style icon cards, unnecessary gradients/glows, excessive rounded containers, and decoration without function;
- retain brand consistency across pages without forcing every surface into the same card template;
- motion must communicate state/navigation and respect `prefers-reduced-motion`;
- no scoring, authorization, persistence, or offline contract may change merely for visual reasons;
- shared components/tokens are promoted only after at least two approved pages demonstrate the same need.

### 16.0 Visual inventory + mobile design-system direction — DONE

- capture every current user-facing route/surface and its states;
- identify global navigation, spacing, typography, surface, iconography, motion, and safe-area inconsistencies;
- define the proposed mobile app shell and page anatomy without yet rewriting every page;
- establish a restrained token direction for typography scale, spacing, radii, elevation, borders, status colors, and interactive states;
- identify the recurring identity/achievement surfaces that need reserved badge-display space before badge artwork is designed;
- decide what remains global versus feature-local before implementation begins;
- produce baseline before/after references so later slices can be judged consistently.

See `docs/PHASE16.0-VISUAL-INVENTORY-DIRECTION.md`.

### 16.1 App shell + primary navigation — DONE

- mobile bottom/navigation treatment and page-header behavior;
- authenticated Profile/Settings access and `/settings` shell treatment, preserving the Phase 15 rule that an Admin action appears only for positively authorized ACTIVE platform administrators and is otherwise absent;
- preserve the Phase 15.6 Settings information architecture and notification semantics, including the master Notifications toggle, supported per-category toggles, and separate device-permission state; visual work must not collapse these into one misleading switch;
- desktop/sidebar adaptation without making desktop dictate the mobile layout;
- active-state clarity, safe-area padding, scroll behavior, and PWA install/offline/update surfaces;
- reserve a stable identity/achievement slot where badge showcase content belongs without forcing badges into every page;
- global loading transition for lazy feature chunks;
- no page-specific content redesign yet.

See `docs/PHASE16.1-APP-SHELL.md`.

### 16.2 Authentication + password recovery — DONE

- sign in;
- create account;
- forgot password;
- reset password;
- verification/confirmation states;
- error and configuration-help states.

### 16.3 Onboarding + optional group discovery — DONE

- profile onboarding;
- weekly lifting target;
- land in the personal dashboard with zero groups allowed;
- optional group creation from Groups;
- pending invitation acceptance/decline;
- additive multi-group membership and group-context switching;
- first-run empty/error/loading states.

### 16.4 Home / lifting dashboard — DONE

- weekly lifting goal and XP hierarchy;
- recent lifts;
- PR context;
- group rank;
- cardio as secondary information;
- reserve a compact badge/achievement showcase area that can surface earned badges without competing with Start Lift;
- Start Lift as the primary action without turning the page into a collection of equal-weight cards.

### 16.5 Active workout + set logging — DONE

- workout timer and lifecycle controls;
- exercise sections;
- dense set entry optimized for thumbs and one-handed use;
- add/copy/complete/delete interactions;
- offline/recovering/conflict states;
- finish/cancel flows and destructive confirmation.

### 16.6 Exercise picker + exercise library — DONE

- selector shell;
- muscle-group navigation;
- workout/equipment narrowing;
- search-all flow;
- recents and eventual favorites;
- exercise-result density and selected/duplicate states;
- keep anatomy artwork purposeful rather than decorative.

### 16.7 Progress + lifting analytics — DONE
- exercise selection and overview;
- e1RM/bodyweight trend presentation;
- volume and PR timelines;
- weekly/monthly summaries;
- charts optimized for narrow touch screens without sacrificing readable desktop analysis.

### 16.8 Groups + invitations + member administration — DONE

- group switcher;
- member roster and roles;
- invite flow;
- promote/demote/remove/leave/transfer controls;
- make destructive/privileged actions clear without overwhelming ordinary group members.

### 16.9 Competition + social activity — DONE

- leaderboard hierarchy and period switching;
- activity feed;
- lightweight reactions;
- profile identity and badge display using the shared badge presentation contract from 16.13;
- preserve privacy-safe summaries and avoid turning the feed into raw workout logs.

### 16.10 Cardio accessory surface — DONE

- quick logging;
- duration/tier context;
- history and summary;
- maintain its deliberate secondary relationship to lifting.

### 16.10A Application-composition reset — DONE

The page-by-page Phase 16 work preserved behavior but did not produce a sufficiently coherent app composition across routes. This repair sequence keeps the accepted functional boundaries while reopening layout containment, mobile interaction, spacing ownership, category separation, and control consistency as a cumulative set of small slices.

#### 16.10A.1 Shared foundation + Home + Settings — DONE

- one shell-owned responsive gutter, content width, page scroll owner, and mobile scrollbar/overflow contract;
- shared app spacing, surface, row, radius, and bottom-navigation tokens;
- app-owned desktop popover/mobile bottom-sheet SelectField, with all current raw select call sites migrated;
- Home rebuilt as bounded functional regions without its photo hero or divider-only major category boundaries;
- Settings rebuilt as a category index with focused Profile, Training, Notifications, Security, Groups, App, Privacy, and authorized Admin panels;
- no product behavior, scoring, authorization, persistence, Supabase, or hosted environment change.

See `docs/PHASE16.10A-APP-COMPOSITION-RESET.md`.

#### 16.10A.2 Lift task flow — DONE

- pre-workout/start surface, active workout, dense set rows, exercise picker, lifecycle/destructive controls, and offline/recovery/conflict containment;
- verify fixed/sticky action ownership, keyboard behavior, and 320px one-handed use without horizontal overflow.
- remove the decorative active-workout banner and consolidate the timer/session state into one contained task rail;
- confirmation-gate both Finish and Cancel while preserving the existing lifecycle and terminal-race services.

#### 16.10A.3 Progress + cardio — DONE

- separate trend/summary controls from history rows and keep charts/list regions contained at phone widths;
- preserve cardio's accessory role and all existing metrics.
- replace Progress's photo hero with a compact app identity surface and give calendar summary, tracked lifts, selected-lift facts, trends, milestones, and session history distinct functional boundaries;
- keep Cardio quick logging primary while separating its authoritative summary and recent-history rows, including explicit 320px containment coverage.

#### 16.10A.4 Groups + competition + social — DONE

- replace horizontal group rails with the shared app selector so group context remains explicit without creating document-level scrolling;
- separate Groups into Members, Invites, and Settings task views while preserving role-gated administration, targeted invitation, multi-group, and membership contracts;
- separate Competition into Standings and Activity views, retain the pinned current-user standing and privacy-safe summary boundary, and contain reactions/reports at 320px;
- keep all group/social RPC, authorization, reaction, reporting, ranking, and persistence behavior unchanged.

#### 16.10A.5 Auth + onboarding + admin + system integration — DONE

- compressed mobile authentication branding so the sign-in/recovery task remains in the first viewport while preserving the photographic identity and keyboard-safe form behavior;
- split onboarding into focused Identity, Training preferences, and Goal steps with a safe-area-aware mobile action rail and unchanged atomic submission contract;
- aligned legal documents, platform administration, moderation, capacity, user administration, and platform messaging with the shared charcoal/orange surface and spacing system;
- retained one-pane list/detail administration on phones and two-pane operational workspaces on desktop, without horizontal filter rails;
- added shared bounded loading/error/empty state geometry plus one top-chrome/system-sheet language for PWA and platform notices;
- added deterministic Auth/Onboarding/Legal/Admin browser fixtures and explicit 320px horizontal-overflow coverage;
- changed no auth, authorization, moderation, platform-message, persistence, scoring, Supabase, or hosted-environment behavior.

#### 16.10A.6 Visual integration + route/access repair — DONE

- add bounded destination photography to Home, Lift start, Cardio, Progress, Groups, and Compete without reintroducing marketing-style page heroes;
- give every product destination a canonical direct path while retaining legacy query-link compatibility;
- place Messages, Settings, and one-tap mobile Sign out in explicit non-overlapping header action slots;
- expose existing guarded Supabase project telemetry clearly in the Admin Overview and defer Netlify invocation until its adapter is deliberately enabled;
- audit page gutter/spacing ownership and prevent nested main landmarks inside AppShell;
- repair stale browser fixtures/copy assertions that caused the reported multi-engine gate failures;
- add no migration, RLS, RPC, provider credential, hosted write, deployment, scoring, or persistence change.

### 16.11 Platform-administration console visual overhaul — ABSORBED BY 16.10A.5

Start only after Phase 15 has delivered the real admin data/actions.

- capacity/platform-health dashboard;
- user directory and account status;
- suspend/restore/delete flows;
- admin audit history;
- targeted notices/messages;
- phone usability where reasonable while retaining an efficient desktop operational view.

### 16.12 System states + cross-feature polish

- empty states;
- loading/skeleton strategy;
- error/retry states;
- offline/reconnecting/conflict states;
- success/confirmation feedback;
- toast/banner hierarchy;
- keyboard/focus behavior and reduced-motion handling;
- remove visual inconsistencies left after page migrations.

### 16.13 Badge display + badge visual-design system

Primary boundary: turn the existing Phase 9 badge achievements into a deliberate, reusable visual system without changing how badges are earned.

- inventory the real implemented badge catalogue and the exact metadata available for each badge before drawing new artwork;
- confirm the reserved badge-display locations created in earlier slices, including the dashboard/identity surfaces and social/competition identity where appropriate;
- design a coherent badge family with consistent silhouette, iconography, typography, spacing, and small-size legibility rather than one-off decorative stickers;
- define earned, newly-earned/highlighted, and any intentionally exposed locked/unearned presentation states without inventing new badge eligibility rules;
- create responsive badge presentation variants for compact mobile showcase, list/grid views, and larger detail/celebration treatment where justified;
- create or generate final badge artwork only after the badge concepts and dimensions are approved; prefer SVG when the artwork remains crisp and maintainable at multiple sizes;
- implement one shared accessible badge component/presentation contract with readable labels, non-color-only state communication, and appropriate decorative-image handling;
- ensure badge collections wrap/scroll intentionally on narrow phones and never force horizontal page overflow;
- badge artwork and display changes must remain cosmetic: no scoring, XP, qualification, streak, or badge-award logic changes in this slice.

### 16.14 Brand imagery, banners + illustration assets

Create imagery **only when an approved page has a real communication need**. Do not add banners merely to fill space.

- identify pages that benefit from a hero/banner, onboarding illustration, empty-state artwork, achievement visual, or campaign/system notice graphic;
- generate concepts after the page layout is approved so the asset fits real dimensions and hierarchy;
- review/revise each asset with the product owner before shipping;
- provide responsive crops/variants where necessary;
- prefer SVG for simple illustration/iconography and optimized AVIF/WebP/PNG for raster artwork where browser support/quality warrants it;
- define alt text or mark purely decorative images appropriately;
- keep asset sizes inside the production performance budget and lazy-load non-critical artwork;
- do not use generated imagery for data, permissions, instructions, or controls that should be real UI.

### 16.15 Visual-overhaul integration gate

- all user-facing pages have an approved and implemented mobile-first view;
- no page still depends on the pre-overhaul visual system by accident;
- navigation, typography, spacing, surfaces, status feedback, motion, and badge presentation are coherent across the app;
- accessibility and touch-target audits pass;
- responsive Chromium/WebKit E2E coverage remains green;
- bundle-size and image-performance budgets remain green;
- offline/recovery/conflict behavior remains functionally unchanged;
- final product-owner visual review is complete before Phase 17.

Exit criterion: the application presents a coherent, polished, mobile-native visual experience page by page, with deliberate desktop adaptations and only purposeful approved imagery.

## Phase 17 — Public/broader release hardening — LATER

Phase 15 platform administration/moderation and the Phase 16 visual-overhaul integration gate should be complete before a broader public launch.

- abuse/rate limiting
- production SMTP
- monitoring
- privacy/data export/delete
- backup/restore drills
- larger-group query/performance testing
