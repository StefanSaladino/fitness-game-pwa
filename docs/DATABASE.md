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

- `exercise_catalog`: canonical exercise identity, measurement type, picker taxonomy, aliases, and bodyweight load capabilities;
- `workout_sessions`: lifecycle/category/timing/scoring-date context;
- `workout_exercises`: ordered canonical exercises in a workout;
- `workout_sets`: ordered per-exercise logical sets with independent weight/reps/type/completion data.

For `BODYWEIGHT_REPS`, `exercise_catalog.supports_added_weight` and `exercise_catalog.supports_assisted` are canonical exercise capabilities, not user preferences. The set editor only exposes supported modes and `save_lifting_workout_set` enforces the same contract server-side. Plain bodyweight remains the base mode; an external load is accepted only when the corresponding capability is enabled. Rep-based plyometrics intentionally support optional added load but not Assisted mode.

Set and exercise mutations that require protection are performed through authenticated RPC/guarded mutation boundaries rather than unrestricted browser table writes.

### Phase 20 equipment/access profile

`training_program_profiles` stores the explicit equipment boundary used by future personalized-program generation.

- no row means the user has not configured program access yet;
- `COMMERCIAL_GYM` stores no custom equipment array and represents ordinary standard full-gym access;
- `CUSTOM` stores only explicit supported equipment keys and may be empty for bodyweight-only training;
- authenticated callers can select only their own row through RLS;
- direct browser insert/update/delete is revoked;
- `update_my_training_program_access_profile` is the guarded active-account mutation boundary and uses optimistic `revision` matching;
- equipment access and generator eligibility are separate: Phase 20.1 records equipment even when the current exercise logging model makes some catalogue rows ineligible for `training-program-v1`.

The source-controlled equipment/loggability audit is `supabase/release/phase20-1-equipment-loggability-audit.json`.
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

## Phase 19 muscle-volume persistence — current

Phase 19 is a versioned analytics layer rather than secondary-muscle or hypertrophy-score fields embedded directly into `workout_sets`.

The locked first methodology is `muscle-volume-v1`.

### Phase 19.4 database foundation

The Phase 19.4 foundation is implemented and provides versioned persistence for methodology identity, exercise eligibility, exercise-to-muscle contributions, benchmark bands, mapping confidence/review metadata, and guarded/RLS read boundaries.

The implementation preserves the key boundary that the browser cannot author an authoritative "effective set" value on `workout_sets`. Completed workout rows remain evidence; the methodology-versioned database model derives the interpretation.

#### Phase 19.3 / 19.3A / 19.3B matrix handoff

The reviewed source artifact remains `supabase/release/phase19-3-exercise-muscle-matrix.json`. Phase 19.3A expanded the original matrix with the dumbbell-heavy catalogue work; Phase 19.3B reconciles the later catalogue expansion and rep-based plyometric tracking model back into the same versioned artifact. Phase 19.4 and later read models consume this explicit reviewed decision set rather than deriving mappings from `exercise_catalog.primary_muscle_group`, exercise-name pattern matching, or a runtime fallback.

The persisted `muscle-volume-v1` dataset resolves canonical exercise identity by `exercise_catalog.id`, preserves explicit exclusions/deferred cases, and retains contribution/review metadata needed by the derived read model. The locked Phase 19.3B snapshot is **568 total active canonical exercises / 418 eligible / 150 excluded-deferred / 781 exercise-to-muscle contribution rows**. All 35 plyometric catalogue entries remain excluded from hypertrophy contribution scoring; 34 are rep-trackable `BODYWEIGHT_REPS` movements and Jump Rope remains duration-based.

### Phase 19.5 personalized set-quality calculation

The Phase 19.5 calculation/read model is implemented and derives set-stimulus equivalents from completed workout data **before** applying exercise-to-muscle contribution weights.

For weighted exercises with an established history, the engine reconstructs the best valid same-exercise Epley-compatible baseline that existed **before the workout being scored**. It uses the methodology's 180-day primary history window and confidence rules from [`DOMAIN-RULES.md`](DOMAIN-RULES.md). Future performance must never be allowed to rewrite an earlier workout's baseline.

Current persistence contains the evidence needed for this reconstruction:

