# Phase 15.7 — Optional group membership + multi-group entry

## Status

**IN PROGRESS.**

This pre-Phase-16 product-flow correction removes the assumption that a completed-onboarding user must belong to a fitness group before using the product.

## Product contract

- Group membership is optional.
- A user who completes onboarding with zero active groups enters the real lifting dashboard.
- Personal workouts, XP, progression, badges, cardio, and Settings remain available without a group.
- Group-only surfaces such as group competition remain unavailable until a group is selected, but their absence must not block personal product use.
- The Groups destination remains available to zero-group users so they can review targeted invitations, accept or decline them, or create a group when they choose.
- Users may belong to multiple active groups simultaneously.
- Users may own multiple groups simultaneously.
- Accepting a targeted invitation adds/reactivates that membership without replacing another active membership.
- Creating another group adds a new OWNER membership without removing or mutating existing memberships.
- Existing group administration permissions remain scoped to the selected group.
- The selected group is presentation/navigation context only; it is not a single-group account invariant.

## Database verification

No migration is required.

The hosted schema already models membership with primary key `(group_id, user_id)`, so one user can hold memberships in multiple groups. The hosted `create_group(text)` RPC creates a new group and establishes OWNER membership without enforcing a one-group or one-owned-group limit.

## Application changes

- `GroupGate` remains responsible for loading group memberships and failing closed on load errors, but no longer substitutes mandatory setup when the loaded membership list is empty.
- `ProductController` accepts an empty `groups` array and keeps the Home, Workouts, Cardio, Progress, Settings, and Groups paths usable.
- the dashboard accepts optional group context; personal dashboard queries do not invoke the group leaderboard RPC when no group is selected.
- the dashboard explains that groups are optional and links to Groups without presenting fake group/rank data.
- zero-group users opening Groups receive the existing targeted-invitation/create-group surface.
- existing group members can create an additional group from the Groups surface and switch among all active memberships.
- pending targeted invitations remain visible to users who already belong to another group, allowing additional memberships.

## Non-goals

- no scoring or XP changes;
- no badge-award changes;
- no group authorization/RLS changes;
- no notification changes;
- no workout/offline/recovery changes;
- no Phase 16 visual-system redesign;
- no public/reusable invite codes.

## Validation requirements

Before release:

- TypeScript passes;
- zero-group `GroupGate` passes an empty group collection through to the product;
- zero-group `ProductController` lands on the dashboard and can open optional group setup/invitations;
- dashboard service skips group leaderboard loading without a group while retaining personal data;
- an existing member can create another group;
- multiple loaded groups remain selectable without collapsing to one membership;
- existing targeted invite acceptance continues to support another active membership;
- unit, integration, build/bundle, structural, internal, browser, and database-contract gates remain green.

## Phase 16 dependency

Phase 16 remains paused until this correction is released to `master`. The Phase 16.0 visual inventory must then be rebased/reconciled against the new zero-group and multi-group product truth before visual approval resumes.
