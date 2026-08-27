# Phase 15.9 — Recipient inbox deletion + member-only group chat

Status: hosted database migrations and validation completed on 2026-08-27; the Realtime public-channel Dashboard setting still requires an operator check before release.

## Product outcome

Phase 15.9 adds two separate communication controls:

1. A recipient can permanently delete a received platform message from only their own inbox.
2. Every active member of a group can participate in one shared group conversation and react with a bounded emoji set.

The group conversation is intentionally separate from Competition's automated, summary-only activity feed. Chat messages do not become workout activity, do not expose private workout details, and never affect XP.

## Recipient inbox deletion

`private.platform_message_deliveries.deleted_at` is a recipient-owned tombstone.

- `public.delete_my_platform_message(uuid)` resolves the caller from Auth and permits only that caller's delivery row.
- The shared message, immutable content revisions, recipient identity snapshot, delivery progress, and administrator audit event remain retained.
- Other recipients remain unaffected.
- `list_my_platform_messages` excludes tombstoned deliveries from rows, totals, and unread counts.
- Deleted deliveries cannot later be marked read, acknowledged, restored, or hard-deleted.
- A message whose current revision requires acknowledgement must be acknowledged before the recipient can delete it.
- The inbox UI exposes a deliberate confirmation view and does not show Delete for an unacknowledged required revision.

## Group chat data model

`public.group_chat_messages` stores:

- group and author ownership;
- sanitized plain-text content from 1–1,000 characters;
- creation time;
- body-suppressing deletion tombstones;
- SELF versus MODERATION deletion reason.

`public.group_chat_reactions` stores one reaction per member/message. The supported set is FIRE, STRONG, CLAP, HEART, and LAUGH. Re-selecting the active emoji removes it; choosing another replaces it.

Both tables have RLS enabled and explicitly revoke all direct browser table privileges. The browser uses only these guarded RPCs:

- `list_group_chat_messages`
- `post_group_chat_message`
- `set_group_chat_reaction`
- `delete_group_chat_message`

Each RPC requires an active platform account and current ACTIVE membership in the requested group. Posting also rejects immediate duplicates and caps a caller at ten chat messages in a rolling minute.

Authors may delete their own messages. Group OWNER and ADMIN roles may moderate any current message. Deletion leaves a body-free conversation tombstone rather than silently collapsing the timeline.

## Realtime contract

The React service joins a private `group-chat:<group UUID>` Broadcast channel only while the Chat panel is mounted and removes that channel on unmount.

Database triggers publish only a `group_chat_changed` invalidation containing group ID, entity name, and timestamp. They never broadcast the message body, author profile, or reaction payload. On receipt, the client reloads through `list_group_chat_messages`, which re-checks current membership.

This indirection is deliberate. Supabase caches private-channel authorization for a live connection; a removed member could otherwise receive row payloads until the connection authorization refreshes. A content-free signal plus an authoritative RPC re-check prevents that stale connection from retrieving new chat content.

The Realtime `SELECT` policy accepts only valid group-chat topics whose resolved group has an ACTIVE membership for `auth.uid()`. Client-originated Broadcast writes are not granted because chat writes go through persistent RPCs.

Before hosted release, Realtime Settings must disallow public channel access so private-channel authorization is enforced.

## Application composition

Groups now exposes four focused tabs:

- Members
- Chat
- Invites
- Settings

Chat has one composer, newest-first messages, wrapped touch-sized reactions, cursor loading for older messages, inline deletion confirmation, live refresh, empty/error states, and explicit 320px containment. It owns no nested vertical scroll region.

## Database artifacts

- `supabase/migrations/20260827195328_recipient_inbox_deletion.sql`
- `supabase/migrations/20260827195329_group_chat.sql`
- `supabase/migrations/20260827222849_group_chat_foreign_key_indexes.sql`
- `supabase/tests/041_recipient_inbox_deletion.test.sql` — 27 assertions
- `supabase/tests/042_group_chat.test.sql` — 45 assertions

The pgTAP contracts cover recipient isolation, acknowledgement gating, retention, direct-table denial, outsider denial, member posting, reaction switching, self-delete, administrator moderation, duplicate/rate limits, membership removal, and zero XP effects.

## Hosted validation record

- The hosted migration ledger records all three files at their exact repository timestamps.
- Canonical pgTAP passes at 27/27 for inbox deletion and 45/45 for group chat; both suites roll back every fixture.
- Hosted type generation refreshed `src/types/database.generated.ts`.
- Security and Performance advisors were reviewed. Two missing chat-reaction foreign-key indexes were resolved in the third migration. Direct-table deny and guarded authenticated RPC notices remain intentional.
- The complete application gate passes: 493 unit tests, 22 integration tests, TypeScript, production build, bundle budget, structural/database contracts, and the 62-assertion internal lifting oracle.
- Realtime may log a dropped-broadcast warning when transactional tests run without a connected WebSocket subscriber; Supabase documents that no listener could have received that signal. A live client connection creates the required daily partitions.
- Realtime public channel access was not changed through this workflow and must still be confirmed disabled in the Dashboard before release.

Nothing was deployed to an application host or pushed to GitHub.
