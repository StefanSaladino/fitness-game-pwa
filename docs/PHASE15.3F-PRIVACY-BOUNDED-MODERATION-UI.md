# Phase 15.3F — Privacy-bounded activity review + moderation UI

Phase 15.3F turns the private Phase 15.3E report/case foundation into usable ordinary-user and moderator workflows. It does not implement administrator-to-user messaging; Phase 15.4 remains the next slice.

## User reporting surfaces

Authenticated users can report another member from a shared group leaderboard or report a concrete visible social-feed activity. The dialog requires one server-supported category and a 10–2,000 character reason. It sends the existing GROUP or SOCIAL_ACTIVITY reference through `submit_user_report`; users never choose arbitrary target/evidence identifiers and never receive reporter or case-directory access.

The success state confirms only that the private moderation queue received the report. Reporter confidentiality, submission rate limiting, duplicate handling, active-account enforcement, and evidence ownership remain server-authoritative Phase 15.3E behavior.

## Sensitive access model

`private.moderation_access_log` is append-only, RLS-enabled, and unavailable to browser roles. It records actor and subject identity snapshots, originating case when present, access kind, declared reason, selected activity sources, grant/expiry time, and a minimum two-year retention boundary.

Opening full case detail appends a CASE_DETAIL access record because it exposes reporter identity and the full report reason. Opening activity review requires a 3–500 character purpose and at least one explicit source. `begin_moderation_activity_review` creates a 15-minute ACTIVITY_TIMELINE grant bound to the active platform administrator who requested it, the single review subject, optional concerning case, and selected source types. Pagination can only reuse that unchanged grant.

All RPCs are SECURITY DEFINER only where private cross-boundary reads/writes require it. They pin an empty search path, fully qualify relations, reauthorize the active platform administrator in the function body, revoke PUBLIC/anon execution, and grant only the guarded public RPCs to `authenticated`.

## Purpose-built timeline

`list_moderation_activity_review` returns cursor-paginated pages ordered by `(occurred_at, activity_key)`, with 1–50 rows per request. The UI defaults to 25. Returned source types are:

- ACCOUNT: audited lifecycle/admin actions for the review subject, including the recorded action reason and before/after account status where present;
- WORKOUT: category, subtype, status, source, timestamps, duration, scoring date, qualification flag, and review flag;
- GROUP_MEMBERSHIP: joined/removed timestamps, group identity, role, and current membership state;
- GROUP_ACTIVITY: the subject’s stored group reaction, group identity, opaque activity key, and reaction type;
- REPORT: cases where the subject is reporter or target, with relationship, category, case status, bounded reference label, and a link to the originating case.

Communication history is intentionally absent because no durable user/admin message source exists yet. Phase 15.4 will add it rather than fabricate a MESSAGE activity type in this slice.

## Redaction and read-only rules

The timeline never returns workout notes, exercises, sets, scoring-event internals, badge/ranking/progression mutation controls, Auth users/identities/providers, passwords, raw tokens, sessions, private keys, IP/device telemetry, or unrelated-user activity. Moderator review cannot mutate workouts, scoring, badges, rankings, or progression. Account enforcement continues only through the existing audited Users actions.

The UI renders server-curated summary fields and case links. It never queries private tables or product tables directly and contains no service-role/secret credential.

## Retention and deletion effects

Sensitive access audit and identity snapshots are retained for at least two years. Closed cases keep their existing minimum two-year retention boundary. Product rows continue to follow their existing account-deletion cascades: workouts, memberships, and reactions disappear from future timeline reads after deletion. UUID-only platform-admin audit and immutable report/case snapshots remain available for retained review. The subject resolver uses the newest report identity snapshot when the profile no longer exists and returns no current account status.

This slice does not introduce an automated purge. Any later operator purge must honor the recorded retention boundary and legal/safety holds.

## Moderator workspace

`/platform-admin/moderation` is available only after the existing ACTIVE platform-administrator route guard succeeds. It provides:

- a filtered, paginated durable case queue;
- confidential case evidence with reporter and target identity;
- assignment to the current moderator, private notes, terminal resolve/dismiss actions, and append-only event history;
- an explicit audited-access gate followed by the privacy-bounded timeline;
- originating-case links from report activity;
- a direct activity-review handoff from a selected Users directory account.

The layout is two-pane on desktop and queue/detail on phone. Status/action meaning is textual and not color-only.

## Verification

- migration: `supabase/migrations/20260823144115_moderation_activity_review.sql`
- rollback-safe pgTAP: `supabase/tests/034_moderation_activity_review.test.sql` with 45 assertions
- client/service/component tests cover activity grant mapping, pagination, malformed privileged data, user report evidence, report privacy copy, the audited-purpose gate, direct account review, and admin-route authorization
- the non-Docker repository database gate statically enforces the access, redaction, authorization, and no-fabricated-communication contracts
