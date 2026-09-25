# Phase 20 — Personalized Training Programs

Status: **20.6 IMPLEMENTED — program UI/PDF and personalization are in closeout validation; 20.7 release validation follows**
Phase 20 adds structured, personalized four- or eight-week lifting programs while preserving Top Set's existing workout, scoring, Phase 19 analytics, recovery, and security boundaries. The program layer is a planning/template system, not a second workout engine.

## 20.0 contract

The first methodology identifier is `training-program-v1`.

A generated program is a four-week training block that can begin on any date. Initial goals are `STRENGTH`, `HYPERTROPHY`, and `BALANCED`. A user chooses 1–6 lifting sessions per week. Identical generator version + identical persisted input snapshot must produce the same program; v1 does not use random exercise swapping.

## Existing-system boundaries

- `exercise_catalog.id` remains canonical exercise identity.
- Program sessions launch into the ordinary lifting workflow.
- Workout/session/set history remains authoritative evidence.
- `lifting-v1` remains authoritative for XP/scoring.
- `muscle-volume-v2` is the active development methodology for effective-volume interpretation.
- Phase 19 performance/volume read models supply personalization signals instead of being reimplemented.
- The existing preset start boundary caps one generated session at 8 exercises.
- Live workout editing remains allowed; editing/skipping a session does not rewrite history to force plan compliance.

## Initial loggable-exercise boundary

`training-program-v1` may generate only exercises the current set engine can complete normally: `WEIGHT_REPS` and `BODYWEIGHT_REPS`.

`DURATION` and `OTHER` are not generator-eligible until their normal workout-set completion semantics are deliberately supported. This is a Phase 20.1 dependency: all 15 current `BAND` exercises are `OTHER`, so a band-only profile cannot honestly produce a fully loggable v1 program yet. 20.1 must reconcile appropriate band logging semantics or fail closed instead of promising an unusable program.

## Program structure

A valid program contains exactly four weeks and exactly the requested session count in each week. Each session contains 1–8 unique canonical exercises in stable contiguous order. Exercise prescriptions carry working-set count, rep range, optional target load, explicit bodyweight load mode where applicable, and optional Superset structure.

The v1 generator does not automatically prescribe Drop Sets, Pyramids, failure sets, AMRAP/max-effort tests, or 1RM testing. Users may still edit the launched workout using existing controls.

## Personalization inputs

20.2 may consume only explicit/reviewable inputs: goal, requested weekly frequency, 20.1 equipment/access profile, explicit exclusions/preferences, established same-exercise history/E1RM evidence, Phase 19 muscle-volume state, Phase 19 performance/recommendation state, and active catalogue/mapping metadata.

Sparse history reduces precision. If Top Set lacks evidence for a defensible load target, prescribe sets/reps and leave load selection open rather than inventing a max.

## Safety and physical-limitation boundary

Physical-limitation or injury input is an exclusion constraint only. Top Set may exclude explicitly restricted exercises/movement patterns/equipment and may offer an alternative only when it satisfies all remaining hard constraints.

Top Set must not diagnose an injury/condition, interpret pain or symptoms, provide rehabilitation/return-to-play protocols, claim a substitute is medically safe, infer medical clearance, or silently override an explicit exclusion to preserve target volume. If no supported substitute remains, fail honestly.

Free-text notes may later be retained for the user's own context, but v1 generation must not parse diagnosis-like free text into medical recommendations.

## Load / volume / progression boundaries

Precise load is optional. Established same-exercise evidence may support a starting load; sparse/incompatible history must not produce fabricated precision. Added-weight/assisted prescriptions must respect `supports_added_weight` / `supports_assisted`.

Phase 20 consumes Phase 19 rather than creating another hypertrophy model. It must preserve explicit exercise-to-muscle mappings, avoid treating raw `sets × reps × load` as hypertrophy credit, never count Phase 19-ineligible work as if it satisfied effective-set targets, and adapt only from completed evidence in 20.5.

ACSM's 2026 resistance-training position stand supports the product direction toward consistency, individualization, repeated major-muscle exposure, and goal-specific volume/load. Top Set's exact runtime benchmark/status semantics remain `muscle-volume-v1`.

## Planned persistence model

20.0 locks responsibilities; tables land in the slices that use them.

### `training_program_profiles`
User-owned goal, requested sessions/week, access mode (`COMMERCIAL_GYM` or custom), revision, timestamps. 20.1 owns equipment details.

