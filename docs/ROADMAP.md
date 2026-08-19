# Detailed Development Roadmap

Status legend: **DONE**, **IN PROGRESS**, **NEXT**, **LATER**.

## Product-wide UI implementation gate — REQUIRED

Before implementing any substantial user-facing screen or redesign, stop at a visual-design checkpoint.

Required sequence:

1. define the screen's purpose, states, data, and actions without styling it;
2. generate a phone-first concept image to envision the layout;
3. review the concept with the product owner and revise it until the direction is approved;
4. document responsive behavior for phone, desktop, and watch-sized contracts where relevant;
5. map component boundaries and data ownership before coding the approved layout;
6. only then implement the production UI;
7. validate accessibility, responsive behavior, loading/error/empty states, and browser behavior before the phase is complete.

Separation-of-concerns rules for UI work:

- screen/page components compose features and own route-level layout only;
- feature components render feature-specific UI and receive data/actions through props or focused hooks;
- hooks/controllers orchestrate state and asynchronous feature behavior;
- services/repositories are the only feature layer that talks directly to Supabase;
- pure validation/domain rules stay framework-independent and are tested without React or Supabase;
- shared UI primitives are created only when reuse is real, not speculatively;
- visual components must not contain SQL/RPC knowledge or direct Supabase queries;
- large all-in-one components should be split by responsibility before they become difficult to test.

See `docs/UI-DEVELOPMENT-GATE.md` for the implementation checklist.

## Phase 0 — Product rules — DONE

Objective: define a fair scoring model before implementation.

- One qualifying workout day = 100 base XP.
- Additional same-day workouts do not add base XP.
- Personal Performance XP = 0–25/day.
- Account Performance XP gate = 168 elapsed hours after onboarding.
- Each measurable benchmark independently requires two prior valid comparable observations.
- Observation #3 is the first that can earn Performance XP.
- Weekly consistency is capped at 100%.
- Badges are non-XP initially.

Exit criteria: behavior is explicitly testable and documented.

## Phase 1 — Domain/test oracle — DONE

Objective: convert product rules into executable pure TypeScript rules and a formal test matrix.

Delivered:

- category qualification thresholds
- daily base XP
- benchmark lifecycle
- better-of-first-two anti-sandbagging baseline
- performance tiers and cap
- weekly consistency and weekly improvement
- fairness invariants

## Phase 2 — React/PWA technical foundation — DONE

Objective: create the framework shell without prematurely building product screens.

Delivered:

- React/TypeScript/Vite
- responsive watch-sized through desktop CSS constraints
- PWA manifest/service worker
- Vitest/RTL/Playwright configuration
- CI shell

## Phase 3 — Repository/testing scaffold — DONE

Objective: establish CI/test/PWA structure before persistence.

Delivered:

- Vitest/RTL/Playwright configuration
- dependency-independent internal domain verifier
- structural project validator
- PWA assets/service worker
- GitHub Actions frontend validation shell

## Phase 4 — Supabase data/auth foundation — DONE

### 4.1 Documentation — DONE

- README onboarding
- roadmap
- domain rules
- testing guide
- architecture guide
- database guide
- Supabase setup guide

### 4.2 Core schema — DONE

- profiles
- groups
- group members
- group invites
- exercise catalog
- workout sessions
- workout exercises/sets
- XP ledger
- performance observations
- performance benchmarks
- weekly goals

### 4.3 Expandable group model — DONE

- no member-count assumption
- owner/admin/member roles
- auto-owner creation
- invite joining
- removal
- role changes
- ownership transfer
- leaving

### 4.4 RLS/security boundary — DONE

- own-workout privacy
- group membership privacy
- shared-group profile visibility
- derived XP/benchmark tables read-only to client
- controlled group mutation RPCs

### 4.5 Authentication foundation — DONE

- signup
- login
- logout
- persisted sessions
- email verification-compatible signup
- forgot password
- reset password
- `PASSWORD_RECOVERY` handling

### 4.6 Database pgTAP tests — DONE

- schema tests
- RLS tests
- expandable-group/RPC tests
- qualification-trigger boundary tests
- one-time onboarding / pending-target tests

### 4.7 Phase exit gate — DONE

Validated through the hosted Supabase Dashboard and local frontend tooling:

- initial migration applied
- seed applied
- pgTAP suites executed
- TypeScript validation
- Vitest domain/component validation
- production build
- structural validation
- Playwright desktop + mobile browser shell validation

The project currently uses a hosted-Supabase/dashboard-first development workflow. If CLI migrations are adopted later, reconcile remote migration history before using `db push`.

## Phase 5 — Onboarding + group experience — IN PROGRESS

Objective: make a new friend able to join without developer involvement.

### 5.1 Non-visual onboarding foundation — IN PROGRESS