- `exercise_progress_observations` carries user, exercise, workout, metric value, weight, reps, scoring date, validity, and creation time;
- `exercise_progress` carries the current personal-best snapshot but is not sufficient by itself for historical baseline reconstruction;
- `workout_sessions`, `workout_exercises`, `workout_sets`, and `workout_set_segments` remain the raw workout source of truth.

The calculation therefore uses chronological observations/raw workout evidence rather than reading only today's `exercise_progress.best_value` and retroactively applying it to old sets.

Derived set-quality data carries methodology-versioned stimulus credit plus confidence/source context. The browser can read the derived results through the approved read boundaries but cannot override the authoritative calculation.

### Advanced-set derivation

Advanced-set scoring uses the same logical parent/segment persistence introduced in Phase 18.7A.

- **Pyramid:** every completed stage is evaluated through the ordinary set-quality layer, then stage credits are summed. A stage can contribute `0`, `0.5`, or `1.0`; the parent remains one logical workout set.
- **Drop Set:** the first stage is scored through ordinary set quality. Valid lower-load continuation stages are fatigue-aware continuations rather than fresh-baseline sets. `muscle-volume-v1` uses `first_stage_credit × min(1 + 0.5 × valid_continuations, 2.0)` where each valid continuation has at least 2 reps, is contiguous in segment order, and lowers load from the immediately preceding stage.
- **Superset:** no multiplier/penalty; underlying sets are evaluated normally.

A first-stage Drop credit of `0` makes the chain's set-stimulus credit `0`; a first-stage credit of `0.5` with two valid continuations yields `1.0`; a first-stage credit of `1.0` with two valid continuations yields the v1 maximum `2.0`.

### Muscle aggregation and rolling read model

After set-stimulus derivation:

`muscle effective sets = set-stimulus equivalents × exercise-to-muscle contribution weight`

Contribution rows are versioned. A direct mapping uses `1.0`; a meaningful indirect mapping uses `0.5`; absent/insignificant muscles have no contribution row. Multiple muscles may receive direct `1.0` mappings when the movement justifies it.

Authenticated Phase 19 read models/RPCs derive rolling 7-day and 28-day results server-side and return methodology version, effective sets per reportable muscle, direct/indirect components, benchmark/status context, personalized/provisional confidence coverage, and descriptive set/stage counts.

Raw repetitions and stage-summed tonnage remain available for ordinary workload/history analytics but are not linearly converted into hypertrophy volume.

### Phase 19.8 muscle-performance read model

Phase 19.8 adds the performance-evidence side of the recommendation boundary. Normalized same-exercise observations are associated with reviewed direct/indirect muscle contributions and are consumed by the TypeScript performance monitor/recommendation engine.

One-off exercises may contribute to volume but do not establish an improving/plateauing/declining performance trend by themselves; the report recommendation layer requires repeated comparable evidence before using an exercise as performance-direction evidence.

### Phase 19.9 completed-period report source

Phase 19.9 now includes a database-backed exact completed-period report source and frozen monthly source snapshots.

`public.get_my_completed_training_report_period(text, date)`:

- requires authentication;
- accepts only a completed Monday–Sunday `WEEK` or a completed calendar `MONTH` in the profile timezone;
- rejects incomplete/current periods;
- uses the active methodology version;
- returns exact-period lifting facts including completed lifting sessions, active training seconds, distinct exercises, completed logical working sets, descriptive `kg × reps` volume, and PR count;
- returns one benchmark/muscle source row per methodology muscle, including period effective sets, direct/indirect components, eligible logical-set/stage counts, review flags, benchmark values, and set-quality confidence coverage;
- uses a 7-day benchmark for weekly reports and the versioned 28-day benchmark for monthly reports.

Monthly freezing is implemented through `public.freeze_my_monthly_training_report_source(date)` with a hardened internal helper boundary. The freeze is authenticated, advisory-lock protected, idempotent per user/month, and creates a verified source fingerprint.

The structured frozen source uses:

- `monthly_training_report_source_snapshots` — one parent row per user/completed month containing report version, period facts, methodology version, aggregate lifting facts, `source_fingerprint`, and `verified_at`;
- `monthly_training_report_muscle_snapshots` — frozen exact-month muscle-volume/benchmark/confidence inputs;
- `monthly_training_report_performance_snapshots` — the frozen normalized performance observations used by the monthly recommendation/report layer.