### `training_program_constraints`
User-owned explicit equipment/exercise/movement exclusions and preferences, optional user-visible note, revision/timestamps. Physical limitations are persisted as exclusion intent, not diagnosis.

### `training_programs`
User ownership, `training-program-v1`, goal/frequency, four-week block dates, status (`DRAFT`, `ACTIVE`, `COMPLETED`, `ARCHIVED`), immutable generation-input snapshot metadata, Phase 19 methodology reference, revision/adaptation metadata, timestamps. Initial contract: at most one ACTIVE program per user.

### `training_program_workouts`
Parent program, week index, session index, title/focus, stable ordering. Schedule slots are guidance; a late/early workout does not falsify workout history.

### `training_program_exercises`
Parent workout, canonical exercise id, stable order, working-set count, rep range, optional target load, bodyweight mode, optional Superset metadata, and generator intent metadata needed for later substitution. Launch copies structure into the normal workout model.

### Adaptation history
20.5 should append revisions/adaptation records rather than silently rewriting completed weeks. Persist changed fields, source revision, new revision, triggering evidence window, and user-facing reason codes. Do not persist private chain-of-thought or hidden model reasoning.

## Reproducibility snapshot

Persist generator version, generation timestamp, history cutoff date, `muscle-volume-v1` version, program-profile revision, and constraint revision. This explains which state produced the program without hidden reasoning.

## Fail-closed rules

Generation fails when an exercise is inactive/unresolved, equipment is unavailable, an exercise is explicitly excluded, a requested bodyweight mode is unsupported, a session exceeds 8 exercises, an exercise is duplicated, a prescription is structurally invalid, or no valid substitution preserves hard constraints. Never relax equipment or limitation exclusions silently.

## 20.1 prerequisite

Equipment/access work begins with an equipment-to-loggable-exercise audit. Commercial-gym mode may assume normal full access, but exercises still must be active/loggable/not excluded. Custom/home mode never assumes unselected rack, bench, pull-up bar, cable station, machine, band, or specialty implement.

The current BAND/`OTHER` mismatch must be resolved before band-only program generation is enabled.

## 20.1 implementation — equipment/access profile

Phase 20.1 persists the user's program-generation equipment boundary without silently assuming a training environment.

### Access modes

- `COMMERCIAL_GYM` means ordinary full commercial-gym access. The persisted row stores no custom equipment list.
- `CUSTOM` means home, private, hotel, limited-gym, or otherwise explicit access. Only selected equipment keys are persisted.
- A **missing row means not configured**. Top Set does not default an unconfigured user to commercial-gym access.
- `CUSTOM` with an empty equipment list is valid and represents a bodyweight-only setup.

The commercial-gym assumption covers common free weights, rack/bench access, cable stations, ordinary resistance machines, pull-up/dip stations, kettlebells, landmine, and common functional equipment. Specialty bars and strongman implements are not silently assumed.

### Equipment taxonomy

The persisted v1 keys are:

`DUMBBELLS`, `BARBELL`, `RACK`, `BENCH`, `PULL_UP_BAR`, `DIP_STATION`, `CABLE_STATION`, `MACHINES`, `BANDS`, `KETTLEBELLS`, `LANDMINE`, `RINGS`, `PLYOMETRIC_BOX`, `GHD_BACK_EXTENSION`, `MEDICINE_BALL`, `SPECIALTY_BARS`, `STRONGMAN`.

The profile records **access**, not a promise that every exercise associated with that equipment is generator-eligible.

### Catalogue/loggability audit

The locked 2026-09-22 audit contains **568 active exercises / 512 program-loggable / 56 deferred by the current logging model**.

Notable workout-type coverage:

- Dumbbell 93/93
- Barbell 60/60
- Cable 52/52
- Bodyweight 69/69
- Landmine 18/18
- Olympic/Power 13/13
- Machine 87/89
- Kettlebell 49/53
- Plyometric 34/35
- Specialty 28/32
- Strongman/Carry/Sled 9/22
- Band 0/15
- Medicine Ball 0/8
- Isometric 0/9

`WEIGHT_REPS` and `BODYWEIGHT_REPS` are the only v1 generator-loggable measurement types. This remains deliberately narrower than the exercise picker.

Bands and medicine balls therefore remain selectable in the access profile but are explicitly marked as profile-only for v1 generation. We do **not** relabel band resistance as kilograms or misuse bodyweight load modes merely to make those exercises appear supported.

