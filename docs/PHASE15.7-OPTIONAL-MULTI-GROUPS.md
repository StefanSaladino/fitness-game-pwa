# Phase 15.7 — Optional groups + multi-group product entry

## Status

**DONE.**

Phase 15.7 is the product-behavior correction that lands before the Phase 16 visual overhaul resumes.

It supersedes the original Phase 5 assumption that a completed user profile with zero active group memberships must be diverted into group setup before entering the product.

## Product rule

A fitness group is optional social/competition context. It is not an account prerequisite and it is not required for personal training.

After profile onboarding is complete, a user may have:

- zero active groups;
- one active group;
- multiple active groups;
- ownership of multiple groups;
- a mixture of OWNER, ADMIN, and MEMBER roles across different groups.

None of those states changes lifting qualification, XP, progression, badges, weekly goals, personal workout history, cardio logging, or personal analytics.

## Zero-group behavior

A completed user with zero memberships enters the ordinary authenticated product and Home dashboard immediately.

The following remain available without a group:

- Home / lifting dashboard;
- Start Lift and active-workout recovery;
- cardio logging/history;
- Progress / personal analytics;
- Profile/Settings;
- required in-app account/security/moderation messages;
- PWA lifecycle and notification settings.

The dashboard continues to load personal weekly XP, weekly lifting target progress, recent lifts, personal records, consistency, badges, and profile identity.

Group-only data is omitted honestly:

- no group leaderboard RPC is called when there is no selected group;
- group rank shows that the user is not currently in a group;
- the group leaderboard section is absent.

## Invitations

Targeted invitations remain person-specific.

A pending invitation may be accepted or declined from the dashboard without forcing the user into a setup flow.

Accepting an invitation:

- adds that group as another active membership;
- never replaces an existing group membership;
- refreshes the membership list before group-dependent surfaces use the new membership;
- does not change scoring, workout history, notification preferences, or personal progress.

A user may ignore an invitation and continue using the product solo.

## Creating groups

Creating a group is voluntary.

A zero-group user can open Groups and create one later. A user who already belongs to one or more groups can create another group from group administration.

Creating a new group:

- adds a new OWNER membership;
- does not remove or replace any existing memberships;
- selects the newly created group for group administration after membership refresh;
- does not alter personal scoring or training data.

## Multiple groups

The existing data model is already multi-group by design.

Hosted PostgreSQL was rechecked for this phase. `public.group_members` is keyed by the composite primary key `(group_id, user_id)`; there is no user-only uniqueness constraint that limits an account to one group.

The existing `GroupService.listGroups()` also returns every ACTIVE membership and the product retains one selected group ID only as current UI context, not as account truth.

Group-dependent surfaces use the selected group:

- group administration;
- group leaderboard / competition;
- group social activity.

Switching selected group changes only the current group context. It does not rewrite memberships.

## Groups and Competition with zero memberships

The Groups destination becomes a voluntary membership hub rather than a first-login gate. It offers:

- pending targeted invitations;
- Create group;
- an explicit path back to the dashboard to remain solo.

Competition genuinely requires a group. With zero memberships, Competition renders an explanatory optional-group surface instead of blanking the application or forcing account setup.

## Architecture boundary

The correction preserves separation of concerns:

```text
GroupGate
  -> membership loading/error boundary only
  -> passes [] / [group] / [group, group, ...] into ProductController

ProductController
  -> owns selected group UI context
  -> renders group-independent features with zero groups
  -> routes group-dependent destinations to voluntary group setup when needed

DashboardController
  -> loads personal dashboard with groupId | null
  -> composes group-owned invitation presentation

DashboardGroupMembership / OptionalGroupSetupController
  -> use focused group hooks
  -> GroupService
  -> Supabase
```

Presentation components do not call Supabase directly.

## Database scope

No schema migration is required.

This phase intentionally reuses the existing multi-group membership schema and targeted-invitation RPCs. No RLS, authorization, group-role, or ownership semantics are changed.

## Verification

The final implementation checkpoint passed the complete repository gate on GitHub Actions run `#299`:

- TypeScript: passed;
- unit tests: **431/431** across 115 test files;
- integration tests: **22/22** across 6 integration files;
- production build + JavaScript bundle budget: passed;
- structural validation, including the dedicated Phase 15.7 gate: passed;
- internal validation: passed;
- Browser gate: passed;
- Database repository-contract gate: passed.

Hosted Supabase was inspected directly for the group model and existing RPC behavior. No database mutation was needed for this phase.

## Regression contract

Automated coverage proves:

1. `GroupGate` passes zero memberships into the product rather than rendering mandatory setup;
2. onboarding completion leads directly to the real personal dashboard with zero groups;
3. personal dashboard data loads with `groupId = null` and does not invoke the group leaderboard RPC;
4. a zero-group user may continue to Workouts, Cardio, Progress, and Settings;
5. a zero-group user may accept a targeted invitation from Home;
6. accepting an invitation while already in a group produces multiple memberships rather than replacement;
7. a zero-group user may create a group later from Groups;
8. a current group member may create another group;
9. group switching continues to expose every active membership;
10. Competition provides an honest group-required state when membership is zero;
11. owner/member permission presentation remains correct across the integrated group journey;
12. existing consistency/badge, competition/social, and lifting-analytics integration coverage remains intact;
13. no scoring, XP, qualification, badge, workout-recovery, or personal-history rule changes.

## Phase 16 handoff

The previous Phase 16.0 review PR was intentionally closed without merge after this product correction was requested.

Phase 16.0 must re-inventory the new baseline. In particular, the visual overhaul must treat solo mode, optional invitations, and multiple groups as first-class real product states rather than designing around the superseded mandatory-group gate.
