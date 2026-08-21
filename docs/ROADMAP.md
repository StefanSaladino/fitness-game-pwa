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
- authenticated group gate: zero memberships -> setup, one-or-more -> app;
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

## Phase 12 — PWA/offline hardening — IN PROGRESS

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

### 12D Mobile PWA validation — NEXT

- iOS Safari/installed-web-app lifecycle validation;
- Android Chrome/installed-PWA lifecycle validation;
- refresh/background/foreground/offline/reconnect scenarios;
- storage persistence and eviction behavior documentation;
- final Phase 12 reliability integration gate.

## Phase 13 — Lifting analytics

Apply the UI design gate before analytics dashboards.

- lift-by-lift progression charts
- e1RM history
- best weight / best reps
- volume history (analytics only)
- exercise frequency
- PR timeline
- weekly/monthly lifting summaries

## Phase 14 — Wearables / native companion — LATER

The PWA never requires a smartwatch. A future native watch companion may support:

- quick workout status
- rest timer / active session controls
- glanceable weekly lifting progress
- workout completion feedback
- cardio provenance/import where appropriate

Wearables never increase scoring simply because a device was used.

## Phase 15 — Platform administration, moderation + capacity dashboard — LATER

Objective: give trusted platform administrators a secure operational console for capacity monitoring, account moderation, and direct user notices without granting those powers to ordinary group owners/admins.

Apply the UI design gate before implementing the administrator console. This phase must be split into the following subphases rather than shipped as one large patch.

### 15.1 Platform-admin authorization + audit foundation

- define a platform-admin permission model that is completely separate from group OWNER / ADMIN roles;
- no self-service admin elevation and no client-controlled admin claims;
- privileged account operations run only through server-side / security-definer boundaries;
- never expose the Supabase service-role key, Netlify access tokens, or comparable infrastructure credentials to the browser;
- immutable admin audit log recording actor, target, action, reason, timestamp, and relevant before/after state;
- protect against suspending/deleting the final platform administrator;
- explicit authorization tests for admin, normal-user, suspended-user, and unauthenticated callers.

### 15.2 Capacity + platform-health dashboard

- current PostgreSQL database usage against the configured Supabase allowance;
- Supabase Storage usage against the configured allowance;
- monthly Supabase egress usage and reset date;
- monthly active users against the configured allowance;
- Realtime / other quota telemetry where it becomes materially relevant;
- Netlify bandwidth, request/build usage, or credit consumption when obtainable through a secure server-side integration;
- configurable warning thresholds (initial planning bands: 60%, 75%, and 85%);
- historical usage snapshots so growth rate can be estimated before a hard limit is reached;
- capacity data is operational only and never affects XP, badges, rankings, or user visibility.

### 15.3 User account administration

- searchable/paginated user directory with stable user ID, username, display name, account status, created date, and limited operational metadata;
- ACTIVE / SUSPENDED / DELETION_PENDING (or equivalent) account states;
- suspend an account with required reason, optional expiry/review date, and immediate enforcement across authenticated application RPCs;
- revoke/expire active sessions when an account is suspended where supported safely;
- restore a suspended account with an audited administrator action;
- remove an account through a deliberate two-step destructive flow with clear cascade/data-retention behavior;
- prevent accidental self-removal or removal of the final platform administrator;
- never expose password hashes, auth secrets, raw tokens, or unrelated private user data in the admin UI;
- suspension/removal must reconcile or exclude affected social/leaderboard visibility without corrupting authoritative historical scoring.

### 15.4 Admin-to-user messaging

- send a targeted in-app message to a specific user account;
- support message types such as NOTICE, WARNING, ACTION_REQUIRED, and ACCOUNT_STATUS;
- administrator-entered subject/body plus optional expiry or acknowledgement requirement;
- user inbox/banner surface with delivered/read/acknowledged state;
- warnings and moderation notices remain visible according to an explicit retention policy;
- optional later broadcast/system notices may reuse the same message model but are not required for the first slice;
- every message send/edit/withdraw action is audit logged;
- admin messages never affect XP, badges, rankings, or progression.

### 15.5 Admin integration + security gate

- admin sign-in/authorization boundary cannot be reached by normal users through client-side navigation tricks;
- suspension takes effect across dashboard, workouts, cardio, groups, progress, and social RPCs;
- account removal behavior is validated against foreign-key cascades, Storage cleanup, and retained audit records;
- admin messaging is covered by service, component, integration, and authorization tests;
- capacity metrics degrade safely when an external provider metric is unavailable;
- phone/desktop administrator UI is responsive, but the admin console is not exposed in ordinary user navigation;
- destructive actions require explicit confirmation and produce an auditable result.

Exit criterion: a trusted platform admin can see approaching free-tier limits, inspect account status, suspend/restore/remove users safely, and send auditable in-app policy/moderation notices without exposing privileged credentials or weakening scoring/privacy boundaries.

## Phase 16 — Public/broader release hardening — LATER

Phase 15 platform administration/moderation should be complete before a broader public launch.

- abuse/rate limiting
- production SMTP
- monitoring
- privacy/data export/delete
- backup/restore drills
- larger-group query/performance testing