Exact exercise-to-equipment requirements are a Phase 20.2 concern. `workout_type` alone is not sufficient: for example, some bodyweight movements require a pull-up bar, dip station, rings, bench, or GHD while others require no equipment.

### Persistence and authorization

`training_program_profiles` is user-owned and RLS-protected.

- authenticated users can read only their own row;
- browser callers cannot insert/update/delete rows directly;
- `update_my_training_program_access_profile` is the sole self-service mutation boundary;
- the RPC requires an active account, validates and normalizes equipment keys, and uses optimistic revision control;
- stale profile writes fail closed rather than overwriting another tab/device;
- no program-profile mutation creates XP, badges, workout history, or Phase 19 volume data.

The Settings â†’ Training surface is the editor for this profile.

### 20.1 exit

Phase 20.1 is complete when the persisted profile, RLS/RPC boundary, settings editor, source-controlled equipment taxonomy, and 568/512 loggability audit pass focused validation and the hosted migration/pgTAP/type-regeneration gate.
## 20.2 implementation - deterministic program generator

20.2 implements the first deterministic four-week generator without introducing durable program instances yet.

- `training_program_profiles` now has nullable `goal` and `sessions_per_week`; existing profiles remain unconfigured until both values are explicitly saved.
- `get_my_training_program_candidate_catalog()` returns the locked 512 active `WEIGHT_REPS` / `BODYWEIGHT_REPS` exercises with bodyweight capabilities plus `muscle-volume-v1` eligibility and contribution metadata.
- The generator uses only the 418 Phase-19-eligible exercises when filling muscle-target slots.
- Exercise-to-equipment resolution is explicit and fail-closed. Common workout types map to required equipment, and bodyweight/barbell/dumbbell/plyometric edge cases add rack, bench, pull-up bar, dip station, rings, box, or other represented requirements.
- Exercises whose required implement is not represented by the 20.1 equipment taxonomy are not generated.
- Commercial-gym mode does not silently assume rings, specialty bars, or strongman implements.
- Frequency templates are deterministic: full-body for 1-3 days, upper/lower for 4 days, upper/lower/push/pull/legs for 5 days, and push/pull/legs variants for 6 days.
- Candidate ranking uses reviewed muscle contribution, goal, compound/accessory intent, established same-exercise history, conventional foundation-movement preference, and prior use inside the block. Canonical name/id are final tie-breakers.
- A weight target is reused only from established same-exercise history when at least 3 observations / 2 sessions exist and the observed best-set reps already fall inside the generated rep range. Otherwise target load remains null.
- Phase 19 seven-day `ADD_VOLUME_CAUTIOUSLY` and `REDUCE_VOLUME_CAUTIOUSLY` actions may move a selected exercise by one working set only, bounded to 2-4 working sets.
- Generated bodyweight work begins in plain `BODYWEIGHT` mode. Added/assisted loading is not inferred.
- 20.2 output is a validated `training-program-v1` definition. Durable program persistence remains Phase 20.4.
- Physical-limitation/exercise exclusions and substitutions remain Phase 20.3 and must be applied before persistence.

## 20.3 implementation - constraints and substitution

20.3 adds an independently revisioned per-user exercise-constraint snapshot.

- `EXCLUDE` is hard and is applied before generator ranking.
- `PREFER` is a bounded ranking signal only and never overrides equipment, logging support, volume eligibility, contribution role, or another hard exclusion.
- reasons are limited to `PREFERENCE`, `PHYSICAL_LIMITATION`, `UNAVAILABLE`, and `OTHER`.
- free-text diagnosis fields are not stored and unexpected payload properties are rejected.
- physical-limitation intent is treated only as an exclusion request; Top Set does not infer diagnosis, rehabilitation, clearance, or medical safety.

Generated prescriptions now retain:
- granular `targetMuscleGroup` from `muscle-volume-v2`;
- `targetContributionRole` (`DIRECT` or `INDIRECT`);
- actual selection intent (`COMPOUND` or `ACCESSORY`).

The deterministic substitution engine must preserve all three, plus measurement semantics and equipment compatibility. It also avoids occupied exercises, persisted hard exclusions, and temporary unavailable exercises. Added/assisted bodyweight substitutions must support the original load mode.

If no compatible replacement exists, substitution returns no result rather than weakening a hard constraint.

The generator now records the real independent constraint revision in its source snapshot. Primary exercise browsing taxonomy remains broad (`BACK`, `SHOULDERS`, etc.); granular Phase 19 groups are used only for analytics/programming intent.