Build the contracts that the eventual UI will consume before designing screens:

- atomic onboarding RPC for username + display name + timezone + weekly target
- onboarding input normalization and validation
- profile-loading service
- onboarding-completion service
- future weekly-target scheduling service
- deterministic onboarding-state helpers
- unit tests for client-side validation/state logic
- pgTAP coverage for username normalization, uniqueness, and atomic completion

**No final onboarding layout is implemented in this subphase.**

### 5.2 Onboarding visual-design checkpoint — NEXT / REQUIRED GATE

Before coding the real onboarding interface:

1. generate a phone-first concept image for sign-in/onboarding/group setup;
2. review and approve hierarchy, navigation, density, gamification tone, and visual direction;
3. define desktop adaptation and watch-sized component contracts;
4. write the component map and screen-state map;
5. only then implement the approved layout.

### 5.3 Authentication + onboarding UI — AFTER VISUAL APPROVAL

- sign-in/create-account/recovery presentation
- username selection
- display name
- timezone confirmation
- weekly workout target selection
- email-verification states
- loading/error/success states
- keyboard and accessibility behavior

### 5.4 Group setup UI

- create group
- invite link/code UI
- join group by invite
- group member list
- owner/admin controls
- leave/ownership-transfer UX

### 5.5 Responsive + integration validation

- phone-first layout
- desktop dashboard adaptation
- watch-sized component contracts where applicable
- signup -> onboarding -> group create
- signup -> invite -> group join
- fifth/tenth member joins normally
- member cannot self-promote
- admin cannot remove owner
- removed member loses group access

Exit criteria: a new user can sign up and join from an invite with no database/manual intervention.

## Phase 6 — Workout capture engine

Objective: reliably record workouts before gamification UI is expanded.

The product-wide UI implementation gate applies before the workout-builder interface is coded.

Subphases:

- activity selection
- exercise-catalog search and filtering
- recent/favorite exercise access
- active timer with pause/resume
- strength exercise/set logging
- timed activities
- manual logging
- completion/cancel flow
- offline active-session persistence
- sync/idempotency
- editing/deleting within rules

Exercise search requirements:

- instant case-insensitive canonical-name search
- alias support (for example `RDL` -> Romanian Deadlift and `OHP` -> Overhead Press)
- fuzzy/typo-tolerant matching where it does not create ambiguous identity
- equipment/movement filters once catalog metadata is added
- canonical exercise IDs remain the persistent workout/benchmark identity
- search/display aliases must never create duplicate benchmark identities

Exit criteria: no workout is lost on refresh, app backgrounding, or ordinary connection loss.

## Phase 7 — Authoritative scoring persistence

Objective: make PostgreSQL the authoritative scoring ledger.

- daily base XP reconciliation
- manual grace rules
- concurrency protection
- idempotency keys
- deletion/edit reconciliation
- XP ledger summary queries
- leaderboard-safe summary functions

Exit criteria: duplicate/simultaneous requests cannot exceed 100 base XP/day.

## Phase 8 — Performance progression engine

Objective: persist and award personal improvement safely.

- benchmark-key builders
- strength e1RM observations
- bodyweight observations
- running distance-band observations
- swimming observations
- indoor cycling observations
- HIIT template observations
- two-sample calibration
- 168-hour account gate
- 7-scoring-date benchmark cooldown
- max +25 Performance XP/day
- benchmark edit/delete reconciliation

Exit criteria: no user can be compared against another user, and a new activity always calibrates independently.

## Phase 9 — Weekly consistency + badges

- historical weekly goals
- weekly scoring
- weekly improvement bonus
- badge definitions
- badge progress
- badge awards
- no badge XP initially

## Phase 10 — Group competition/social

The product-wide UI implementation gate applies before leaderboard/activity-feed implementation.

- weekly leaderboard
- level/XP totals
- curated activity feed (not raw private workout rows)
- badge feed
- lightweight reactions

## Phase 11 — PWA/offline hardening

- IndexedDB workout state
- queued mutations
- retry/idempotency
- install UX
- offline shell
- iOS/Android behavior validation

## Phase 12 — Specialized activity analytics

The product-wide UI implementation gate applies before analytics dashboards are implemented.

- richer strength history
- running pace/distance charts
- swimming history
- indoor cycling
- sport-specific badges

## Phase 13 — Wearables / native companion — LATER

The PWA never requires a smartwatch. Wearables add provenance/convenience, not more base XP.

Potential work:

- external activity import
- phone GPS
- Apple Health/native iOS bridge if required
- native watchOS companion

## Phase 14 — Public/broader release hardening — LATER

Only if the private group grows beyond the initial use case:

- abuse/rate limiting
- production SMTP
- monitoring
- privacy policy/data export/delete
- backup/restore drills
- larger-group query/performance testing
