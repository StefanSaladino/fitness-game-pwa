# Phase 5.6 — Group Administration

Phase 5.6 turns the existing group permission model into usable product controls without moving authorization into React.

## Responsibilities

The UI may request an action, but PostgreSQL remains authoritative:

- `set_group_member_role` — owner-only role changes;
- `remove_group_member` — owner/admin removal rules;
- `transfer_group_ownership` — owner-only ownership transfer;
- `leave_group` — non-owner self-removal;
- `join_group_by_invite` — authenticated invite joining.

The Phase 5.6 migration explicitly removes `PUBLIC` and `anon` EXECUTE privileges from these security-definer functions and grants execution to `authenticated`. The functions still perform their own membership/role authorization internally.

## Product behavior

### Members

Every active member can:

- see the active member list;
- see roles and profile pictures;
- leave the group if they are not the owner.

Ordinary members cannot read group invites because existing invite RLS restricts them to OWNER/ADMIN.

### Admins

Admins can additionally:

- create and revoke invites;
- rename the group;
- remove ordinary MEMBER accounts.

Admins cannot promote/demote roles, remove other admins, remove the owner, or transfer ownership.

### Owners

Owners can additionally:

- promote MEMBER -> ADMIN;
- demote ADMIN -> MEMBER;
- remove any non-owner member;
- transfer ownership to another active member.

An owner cannot leave while still OWNER. Ownership must be transferred first.

## Multi-group behavior

The product controller maintains a selected group ID. The Groups screen exposes a switcher when more than one active membership exists, and the same selected group is used when returning to the dashboard.

No four-member or one-group assumption is introduced.

## CSS architecture

All new Phase 5.6 feature styles live in:

`src/features/groups/components/GroupAdministrationScreen.module.css`

No Group Administration selectors are added to `src/styles/global.css`.
