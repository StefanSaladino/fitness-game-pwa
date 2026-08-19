# Phase 5.5A — Group Foundation

Status: **DONE**

This phase intentionally contains no group screens and no feature CSS. It establishes the application layer that Phase 5.5B will consume.

## Boundaries

- `model.ts`: feature contracts only.
- `validation.ts`: pure group/invite validation and normalization.
- `groupService.ts`: the only groups-layer Supabase boundary.
- `hooks/`: React async/state orchestration only.
- `groupMessages.ts`: safe user-facing error mapping.

## Supported operations

- list all active groups for a user;
- count active members without a fixed group-size assumption;
- create a group;
- list active group members and their shared-group profile identity;
- create an invite;
- join using either a raw invite UUID or a supported invite link;
- preserve OWNER / ADMIN / MEMBER roles.

## Database trust boundaries

No new migration is required. Existing Phase 4 schema/RLS remains authoritative:

- creating `groups` is restricted to `created_by = auth.uid()`;
- the `group_created_owner` trigger creates the owner membership;
- `group_members` is client read-only;
- invite creation is restricted to active OWNER/ADMIN roles;
- invite joins go through `join_group_by_invite`, which validates expiry/revocation/use limits and is idempotent for already-active members.

## Multi-group rule

The application returns `GroupSummary[]`, never a single global group. This keeps the architecture ready for users who participate in multiple lifting groups.

## CSS rule

No CSS is added in Phase 5.5A. Phase 5.5B screens must use colocated CSS Modules and must not add feature selectors to `src/styles/global.css`.

## Next

Phase 5.5B implements Create Group / Join by Invite presentation against these controllers.
