# Phase 18.7A — Drop Sets + Pyramid Workflows

Status: **DONE**

Phase 18.7A models Drop Sets and Pyramids as **one logical workout set with multiple ordered load/repetition stages**.

The first 18.7A migration (`20260909003037_phase18_7a_advanced_sets.sql`) correctly enabled the `DROP` classification and volume inclusion, but its Pyramid helper created multiple independent Working sets. That helper was never released in the frontend. The corrective follow-up migration preserves the already-applied migration in history and replaces that shallow sequence model with segmented logical sets.

## Logical-set contract

A normal set remains unchanged:

```text
Set 2
100 kg × 5
```

An advanced set is still **one set number**:

```text
Set 3 — Drop Set
100 kg × 8
  ↓
80 kg × 10
  ↓
60 kg × 12
```

or:

```text
Set 4 — Full Pyramid
60 kg × 12
80 kg × 8
100 kg × 5
80 kg × 8
60 kg × 12
```

The child rows are stages inside that one logical parent set. They are not separate workout-set numbers and do not inflate existing completed-set counts.

This Phase 18 structural rule is intentionally distinct from the later Phase 19 muscle-volume analytics rule. A logical parent can remain one set for workout/history/XP semantics while its stages contribute multiple or fractional **set-stimulus equivalents** to muscle-volume reporting.

## Persistence

`public.workout_sets` remains the authoritative logical-set row.

It gains `set_variant`:

- `STANDARD`
- `DROP`
- `ASCENDING_PYRAMID`
- `FULL_PYRAMID`

`public.workout_set_segments` stores ordered child stages:

- `workout_set_id`
- `segment_index`
- `weight_kg`
- `reps`

Ordinary sets do not need segment rows.

Advanced-set writes are atomic. Saving one advanced set replaces its complete ordered segment list and updates the parent row in the same database transaction.

## Drop Sets

A Drop Set:

- is one logical set with `set_type = 'DROP'` and `set_variant = 'DROP'`;
- supports 2–8 independently editable load/repetition stages;
- has no enforced percentage-drop rule;
- contributes every completed stage to total lifting tonnage/volume-load;
- remains excluded from existing Working-set XP/progression qualification, matching the established `lifting-v1` classification contract;
- receives no bonus XP and no special PR formula.

## Ascending Pyramid

An Ascending Pyramid:

- is one logical `WORKING` set;
- supports 2–8 independently editable stages;
- uses `set_variant = 'ASCENDING_PYRAMID'`;
- does not enforce increasing load or decreasing reps;
- counts once as a completed Working set for the existing `lifting-v1`/Phase 18 logical-set contract;
- sums every stage into lifting tonnage/volume-load.

## Full Pyramid

A Full Pyramid:

- is one logical `WORKING` set;
- supports 3–8 independently editable stages;
- uses `set_variant = 'FULL_PYRAMID'`;
- does not enforce a specific rise/fall shape;
- counts once as a completed Working set for the existing `lifting-v1`/Phase 18 logical-set contract;
- sums every stage into lifting tonnage/volume-load.

## Phase 19 muscle-volume interpretation

Phase 19 does **not** change any Phase 18 persistence, set numbering, recovery, history, XP, or progression behavior above. It adds a separate non-XP analytics interpretation for muscle-group training volume.

Phase 19.2 locks the first methodology as `muscle-volume-v1`. The advanced-set formulas below replace the earlier provisional "every Pyramid stage = 1.0" / "first Drop stage = 1.0" assumption.

### Shared set-quality layer

A logged Working label alone does not guarantee full hypertrophy-volume credit. For users with established same-exercise history, Top Set compares a stage/set against the **pre-workout personal performance baseline** and assigns a coarse set-quality credit:

- baseline-relative performance `>= 0.90` -> `1.0`;
- `0.80–<0.90` -> `0.5`;
- `<0.80` -> `0`.

This is a personalized **set-quality proxy**, not factual RIR. New/sparse-history users receive provisional credit with low confidence instead of a fabricated individualized estimate. Full baseline, confidence, one-rep, high-rep, and Failure-set rules are defined in [`DOMAIN-RULES.md`](DOMAIN-RULES.md).

### Pyramids

Each completed Pyramid stage is evaluated through the shared set-quality layer and the stage credits are summed:

```text
pyramid set-stimulus equivalents = sum(stage_quality_credit)
```

Therefore, a five-stage Pyramid can contribute anywhere from `0` to `5.0` set-stimulus equivalents. This avoids both extremes: collapsing substantial set-like work into a single effective set, or blindly awarding full credit to every logged stage regardless of how demanding it was.

The Pyramid remains **one logical parent set** for Phase 18 workflow, history, recovery, completed-set counts, and `lifting-v1` XP semantics.

### Drop Sets

Drop continuations occur under accumulated fatigue and are not evaluated as fresh, fully rested sets against the user's normal baseline.