User-facing constraint and substitution controls remain deferred to the later Phase 20 UI slice.

## 20.3A implementation - configuration and scheduling

20.3A replaces the fixed four-week / implicit-split generator boundary with an explicit deterministic configuration contract.

### Duration

- `training-program-v1` supports exactly 4 or 8 weeks.
- 4 weeks remains the default product choice, but generation receives the duration explicitly.
- An 8-week program continues the same deterministic framework. 20.3A does not fabricate progression into weeks 5-8; adaptive progression remains Phase 20.5.
- The generated session count is always `durationWeeks x sessionsPerWeek`.

### Start date and weekdays

- The user supplies a calendar `startDate` as `YYYY-MM-DD`.
- The user selects exactly one distinct weekday for each requested weekly session.
- Calendar dates are date-only values; timezone is used by the UI only to determine the users local today.
- Program week 1 is the seven-day interval beginning on `startDate`.
- The first planned workout is therefore the first selected training weekday on or after `startDate`.
- Every seven-day program week contains exactly the requested session frequency.
- Each planned workout stores an exact `scheduledDate`.
- Missing a planned date does not silently shift future dates.

### Split registry

`AUTO` remains available, but it resolves to a named explicit split so the source snapshot is reproducible.

Compatible explicit splits are:

- 1 day: Full Body
- 2 days: Full Body A/B; Upper/Lower
- 3 days: Full Body A/B/C; Push/Pull/Legs; Upper/Lower/Full Body
- 4 days: Upper/Lower x2; Push/Pull/Upper/Lower
- 5 days: PPL/Upper/Lower; Upper/Lower/PPL
- 6 days: PPL x2; Upper/Lower x3

An incompatible requested split fails closed. The immutable source snapshot records both `requestedSplit` and `resolvedSplit`.

### Planned versus actual execution

A planned program workout remains guidance rather than workout history.

- `PLANNED` and `MISSED` states have no workout-session id.
- `COMPLETED_PROGRAMMED` links the planned workout to the ordinary Top Set workout session launched from it.
- `COMPLETED_OWN_WORKOUT` also links the planned slot to an ordinary workout session while preserving that the user chose their own workout.
- Actual workout exercises/sets remain authoritative for Phase 19 volume, history, E1RM/performance, PRs, XP, and future Phase 20.5 adaptation.
- A planned template earns no training credit by itself.
- No XP penalty is attached to doing an own workout or missing a planned workout.
- 20.4 will persist the source-program / source-planned-workout lineage; 20.3A defines the domain invariant first.

### Persistence boundary

20.3A intentionally adds no database migration. Goal, frequency, and equipment remain reusable user-profile settings. Duration, dates, weekdays, and split describe one generated program instance and belong in the immutable program source/configuration snapshot that Phase 20.4 will persist.

## 20.4 implementation - durable program persistence

20.4 persists the generated definition without creating a second workout engine.

### Durable program model

- `training_programs` stores user ownership, lifecycle, duration/frequency, exact calendar bounds, immutable source snapshot, Phase 19 methodology, profile/constraint revisions, requested/resolved split, and program revision.
- `training_program_workouts` stores exact planned dates/titles plus execution lineage.
- `training_program_exercises` stores the reviewed canonical exercise, granular v2 target, direct/indirect contribution role, compound/accessory intent, set/rep prescription, optional load, bodyweight mode, and Superset structure.
- Catalogue exercise foreign keys use `ON DELETE RESTRICT` so a historical plan cannot be silently rewritten by catalogue deletion.
- At most one `ACTIVE` program is permitted per user.

### Security and mutation boundary

The three tables are browser-read-only and RLS-scoped to the owner. Program creation/lifecycle/launch/link/missed mutations go through active-account-guarded RPCs with explicit execute grants and pinned empty search paths.

Creation validates the current canonical exercise and measurement type, bodyweight load capabilities, v2 volume eligibility, exact target contribution role, contiguous exercise order, and valid Superset membership before committing the program atomically.

### Launch into the ordinary workout engine

`launch_my_training_program_workout` calls the existing guarded preset-start boundary instead of creating a new workout model. It then seeds ordinary editable `WORKING` set rows from the planned working-set count and optional starting load/bodyweight mode.

Prescribed rep ranges remain on the plan. Actual workout-set reps stay null until the user records them. Therefore merely launching or planning a workout does not fabricate completed training evidence.

Program launch introduces two persisted in-progress lineage states:

