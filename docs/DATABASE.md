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
- `workout_sets`: ordered per-exercise logical sets with independent weight/reps/type/completion data.

Set and exercise mutations that require protection are performed through authenticated RPC/guarded mutation boundaries rather than unrestricted browser table writes.

## Advanced sets

Phase 18.7A preserves `workout_sets` as the authoritative logical-set parent for Drop Sets and Pyramids.

The parent carries `set_variant` with the supported variants:

- `STANDARD`
- `DROP`
- `ASCENDING_PYRAMID`
- `FULL_PYRAMID`

`workout_set_segments` stores ordered advanced-set stage data:

- `workout_set_id`
- `segment_index`
- `weight_kg`
- `reps`

An advanced parent is still one logical set number for active-workout workflow, recovery, copy/delete, completed history, and existing `lifting-v1` completed-set semantics. Saving an advanced set replaces the ordered segment list atomically through the guarded advanced-set mutation boundary.

This logical-parent model is **not** the Phase 19 muscle-volume unit. Phase 19 may derive multiple or fractional set-stimulus equivalents from the child stages without creating extra `workout_sets` rows or changing existing XP/set-count behavior.

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

## Phase 19 muscle-volume persistence — planned

Phase 19 adds a versioned analytics layer rather than embedding secondary muscles or hypertrophy scores directly into `workout_sets`.

The Phase 19.4 foundation should provide versioned persistence for at least:

- a methodology/version identity that owns the interpretation of set credit, exercise-muscle mappings, and benchmarks;
- exercise-to-muscle contribution rows keyed by methodology version, canonical exercise, and reportable muscle group;
- direct/indirect contribution weight and supporting review metadata where approved;
- muscle-group benchmark rows keyed by methodology version and reportable muscle group;
- RLS/guarded read boundaries appropriate to reference data and authenticated user reports.

The Phase 19.5 calculation/read model derives **set-stimulus equivalents** from persisted completed workout data before applying exercise-to-muscle contribution weights. The v1 contract is defined in [`DOMAIN-RULES.md`](DOMAIN-RULES.md):

- standard completed Working/Failure set: `1.0`;
- Pyramid: `1.0` per completed stage;
- Drop Set: first eligible stage `1.0`, each valid lower-load continuation `0.5`, logical Drop Set cap `2.0`;
- warmup/incomplete/cancelled-session work: `0`.

The existing raw rows remain the source evidence. The browser must not write derived muscle-volume totals as if they were authoritative facts. Authenticated read models/RPCs should derive rolling 7-day and 28-day results server-side and return the methodology version used.

Raw repetitions and stage-summed tonnage remain available for ordinary workload/history analytics, but Phase 19 does not persist a linear `reps` or `sets × reps × load` conversion as the muscle-volume score.

Phase 19.9 introduces compact frozen monthly training snapshots. Those snapshots should retain the methodology version plus the minimum aggregate data required for stable historical reports after future methodology revisions or eventual raw-data archival. Private monthly PDF artifacts are separate from the structured snapshot; only the current PDF is retained per user after verified replacement.

Any schema introduced for Phase 19 requires regenerated public database types and matching database/TypeScript tests before release.

## Weekly goals and badges

Weekly target persistence represents lifting days, not general activity days. Badge/achievement persistence is non-XP unless the domain rules are explicitly changed in a later version.

## Messaging and moderation

Platform messages use durable per-recipient delivery/read/acknowledgement state. Recipient inbox deletion does not rewrite shared content or other recipients' delivery history.

User reports and moderation-case data are privacy-bounded and administrator-authorized. Historical/audit records that are intentionally retained across user deletion must not rely on a profile foreign key that would erase them accidentally.

## Database testing

Canonical database tests live under `supabase/tests/*.test.sql` and are rollback-safe pgTAP suites. Repository structural validation (`npm run db:test:ci`) does not replace applying migrations and executing relevant pgTAP tests against hosted Supabase.

See [`SUPABASE-SETUP.md`](SUPABASE-SETUP.md) and [`CI-VALIDATION.md`](CI-VALIDATION.md).
