# Phase 20 — Personalized Training Programs

Status: **20.2 IMPLEMENTED - hosted validation pending; 20.3 follows after closeout**
Phase 20 adds structured, personalized four-week lifting programs while preserving Top Set's existing workout, scoring, Phase 19 analytics, recovery, and security boundaries. The program layer is a planning/template system, not a second workout engine.

## 20.0 contract

The first methodology identifier is `training-program-v1`.

A generated program is a four-week training block that can begin on any date. Initial goals are `STRENGTH`, `HYPERTROPHY`, and `BALANCED`. A user chooses 1–6 lifting sessions per week. Identical generator version + identical persisted input snapshot must produce the same program; v1 does not use random exercise swapping.

## Existing-system boundaries

- `exercise_catalog.id` remains canonical exercise identity.
- Program sessions launch into the ordinary lifting workflow.
- Workout/session/set history remains authoritative evidence.
- `lifting-v1` remains authoritative for XP/scoring.
- `muscle-volume-v1` remains authoritative for effective-volume interpretation.
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

## 20.1 implementation â€” equipment/access profile

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

## Evidence background

- ACSM 2026 resistance training guideline summary: https://acsm.org/resistance-training-guidelines-update-2026/
- ACSM position stands: https://acsm.org/education-resources/pronouncements-scientific-communications/position-stands/
- NSCA, Determination of Resistance Training Frequency: https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/

## 20.0 exit criteria

20.0 is complete when the methodology/scope, safety semantics, persistence responsibilities, four-week / 1–6-session / max-8-exercise structure, loggable-measurement boundary, reproducibility rules, and Phase 19 dependency are explicit and unit-tested. 20.1 can then implement equipment/access persistence and resolve catalogue-equipment gaps.
