# Phase 18.7A — Drop Sets + Pyramid Workflows

Status: **IN VALIDATION**

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

The child rows are stages inside that one logical parent set. They are not separate workout-set numbers and do not inflate completed-set counts.

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
- contributes every completed stage to total lifting volume;
- remains excluded from existing Working-set XP/progression qualification, matching the established `lifting-v1` classification contract;
- receives no bonus XP and no special PR formula.

## Ascending Pyramid

An Ascending Pyramid:

- is one logical `WORKING` set;
- supports 2–8 independently editable stages;
- uses `set_variant = 'ASCENDING_PYRAMID'`;
- does not enforce increasing load or decreasing reps;
- counts once as a completed Working set;
- sums every stage into lifting volume.

## Full Pyramid

A Full Pyramid:

- is one logical `WORKING` set;
- supports 3–8 independently editable stages;
- uses `set_variant = 'FULL_PYRAMID'`;
- does not enforce a specific rise/fall shape;
- counts once as a completed Working set;
- sums every stage into lifting volume.

## Progression compatibility

Pyramid stages use the normal Epley rule already used by `lifting-v1`.

When an advanced Pyramid is saved, the parent Working row mirrors the stage with the best ordinary 1–12-rep Epley estimate. This preserves the existing progression engine without inventing a second PR formula or counting each child stage as an independent workout set.

Drop Sets keep `set_type = 'DROP'`, so their stages remain outside Working-set progression/XP evidence while still contributing volume.

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
- full stage-summed session/weekly/monthly volume;
- one logical Working-set count for a Pyramid;
- Pyramid parent compatibility mirror for normal E1RM;
- Drop classification/volume semantics;
- RLS and function grants;
- removal of the obsolete sequence helper.

After targeted validation, run migration-history/dry-run checks and a live production preflight before applying the corrective migration. Do not release the frontend until the corrective production migration and full release gate are both green.