- `STARTED_PROGRAMMED`
- `STARTED_OWN_WORKOUT`

The existing ordinary workout remains authoritative. A `workout_sessions` status trigger maps a linked completed session to `COMPLETED_PROGRAMMED` / `COMPLETED_OWN_WORKOUT`; cancelling the linked in-progress session returns the planned slot to `PLANNED`.

### Own workout and missed workout

A user may link an ordinary in-app strength session to a planned slot as their own workout. The prescribed template remains unchanged while the actual session remains authoritative for analytics/scoring.

A missed planned slot stores `MISSED` with no fabricated workout-session id. It creates no XP, Phase 19 volume, PR, E1RM, or history evidence.

### 20.5 boundary

20.4 deliberately persists the immutable baseline plan and execution lineage only. Adaptive progression must append explicit revisions/adaptation history in 20.5 rather than silently rewriting already-completed evidence.

## 20.5 implementation - adaptive progression

20.5 adds deterministic, append-only adaptation driven only by completed ordinary workout evidence. It does not rewrite completed training history, started sessions, missed slots, or the immutable generation source snapshot.

### Evidence and trigger boundary

- A linked `COMPLETED_PROGRAMMED` or `COMPLETED_OWN_WORKOUT` session is the only adaptation trigger.
- The ordinary completed workout and its actual completed sets remain authoritative.
- The same completed workout may be evaluated only once. `NO_CHANGE` evaluations are persisted too, so a retry cannot accidentally progress the program twice.
- Only later `PLANNED` / unlinked exercise prescriptions can change.
- A current hard exercise exclusion blocks adaptation of that future exercise.
- Drop Sets, Pyramids, Failure sets, and other non-standard completed-set edits do not automatically drive load or repetition progression.

### Load and repetition progression

`training-program-adaptation-v1` uses a conservative double-progression boundary.

- For weighted exercises with no load target, sufficiently completed standard working sets may establish a future target from the minimum successful completed load.
- For weighted exercises with an existing target, all required standard working sets must reach the top of the current rep range at at least the target load before future load increases.
- The client policy uses an approximately 2.5% load step rounded to a quarter kilogram; the mutation boundary independently caps a single automatic increase at 10%.
- A poor or incomplete workout never automatically reduces prescribed load.
- Plain-bodyweight work that completes all required standard working sets at the top of its rep range may advance both rep bounds by one.
- Automatic added-weight and assisted-bodyweight progression remains deferred in adaptation v1.

### Phase 19 volume integration

20.5 consumes the existing `muscle-volume-v2` seven-day performance-aware recommendation engine. It does not create another hypertrophy/volume model.

- Only `ADD_VOLUME_CAUTIOUSLY` / `REDUCE_VOLUME_CAUTIOUSLY` can alter future working-set counts.
- A future prescription must target the same granular muscle as a `DIRECT` contribution.
- One selected future prescription changes by only one working set and remains inside the 2-4 generator adaptation band.
- At most two future prescriptions are adjusted for one Phase 19 signal in one adaptation.
- Load/rep progression and volume changes are not stacked onto the same future prescription when another bounded option is unavailable.
- `MONITOR`, `MAINTAIN`, `HOLD_AND_REVIEW`, insufficient evidence, and sub-one-set changes are recorded as hold/no-change reasons rather than forced changes.

### Audit and revision model

`training_program_adaptations` records the trigger workout, source/result program revision, evidence-through date, outcome, reason codes, and compact evidence snapshot.

`training_program_adaptation_changes` records each changed future exercise field with old value, new value, and bounded reason code.

An applied adaptation increments the program revision exactly once and increments each affected planned-workout revision once. A `NO_CHANGE` evaluation leaves the program revision untouched.

No private chain-of-thought or hidden model reasoning is persisted. The audit contains reviewable completed-set facts, Phase 19 signal summaries, changed fields, and user-facing reason codes.

### Security boundary

Adaptation context is a `SECURITY INVOKER` read using existing owner RLS. The apply RPC is the narrow privileged mutation boundary: active-account guard, ownership checks, optimistic program revision, completed-trigger verification, exact future-PLANNED targeting, current exclusion checks, bounded field mutations, and explicit authenticated-only execute grants.

## 20.6 implementation — program UI, printable plan, volume controls, and guided limitations

20.6 exposes the planning layer through the authenticated `/program` route, entered from Lift. The Program surface remains associated with Lift rather than becoming a new primary navigation destination. Program-owned equipment/training-preference links deep-link to `/settings/training` and preserve a clear return path to `/program`.

