# Phase 15.4 — Administrator-to-user messaging

Phase 15.4 adds auditable in-app communication from an active platform administrator to one user, the active members of one group, or every active platform account. It does not introduce email, push delivery, a new moderator role, or any scoring behavior.

## User experience

- A full-app blast is always a `NOTICE`. It opens once as a “What’s new” popup and has a single dismiss action.
- Dismissing that popup records the current revision as read. The same revision will not reopen on the next inbox load.
- Full-app blasts cannot require acknowledgement and are never rendered as blocking warnings.
- Individual and group messages remain available in the persistent message center. An unread targeted message may also appear in the compact banner.
- `WARNING`, `ACTION_REQUIRED`, and `ACCOUNT_STATUS` messages can require acknowledgement. A later content revision must be read or acknowledged again.

## Administrator workflow

The guarded `/platform-admin/messages` route provides:

1. Individual, group, and full-app audience selection.
2. Server-backed user/group search without exposing Auth secrets or recipient lists.
3. Subject, body, message type, optional notice expiry, acknowledgement requirement, and a private audit reason.
4. A short-lived audience preview with recipient count and exact confirmation phrase.
5. Delivery history with recipient, read, acknowledgement, revision, and withdrawal totals.
6. Append-only edits and reasoned withdrawal.

The Users administration detail links directly into the composer with that user preselected.

## Database and authorization boundary

Messaging records live in the non-exposed `private` schema with RLS enabled and no browser table grants:

- `platform_messages` stores delivery metadata and the resolved audience snapshot.
- `platform_message_revisions` stores immutable recipient-visible content revisions.
- `platform_message_deliveries` stores immutable per-recipient identity snapshots and revision-aware read/acknowledgement state.
- `platform_message_events` stores append-only administrator send/edit/withdraw audit with a minimum two-year retention boundary.
- `platform_message_previews` stores only a short-lived count, fingerprint, and confirmation phrase; it never returns the recipient set to the browser.

All exposed RPCs are `SECURITY DEFINER`, pin an empty `search_path`, revoke anonymous execution, and re-authorize the current caller inside the database. Send locks the relevant membership/account state briefly, resolves recipients again, rejects a changed fingerprint, and performs one set-based insert. Retrying an already-completed preview returns the original message ID.

Group delivery includes current active group members with active platform accounts. Full-app delivery includes active platform accounts. Deleted accounts are excluded. A required individual `WARNING`, `ACTION_REQUIRED`, or `ACCOUNT_STATUS` message may be retained for a suspended or deletion-pending account, but Phase 15.3B still blocks that account from the PWA until access is restored or deletion is cancelled.

## Moderation and product isolation

Administrator communication is now a durable `COMMUNICATION` source in the purpose-bounded moderation activity review. The review includes only the target recipient’s retained delivery context and never enumerates other recipients.

Messaging does not insert, update, or delete XP events, badges, rankings, workouts, or progression data.

## Validation

The rollback-safe `supabase/tests/035_platform_admin_messaging.test.sql` suite has 96 assertions covering schema, RLS/grants, pinned functions, admin authorization, audience resolution, preview confirmation, idempotent fan-out, inbox isolation, revision-aware read/acknowledgement, withdrawal, dismiss-once full-app popup semantics, suspended-account enforcement, retention, moderation review, immutability, and zero XP effects.

The supported non-Docker release gate remains:

```text
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:internal
npm run db:test:ci
```
