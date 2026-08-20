# Phase 5.6.1 — Targeted user invitations

Group access is now recipient-specific rather than based on a reusable group secret.

## Identity

Every profile receives a stable system-assigned `FG-...` invite ID. The ID is stored on the profile and cannot be changed through normal browser profile updates. Owners/admins can target either a canonical username or this stable invite ID.

## Invitation lifecycle

1. An owner/admin enters `@username`, username, or an `FG-...` invite ID.
2. `create_group_invite` resolves exactly one profile and creates at most one pending invite for that user/group pair.
3. The recipient sees the invite in their pending-invitation inbox.
4. The recipient explicitly accepts or declines.
5. Accept creates/reactivates membership as `MEMBER`, then deletes the pending invite row.
6. Decline deletes the pending invite row.
7. Owner/admin revoke deletes the pending invite row.

The `group_invites` table therefore represents **active pending invitations only**. Accepted, declined, and revoked invitations are not retained there.

## Security boundary

- Reusable group tokens and the old `join_group_by_invite(uuid)` RPC are retired.
- Direct authenticated `INSERT`, `UPDATE`, and `DELETE` privileges on `group_invites` are revoked.
- Invitation creation, inbox reads, accept, decline, and revoke use authenticated security-definer RPCs.
- Outgoing invite reads/creation/revocation require active OWNER or ADMIN role; a null/outsider role is rejected explicitly.
- Only the targeted recipient can accept or decline their invite.
