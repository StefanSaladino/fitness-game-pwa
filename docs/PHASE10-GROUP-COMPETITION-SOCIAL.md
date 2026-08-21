# Phase 10 — Group competition and social

Phase 10 turns an existing workout group into a private competition surface without changing `lifting-v1` scoring or exposing raw workout detail.

## Competition

The **Compete** destination is group-scoped. `Groups` remains the administration surface for membership, invitations, roles, ownership, and leaving a group.

Two authoritative standings are available:

- **This week** — Monday through Sunday in the requesting member's profile timezone.
- **All time** — all persisted `lifting-v1` scoring events for current active members.

XP is the primary ranking value. Lifting days and real PR count are deterministic supporting tie-break/context values, and earned badge count is displayed as recognition context.

No level formula is introduced in this phase. The roadmap previously mentioned XP/level totals, but the product has no approved level curve. Phase 10 therefore exposes authoritative XP totals and deliberately leaves levels undefined rather than inventing a scoring rule.

## Privacy-safe activity feed

The feed is derived from authoritative source state instead of storing duplicate social-event copies. It may contain only:

- qualifying completed in-app lifting summaries;
- real personal-record improvements;
- currently earned non-XP badges;
- achieved completed-week lifting goals.

The feed never returns individual workout sets, workout notes, or a member's full exercise list. Lift summaries are limited to duration, exercise count, scoring date/title, and XP. PR summaries expose only the canonical exercise name and the already-derived comparable performance result.

Source workout, exercise, observation, and user identifiers are not embedded in the feed metadata. Each activity receives an opaque deterministic SHA-256 activity key for pagination and reactions. PR identity is based on stable user/exercise/metric/workout identity before hashing, not an observation UUID, because authoritative scoring reconciliation may rebuild observation rows.

## Reactions

Reactions are intentionally lightweight and bounded:

- `FIRE`
- `STRONG`
- `CLAP`

A member can hold at most one reaction for an activity. Choosing a different reaction replaces the previous one; choosing the current reaction again removes it. Only active group members can read or react to that group's activities.

Reactions are social feedback only. They never add XP, alter rank, create badges, change progression, or affect weekly consistency.

## Pagination and membership safety

The feed uses a stable `(activity_at, activity_key)` cursor ordered newest-first. The server caps a page at 50 rows; the client requests 21 rows and displays 20 so it can determine whether another page exists.

Leaderboard/feed/reaction RPCs are `SECURITY DEFINER` boundaries that require authenticated active membership. Direct access to the reaction table is revoked from browser roles. Removed members are excluded from competition, feed source membership, and visible reaction counts.

## UI boundary

Phase 10 adds **Compete** as a first-class product destination. The dashboard's compact group rank links to it, and group administration links back to it. Multi-group users can switch groups within the competition screen.

The screen deliberately calls out the privacy boundary: crew highlights are summaries, not surveillance.

## Non-goals

Phase 10 does **not**:

- change `lifting-v1` scoring;
- define or award levels;
- award social/reaction XP;
- expose raw sets, notes, or complete workouts to group members;
- add comments, direct messages, follower graphs, or free-form social posts;
- create global/public leaderboards;
- replace group administration.
