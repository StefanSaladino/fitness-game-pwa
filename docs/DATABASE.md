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

The locked first methodology is `muscle-volume-v1`.

### Phase 19.4 database foundation

The Phase 19.4 foundation should provide versioned persistence for at least:

- a methodology/version identity that owns the interpretation of set-quality thresholds, baseline/confidence rules, advanced-set credit, exercise-muscle mappings, and benchmark bands;
- exercise-to-muscle contribution rows keyed by methodology version, canonical exercise, and reportable muscle group;
- direct/indirect contribution weight plus review confidence/rationale where approved;
- explicit exercise volume-eligibility metadata for cases that are not automatically eligible;
- muscle-group benchmark rows keyed by methodology version and reportable muscle group;
- RLS/guarded read boundaries appropriate to reference data and authenticated user reports.

Phase 19.4 should not persist a client-authored "effective set" number on `workout_sets`. The source workout rows remain the evidence and the versioned read model derives the interpretation.

### Phase 19.5 personalized set-quality calculation

The Phase 19.5 calculation/read model derives set-stimulus equivalents from completed workout data **before** applying exercise-to-muscle contribution weights.

For weighted exercises with an established history, the engine reconstructs the best valid same-exercise Epley-compatible baseline that existed **before the workout being scored**. It uses the methodology's 180-day primary history window and confidence rules from [`DOMAIN-RULES.md`](DOMAIN-RULES.md). Future performance must never be allowed to rewrite an earlier workout's baseline.

Current persistence already contains the evidence needed for this reconstruction:

- `exercise_progress_observations` carries user, exercise, workout, metric value, weight, reps, scoring date, validity, and creation time;
- `exercise_progress` carries the current personal-best snapshot but is not sufficient by itself for historical baseline reconstruction;
- `workout_sessions`, `workout_exercises`, `workout_sets`, and `workout_set_segments` remain the raw workout source of truth.

The calculation must therefore prefer chronological observations/raw workout evidence rather than reading only today's `exercise_progress.best_value` and retroactively applying it to old sets.

The derived set-quality result should carry at least:

- numeric set-stimulus credit (`0`, `0.5`, or `1.0` for a standard v1 work bout);
- confidence (`HIGH`, `MEDIUM`, `LOW`/provisional);
- source/method (`PERSONAL_BASELINE`, `EXPLICIT_FAILURE`, `PROVISIONAL`, or equivalent implementation-safe enum/text);
- methodology version.

These are calculation/report semantics; the exact persistence shape is decided in Phase 19.4. The browser must not be able to author or override authoritative derived volume.

### Advanced-set derivation

Advanced-set scoring uses the same logical parent/segment persistence introduced in Phase 18.7A.

- **Pyramid:** every completed stage is evaluated through the ordinary set-quality layer, then stage credits are summed. A stage can contribute `0`, `0.5`, or `1.0`; the parent remains one logical workout set.
- **Drop Set:** the first stage is scored through ordinary set quality. Valid lower-load continuation stages are fatigue-aware continuations rather than fresh-baseline sets. `muscle-volume-v1` uses `first_stage_credit × min(1 + 0.5 × valid_continuations, 2.0)` where each valid continuation has at least 2 reps, is contiguous in segment order, and lowers load from the immediately preceding stage.
- **Superset:** no multiplier/penalty; underlying sets are evaluated normally.

A first-stage Drop credit of `0` makes the chain's set-stimulus credit `0`; a first-stage credit of `0.5` with two valid continuations yields `1.0`; a first-stage credit of `1.0` with two valid continuations yields the v1 maximum `2.0`.

### Muscle aggregation and read model

After set-stimulus derivation:

`muscle effective sets = set-stimulus equivalents × exercise-to-muscle contribution weight`

Contribution rows are versioned. A direct mapping uses `1.0`; a meaningful indirect mapping uses `0.5`; absent/insignificant muscles have no contribution row. Multiple muscles may receive direct `1.0` mappings when the movement justifies it.

Authenticated Phase 19 read models/RPCs should derive rolling 7-day and 28-day results server-side and return at least:

- methodology version;
- effective sets per reportable muscle;
- direct and indirect components;
- benchmark/status;
- personalized/provisional set-quality confidence coverage;
- useful raw set/stage counts for explanation.

Raw repetitions and stage-summed tonnage remain available for ordinary workload/history analytics but are not linearly converted into hypertrophy volume.

### Historical snapshots and versioning

Phase 19.9 introduces compact frozen monthly training snapshots. Those snapshots should retain the methodology version plus already-calculated aggregate data required for stable historical reports after future methodology revisions or eventual raw-data archival.

Private monthly PDF artifacts are separate from the structured snapshot; only the current PDF is retained per user after verified replacement.

A later volume methodology version may change baseline windows, set-quality bands, Drop coefficients, exercise mappings, or benchmark bands. It must not silently reinterpret a frozen historical report.

### Schema/type/test requirements

Any schema introduced for Phase 19 requires regenerated public database types and matching database/TypeScript tests before release.

Phase 19.2 itself is specification-only: it does not add schema, functions, or migrations. Phase 19.3 supplies the reviewed contribution/eligibility matrix; Phase 19.4 then introduces versioned persistence; Phase 19.5 implements the calculation/read model.

## Weekly goals and badges

Weekly target persistence represents lifting days, not general activity days. Badge/achievement persistence is non-XP unless the domain rules are explicitly changed in a later version.

## Messaging and moderation

Platform messages use durable per-recipient delivery/read/acknowledgement state. Recipient inbox deletion does not rewrite shared content or other recipients' delivery history.

User reports and moderation-case data are privacy-bounded and administrator-authorized. Historical/audit records that are intentionally retained across user deletion must not rely on a profile foreign key that would erase them accidentally.

## Database testing

Canonical database tests live under `supabase/tests/*.test.sql` and are rollback-safe pgTAP suites. Repository structural validation (`npm run db:test:ci`) does not replace applying migrations and executing relevant pgTAP tests against hosted Supabase.

See [`SUPABASE-SETUP.md`](SUPABASE-SETUP.md) and [`CI-VALIDATION.md`](CI-VALIDATION.md).
