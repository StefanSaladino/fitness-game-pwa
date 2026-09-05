# Database Model and Persistence Boundaries

This is a current architectural map, not a substitute for the schema itself. The authoritative database history is `supabase/migrations/`; generated public-schema types live in `src/types/database.generated.ts`.

## Principles

- committed/applied migrations are immutable;
- schema repairs use new timestamped migrations;
- RLS/RPC/function boundaries enforce authorization server-side;
- browser clients do not directly write authoritative scoring/progression state;
- retry-sensitive mutations use explicit idempotency/revision contracts;
- hosted Supabase is the authoritative runtime database environment.

## Identity and account data

`profiles` is the Auth-linked application identity/profile record and carries application preferences/identity fields introduced across onboarding/settings phases.

Account lifecycle, suspension/deletion coordination, platform administration, moderation, and audit data use guarded/private boundaries rather than exposing unrestricted Auth internals to the browser.

Profile image bytes are stored in the `profile-pictures` Storage bucket; profile data stores the current path/reference. Account/profile-picture replacement and deletion flows must clean up owned Storage objects deliberately.

## Groups, invitations, competition, and social

The model supports optional many-to-many group membership with OWNER/ADMIN/MEMBER roles.

Current group capabilities include:

- groups and active memberships;
- targeted user invitations;
- group administration/ownership transfer;
- competition/leaderboard read models;
- social activity and reactions;
- member-only group chat;
- server-enforced role/active-membership authorization.

Do not restore assumptions that a user has one group or a group has a fixed size.

## Workout capture

Core lifting persistence is built around:

- `exercise_catalog`: canonical exercise identity and measurement type;
- `workout_sessions`: lifecycle/category/timing/scoring-date context;
- `workout_exercises`: ordered canonical exercises in a workout;
- `workout_sets`: ordered per-exercise sets with independent weight/reps/type/completion data.

Set and exercise mutations that require protection are performed through authenticated RPC/guarded mutation boundaries rather than unrestricted browser table writes.

## Supersets

Supersets do not create a second exercise or set model.

`workout_exercises` carries nullable structural metadata:

- `superset_group_id` — groups linked workout exercises;
- `superset_order` — zero-based member order within the Superset.

Phase 18.3 adds guarded `SET_SUPERSET` / `CLEAR_SUPERSET` mutation handling, revision snapshots, idempotency receipts, and database integrity protection for valid grouped membership/order.

Phase 18.4 active-flow position is derived from persisted group/order metadata plus ordinary set completion state. There is no separate database row representing “current Superset step.”

## Workout durability boundary

Unfinished-workout recovery also uses browser-side IndexedDB. That local state is a recovery mechanism, not an alternative authoritative database.

On reconnect, queued/retried operations must converge through the guarded server mutation contract without manufacturing duplicate actions.

## Scoring and progression

The active model is `lifting-v1`.

Key authoritative persistence includes:

- `scoring_events`: XP ledger with scoring version/category context;
- `exercise_progress_observations`: valid exercise performance observations;
- `exercise_progress`: current personal-best snapshot per user/canonical exercise/metric.

Legacy v0.2 scoring/performance tables remain migration history only and must not receive new `lifting-v1` writes.

See [`DOMAIN-RULES.md`](DOMAIN-RULES.md) for the behavioral scoring contract.

## Weekly goals and badges

Weekly target persistence represents lifting days, not general activity days. Badge/achievement persistence is non-XP unless the domain rules are explicitly changed in a later version.

## Messaging and moderation

Platform messages use durable per-recipient delivery/read/acknowledgement state. Recipient inbox deletion does not rewrite shared content or other recipients' delivery history.

User reports and moderation-case data are privacy-bounded and administrator-authorized. Historical/audit records that are intentionally retained across user deletion must not rely on a profile foreign key that would erase them accidentally.

## Database testing

Canonical database tests live under `supabase/tests/*.test.sql` and are rollback-safe pgTAP suites. Repository structural validation (`npm run db:test:ci`) does not replace applying migrations and executing relevant pgTAP tests against hosted Supabase.

See [`SUPABASE-SETUP.md`](SUPABASE-SETUP.md) and [`CI-VALIDATION.md`](CI-VALIDATION.md).
