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

### 5.5 Group setup + first real lifting dashboard — IN PROGRESS

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

### 6.1 Active lifting session — IN PROGRESS

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

### 6.4 Workout reliability — NEXT

- offline active-session persistence
- queued/idempotent sync
- safe edit/delete rules
- no workout loss on ordinary connection failure

## Phase 7 — Authoritative lifting-v1 scoring persistence

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

## Phase 8 — Exercise progression engine + history

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

## Phase 9 — Weekly lifting consistency + badges

- weekly lifting-goal snapshots
- completed-week goal streak
- PR badges
- lifting-frequency milestones
- consistency badges
- cardio accessory milestones where useful
- badges remain non-XP initially

## Phase 10 — Group competition/social

Apply the UI design gate before leaderboard/activity-feed implementation.

- weekly/all-time leaderboard
- XP/level totals
- curated lift/PR activity feed
- badge feed
- lightweight reactions
- privacy-safe summaries rather than raw workout-set exposure

## Phase 11 — Cardio accessory logging

Cardio remains deliberately secondary.

- running
- walking/hiking
- cycling
- swimming
- sport/cardio/HIIT
- duration-based 5/10/15 bonus
- history/analytics
- no cardio contribution to lifting-day weekly target

## Phase 12 — PWA/offline hardening

- IndexedDB active lift state
- queued mutations
- retry/idempotency
- install UX
- offline shell
- iOS/Android behavior validation

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

## Phase 15 — Public/broader release hardening — LATER

- abuse/rate limiting
- production SMTP
- monitoring
- privacy/data export/delete
- backup/restore drills
- larger-group query/performance testing