The first stage is evaluated using the normal set-quality method. Continuations then use the locked v1 fatigue-aware formula:

```text
drop set-stimulus equivalents =
  first_stage_credit × min(1 + 0.5 × valid_continuations, 2.0)
```

A continuation is valid for this calculation only when it:

- follows contiguously in segment order;
- has at least 2 repetitions;
- uses a lower load than the immediately preceding stage.

Examples:

```text
First-stage quality = 1.0
100 kg × 8
80 kg × 10   valid continuation
60 kg × 12   valid continuation
--------------------------------
Phase 19 v1 = 1.0 × min(1 + 0.5×2, 2.0) = 2.0
```

```text
First-stage quality = 0.5
100 kg × 4
80 kg × 8    valid continuation
60 kg × 10   valid continuation
--------------------------------
Phase 19 v1 = 0.5 × min(1 + 0.5×2, 2.0) = 1.0
```

If the first stage scores `0`, the Drop chain contributes `0` set-stimulus equivalents. Extra stages after the multiplier cap still contribute to raw repetition/tonnage analytics but do not add further `muscle-volume-v1` credit.

The continuation coefficient and cap remain a **methodology-versioned Top Set calibration**, not a claim that research has established a universal drop-stage-to-rested-set conversion.

### Muscle contribution comes after advanced-set scoring

Advanced-set stimulus is calculated first. Exercise-to-muscle contribution is then applied independently in Phase 19.3.

For example, if a Bench Press Drop Set earns `2.0` set-stimulus equivalents and Bench maps to Chest `1.0`, Triceps `0.5`, and Shoulders `0.5`, it contributes:

```text
Chest      2.0
Triceps    1.0
Shoulders  1.0
```

Raw stage repetitions and stage-summed tonnage remain descriptive workload data. They are not converted linearly into hypertrophy credit.

Superset membership creates no additional multiplier or penalty beyond the underlying set/stage rules.

This distinction remains deliberate: **logical workout structure and hypertrophy-oriented volume analytics are separate domain concepts.**

## Progression compatibility

Pyramid stages use the normal Epley rule already used by `lifting-v1`.

When an advanced Pyramid is saved, the parent Working row mirrors the stage with the best ordinary 1–12-rep Epley estimate. This preserves the existing progression engine without inventing a second PR formula or counting each child stage as an independent workout set for progression/XP.

Drop Sets keep `set_type = 'DROP'`, so their stages remain outside Working-set progression/XP evidence while still contributing ordinary lifting volume and, once Phase 19.5 is implemented, their methodology-defined muscle-volume credit.

## Recovery and offline replay

The mutation queue replaces the obsolete `ADD_SET_SEQUENCE` path with:

- `ADD_ADVANCED_SET`
- `SAVE_ADVANCED_SET`

`SAVE_ADVANCED_SET` carries the entire ordered segment array plus the parent expected revision. A replay therefore either applies the whole advanced set or fails/conflicts as one revision-safe mutation; it cannot leave a half-saved Pyramid or Drop Set.

Recovery snapshots preserve both persisted child stages and unsaved stage drafts.

## Copy/delete/history

- Copying an advanced set copies the parent pattern and every segment into one new incomplete logical set.
- Deleting the parent cascades its segments.
- Workout History reloads the original pattern and segment order.
- Completed History displays all stages inside the same set number.

## Security

`workout_set_segments` is RLS-enabled.

Authenticated users receive read access only to segments belonging to their own workouts. Client writes are not granted; all segment mutation goes through guarded authenticated RPCs.

The obsolete `add_lifting_workout_working_set_sequence(uuid, integer)` RPC is removed by the corrective migration. The migration fails closed if any `ADD_SET_SEQUENCE` receipt unexpectedly exists before retirement.

## Validation

Targeted validation covers:

- advanced-set creation by pattern;
- independent stage editing within one logical set;
- stage add/remove without creating extra parent set numbers;
- canonical kg/lb conversion for every stage;
- completion validation across every stage;
- atomic/offline `SAVE_ADVANCED_SET` serialization;
- revision-conflict handling;
- recovery of persisted and unsaved stages;
- copy/delete behavior;
- History reconstruction and display;
- full stage-summed session/weekly/monthly tonnage/volume-load;
- one logical Working-set count for a Pyramid under existing `lifting-v1` semantics;
- Pyramid parent compatibility mirror for normal E1RM;
- Drop classification/volume semantics;
- RLS and function grants;
- removal of the obsolete sequence helper.

Validation completed successfully. The corrective segmented-set migration is deployed in production and the full release gate is green.

Phase 19.2 methodology is now locked in documentation. The exercise contribution matrix follows in Phase 19.3, versioned persistence in Phase 19.4, and the personalized set-stimulus/effective-volume engine in Phase 19.5.
