# Phase 16.8 — Groups + invitations + member administration

Status: **IN PROGRESS**

This document records the approved visual contract for the Groups redesign. It is maintained documentation and is intentionally not an executable release gate.

## Purpose

Make existing group membership and administration feel like a mobile training product instead of a long settings form, while preserving the authoritative multi-group, invitation, role, and membership contracts.

## Real data and actions retained

- multiple simultaneous group memberships;
- selected group, active member count, and current user role;
- member profile picture, display name, username, and role;
- targeted invites by username or profile invite ID;
- incoming Accept / Decline and outgoing Revoke;
- owner promotion/demotion controls;
- owner ownership transfer;
- owner/admin removal boundaries already enforced by the service/server contract;
- group rename;
- create another group;
- non-owner leave-group flow;
- owner requirement to transfer ownership before leaving;
- secondary navigation to Competition.

## Approved hierarchy

1. Selected group identity and Competition action.
2. Horizontal multi-group switcher when more than one membership exists.
3. Incoming invitations only when present.
4. Flat member list with one Manage affordance where permission allows it.
5. Targeted invite entry for owners/admins.
6. Outgoing pending invitations when present.
7. Restrained Group settings disclosure for rename, create-another-group, and membership actions.

## Member management

- member rows never expose a pile of inline privileged actions;
- Manage opens a focused modal/bottom sheet;
- the sheet exposes only actions the current actor is allowed to use;
- promote/demote can execute from the focused sheet;
- ownership transfer and removal require an additional explicit confirmation step;
- the dialog traps focus, supports Escape, restores focus to the trigger, and locks background scrolling while open.

## Visual rules

- no hero photo or decorative group artwork;
- no motivational slogans;
- no fake online/presence state, XP, levels, activity metrics, or group metadata;
- no icon-feature card rows, gradients, glow, glass, or card-wall composition;
- visual interest comes from group typography, a data-derived monogram, real member identity, restrained avatar overlap, section rhythm, and orange interaction accents;
- green remains semantic success/completion only;
- mobile horizontal rails remain scrollable with scrollbar chrome hidden.

## Responsive behavior

- phone is the primary composition;
- group switching uses a horizontal pressed-button rail instead of a native select on mobile;
- desktop keeps the same information hierarchy with wider rows rather than becoming a separate admin dashboard;
- safe-area bottom padding is retained;
- no horizontal page overflow is allowed.

## Non-goals

- no database migration;
- no role/authorization rule changes;
- no reusable group join code resurrection;
- no group image/banner field;
- no social feed or leaderboard redesign (Phase 16.9);
- no scoring, XP, badge, workout, or progress changes.