The monthly freeze captures 56 days of performance observations ending on the completed month end so the later performance/recommendation interpretation is based on the same frozen evidence. It verifies that the structured source contains all 13 methodology benchmark muscle rows before completing the snapshot.

RLS allows authenticated users to read their own snapshot rows while hiding other users' snapshots. Direct client mutation privileges are not granted for these source tables.

The user-facing report currently excludes Neck from the visible 12-muscle report, but the database snapshot intentionally preserves all 13 methodology benchmark rows so the frozen source remains complete.

### Monthly report interpretation and PDF lifecycle

The structured database snapshot is the historical source boundary. The application maps it into `CompletedTrainingReport`, combines it with the performance trend/recommendation engine, and generates the current monthly PDF in the browser with `pdf-lib`.

Private PDF retention is implemented through:

- private Storage bucket `monthly-training-reports`;
- `monthly_training_report_pdf_artifacts`, which stores one current artifact pointer per user;
- browser-side SHA-256 verification of the uploaded candidate before promotion;
- server-side verification that the candidate exists, is PDF MIME type, matches the expected byte size, and belongs to the authenticated user's verified frozen snapshot;
- a latest-only monotonic retention rule that refuses to displace a newer retained month with an older report;
- `pending_delete_path`, which preserves the previous valid artifact until replacement promotion succeeds and cleanup is confirmed;
- short-lived signed download URLs for retained private PDFs;
- ephemeral regeneration for older historical months without displacing the current retained PDF.

Privileged PDF promotion/cleanup logic lives under `report_private` as SECURITY DEFINER helpers. Public RPCs are SECURITY INVOKER wrappers. Ownership is always derived from `auth.uid()`.

Phase 19.9D removes the redundant non-unique source `(user_id, period_start DESC)` index; the existing unique `(user_id, period_start)` B-tree remains the authoritative lookup and supports the same equality/month-navigation access pattern.

### Phase 19.9 validation state

Hosted E2E validation has been completed with an authorized disposable QA account. Real hosted workout rows flowed through volume/performance derivation, the completed-period RPC, frozen monthly snapshot, TypeScript report construction, Reports UI, PDF generation, private upload/verification/promotion, and retained signed download.

The same completed month was downloaded twice and remained one PDF artifact row plus one private Storage object, validating the retained-artifact reuse path.

Repository database coverage now includes:

- `115_phase19_9b_report_source_snapshots.test.sql`;
- `116_phase19_9c_monthly_report_pdf_storage.test.sql`;
- `117_phase19_9d_report_pdf_security_capacity_hardening.test.sql`.

Generated public database types have been reconciled with the Phase 19.9 public tables/RPCs.

Project-local capacity measurements and retention conclusions are recorded in [`PHASE19-CAPACITY-VALIDATION.md`](PHASE19-CAPACITY-VALIDATION.md). Current provider billing-cycle egress/MAU/Realtime/Edge usage remains an operator check in Supabase Usage rather than an application-maintained duplicate metric.

Hosted migration history and report-specific Security Advisor state have been verified after the final Phase 19.9D DDL. Remaining release work is the final provider Usage-page confirmation and the applicable release gate/documentation closeout.

## Weekly goals and badges

Weekly target persistence represents lifting days, not general activity days. Badge/achievement persistence is non-XP unless the domain rules are explicitly changed in a later version.

## Messaging and moderation

Platform messages use durable per-recipient delivery/read/acknowledgement state. Recipient inbox deletion does not rewrite shared content or other recipients' delivery history.

User reports and moderation-case data are privacy-bounded and administrator-authorized. Historical/audit records that are intentionally retained across user deletion must not rely on a profile foreign key that would erase them accidentally.

## Database testing

Canonical database tests live under `supabase/tests/*.test.sql` and are rollback-safe pgTAP suites. Repository structural validation (`npm run db:test:ci`) does not replace applying migrations and executing relevant pgTAP tests against hosted Supabase.

See [`SUPABASE-SETUP.md`](SUPABASE-SETUP.md) and [`CI-VALIDATION.md`](CI-VALIDATION.md).
