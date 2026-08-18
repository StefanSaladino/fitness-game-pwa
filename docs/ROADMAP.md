# Detailed Development Roadmap

Status legend: **DONE**, **IN PROGRESS**, **NEXT**, **LATER**.

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

## Phase 4 — Supabase data/auth foundation — IN PROGRESS

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

### 4.4 RLS/security boundary — DONE (requires local Supabase execution)

- own-workout privacy
- group membership privacy
- shared-group profile visibility
- derived XP/benchmark tables read-only to client
- controlled group mutation RPCs

### 4.5 Authentication foundation — DONE (requires local integration validation)

- signup
- login
- logout
- persisted sessions
- email verification-compatible signup
- forgot password
- reset password
- `PASSWORD_RECOVERY` handling

### 4.6 Database pgTAP tests — DONE (authored; requires local Supabase execution)

- schema tests
- RLS tests
- expandable-group/RPC tests
- qualification-trigger boundary tests
- one-time onboarding / pending-target tests

### 4.7 Phase exit gate — NEXT

On a developer machine with Docker:

```bash
npm install
npx supabase init
npx supabase start
npx supabase db reset
npx supabase test db
npx supabase db lint --level warning
npm run typecheck
npm test
npm run build
```

Do not mark Phase 4 fully complete until every command is green.

## Phase 5 — Onboarding + group experience — NEXT

Objective: make a new friend able to join without developer involvement.

Subphases:

1. onboarding profile setup
2. timezone confirmation
3. weekly workout target selection
4. create group
5. invite link/code UI
6. join group by invite
7. group member list
8. owner/admin controls
9. leave/ownership-transfer UX
10. responsive phone/desktop/watch-contract validation

Required tests:

- signup -> onboarding -> group create
- signup -> invite -> group join
- fifth/tenth member joins normally
- member cannot self-promote
- admin cannot remove owner
- removed member loses group access

Exit criteria: a new user can sign up and join from an invite with no database/manual intervention.

## Phase 6 — Workout capture engine

Objective: reliably record workouts before gamification UI is expanded.

Subphases:

- activity selection
- active timer with pause/resume
- strength exercise/set logging
- timed activities
- manual logging
- completion/cancel flow
- offline active-session persistence
- sync/idempotency
- editing/deleting within rules

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
