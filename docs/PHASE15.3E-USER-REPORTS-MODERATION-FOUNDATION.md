# Phase 15.3E — User Reports + Moderation-Case Foundation

Status: **DONE — private queue, evidence validation, assignment, notes, state transitions, retention, and service contracts implemented.**

## Product boundary

This slice creates the server-backed moderation foundation. It does not add the ordinary-user report control or the moderator UI; those surfaces must use these contracts during the Phase 15.3F visual/implementation gate.

The existing ACTIVE platform administrator is the initial moderator. There is no client-only `moderator` flag and no group OWNER/ADMIN role substitution.

## Private data model

- `private.user_reports` stores immutable report evidence, reporter/target UUIDs, bounded identity snapshots, category/reason, an optional validated reference, and a SHA-256 incident fingerprint.
- `private.moderation_cases` is the durable queue with NEW, IN_REVIEW, RESOLVED, and DISMISSED state, assignment, closure, resolution, and retention timestamps.
- `private.moderation_case_notes` stores append-only moderator notes.
- `private.moderation_case_events` stores append-only submission, assignment, note, and status history with actor identity snapshots.

All four tables have RLS enabled and no browser-role policies or grants. The `private` schema remains inaccessible to `anon` and `authenticated`. Reporter identity is available only through active-platform-admin RPCs and is never exposed to the target through a target-facing or reporter-facing read API.

UUID identity snapshots intentionally have no profile foreign key. A later account deletion can remove the profile while preserving the moderation record and action history.

## Submission contract

`public.submit_user_report(...)` requires an ACTIVE authenticated account and:

- rejects self-reporting and unknown targets;
- requires one of HARASSMENT, SPAM, ABUSIVE_CONTENT, IMPERSONATION, CHEATING, SAFETY, or OTHER;
- requires a trimmed reason between 10 and 2,000 characters;
- returns only a durable case UUID receipt;
- creates the report, NEW case, and REPORT_SUBMITTED event atomically.

The server serializes submissions per reporter, limits each reporter to ten accepted reports in a rolling 24-hour window, and rejects a normalized duplicate incident for 24 hours. The fingerprint includes target, category, reference, and whitespace-normalized reason, so distinct incidents are not collapsed merely because they involve the same target/category.

## Evidence references

References are optional. Only existing, currently reviewable product objects are accepted:

- GROUP: reporter and target must both be ACTIVE members of the referenced group;
- WORKOUT: reporter and target must share the referenced ACTIVE group, and the completed workout must belong to the target;
- SOCIAL_ACTIVITY: reporter and target must share the referenced ACTIVE group, and the opaque group-activity key must resolve to target-owned lift/PR/badge/goal activity.

Validation failures use a generic unavailable response to avoid turning the function into an unrelated-object oracle. A MESSAGE reference is intentionally absent because no durable user-message source exists yet. Phase 15.4 may add it through a later migration after message authorization and retention are real.

## Moderator contract

Every moderator RPC invokes `private.require_active_platform_admin()`:

- `list_moderation_cases` returns a bounded, paginated queue and optional status/assignee filter;
- `get_moderation_case_detail` returns the full report and case lifecycle fields;
- `list_moderation_case_notes` and `list_moderation_case_events` return ordered private history;
- `assign_moderation_case` accepts only an ACTIVE platform administrator;
- `add_moderation_case_note` appends a 3–2,000 character note to an open case;
- `update_moderation_case_status` permits NEW -> IN_REVIEW/RESOLVED/DISMISSED and IN_REVIEW -> RESOLVED/DISMISSED. Closed states are terminal.

Assignments, notes, and state changes append immutable events. Closed cases cannot receive new notes or assignment changes.

## Retention and deletion

RESOLVED and DISMISSED cases set `retention_until` to at least two years after `closed_at`. Report evidence, identity snapshots, moderator notes, resolution, and action history remain retained through that minimum. Any later operator-only purge must honor legal/safety holds and cannot be exposed as a browser RPC.

This slice does not duplicate or snapshot raw workout sets, notes, messages, Auth rows, sessions, IP/device data, or unrelated activity. Referenced product data may follow its own deletion lifecycle; the private reference and label snapshot preserve the case link. Phase 15.3F will add purpose-built, audited activity-review read models rather than broad table access.

## Client/service boundary

- `src/features/moderation/userReportService.ts` is the ordinary-user submission transport.
- `src/features/admin/moderation/moderationCaseService.ts` is the moderator queue/detail/mutation transport.
- Neither service contains service-role credentials or direct private-table access.
- No new Edge Function, secret, scoring rule, XP rule, workout mutation, or messaging implementation is added.

## Validation and deployment

- migration: `supabase/migrations/20260823140206_user_reports_moderation_foundation.sql`
- rollback-safe pgTAP: `supabase/tests/033_user_reports_moderation_foundation.test.sql` with 88 assertions
- unit coverage: report submission plus case list/detail/note/event/mutation mapping
- repository database contract: `npm run db:test:ci`
- full application gate: typecheck, unit, integration, build, structure, and internal tests

The supported workflow uses hosted Supabase for migration/pgTAP execution and does not require Docker or a local Supabase stack.