Creation supports 1–6 sessions per week, four- or eight-week blocks, exact weekdays, and the existing deterministic split registry. A program cannot start before the current calendar day in the user's configured profile timezone. Display labels use slash separators between workout days; internal enum values remain stable persistence/domain identifiers.

Draft and active programs are persisted through the Phase 20.4 model. Saved weeks are collapsible to keep long programs usable on phones. Launching a programmed workout still seeds the ordinary lifting workflow; Phase 20 never becomes a second set-completion or XP engine. Own-workout and missed-workout paths remain explicit.

The planned-workout volume control stores a nullable user override separately from the system recommendation. `working_sets` remains the recommendation/adaptation baseline; `user_working_sets_override` is the user's current planned prescription. Program launch uses the override when present and falls back to the recommendation otherwise. The adjustment boundary is revision-guarded and audited.

Personal volume learning consumes reviewed Phase 19 muscle-stimulus history through `get_my_weekly_muscle_volume_history`. The implementation is an evidence-weighted personalization heuristic, not a causal estimator of an individual's optimal training volume. Low-evidence users retain the population benchmark as the dominant prior.

The Injuries & physical limitations flow is intentionally non-diagnostic. Users may identify an affected area and movement restrictions to obtain exercise suggestions for review. Suggestions do not become constraints automatically. Only exercises explicitly confirmed by the user are persisted through the existing `EXCLUDE + PHYSICAL_LIMITATION` constraint boundary. Manual exercise exclusion remains available. Top Set does not infer diagnosis, rehabilitation, or medical safety from the selected area or movement.

The downloadable PDF is a snapshot of the current persisted program, not an authoritative execution record. It is designed for printing and includes blank write-in fields for actual sets, load/weight, reps, and completion so a user can carry the plan offline on paper.

20.6 database/support migrations in the current working release line are:

- `20260924014131_phase20_6_program_ui_workflow_support.sql`
- `20260924015313_phase20_6_training_program_substitution_ui_boundary.sql`
- `20260924015542_phase20_6_remove_duplicate_substitution_overload.sql`
- `20260924230116_phase20_6_user_volume_overrides.sql`
- `20260924230130_phase20_6_personal_volume_history.sql`

The public generated database types must be regenerated from the linked hosted project after these migrations. 20.7 owns the final full regression, hosted verification, advisor review, documentation reconciliation, and release decision.

## Evidence background

- ACSM 2026 resistance training guideline summary: https://acsm.org/resistance-training-guidelines-update-2026/
- ACSM position stands: https://acsm.org/education-resources/pronouncements-scientific-communications/position-stands/
- NSCA, Determination of Resistance Training Frequency: https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/

## 20.0 exit criteria

20.0 is complete when the methodology/scope, safety semantics, persistence responsibilities, four-week / 1–6-session / max-8-exercise structure, loggable-measurement boundary, reproducibility rules, and Phase 19 dependency are explicit and unit-tested. 20.1 can then implement equipment/access persistence and resolve catalogue-equipment gaps.


## 20.7 first-run tutorial and release-readiness UX

Before the final Phase 20 release gate, new users receive a versioned interactive product tutorial after profile onboarding. Completion is stored per account in `profiles.tutorial_completed_version`; version zero means the current tutorial has not been completed or skipped. Completion is monotonic through `complete_my_tutorial`, so an older client cannot lower a newer completion marker.

The tutorial teaches directly on the real production screens. A fixed coach and responsive spotlight guide the user through Home, Lift, Program, Progress, Groups, Compete, and Settings while the underlying screen is the same screen they will use after the tutorial. The final step can launch the user's first lift, open Program setup, or go Home.

The walkthrough is replayable from Settings → Help & tutorial. Replaying does not require resetting account state. Physical-limitation examples remain non-diagnostic and emphasize that suggested exercises are for review until the user explicitly confirms an exclusion.


The platform message center is intentionally not mounted while tutorial mode is active. Tutorial controls own the temporary modal/focus layer; inbox triggers and platform popups return immediately after the tutorial exits.


Tutorial screen content is synthetic by design. The walkthrough renders the same production screen components used by the app, but supplies dedicated demo profile, workout, progress, Program, group, competition, and Settings fixtures. Real account-owned values are not loaded into the tutorial presentation. Tutorial completion still persists against the authenticated account through the versioned tutorial RPC.
