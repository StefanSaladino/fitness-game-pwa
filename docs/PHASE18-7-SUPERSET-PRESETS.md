# Phase 18.7 — Supersets in Preset Workouts

Status: **IN VALIDATION**

Phase 18.7 allows curated lifting presets to declare Superset structure while preserving Top Set's existing exercise, set, scoring, recovery, and progression models.

## Contract

Preset definitions may contain optional Superset groups by canonical exercise name.

Starting a Superset preset:

1. resolves the same active catalogue exercise ids used by existing presets;
2. validates that every Superset member belongs to that preset;
3. calls the existing guarded preset-start boundary inside one database transaction;
4. applies generated Superset group ids and zero-based member order before returning;
5. rolls back the entire start if any grouping step is invalid.

The existing two-argument `start_lifting_workout_from_preset(uuid[], timestamptz)` RPC remains available and unchanged for ordinary presets.

## Initial curated Superset presets

- **Upper Strength:** Cable Triceps Pushdown + Dumbbell Biceps Curl
- **Push:** Cable Lateral Raise + Cable Triceps Pushdown
- **Pull:** Dumbbell Biceps Curl + Cable Face Pull

Full Body Strength and Lower Strength remain ordinary presets in this pass, proving legacy preset behavior remains supported.

## Non-goals

This phase does not:

- add Superset-specific XP;
- change PR or progression attribution;
- change ordinary set persistence;
- create preset-owned workout data after start;
- prevent users from editing/dissolving the resulting Superset during the active workout;
- create a second workout-start implementation.

## Validation

Targeted validation covers:

- preset-definition integrity;
- canonical id + Superset resolution;
- ordinary preset RPC compatibility;
- Superset-aware RPC payloads;
- preset start-screen Superset preview;
- database function grants;
- atomic exercise ordering and grouping;
- rollback on duplicate group membership.

After the targeted gate passes, run the full release gate before marking Phase 18.7 DONE.


## Roadmap continuation locked in this pass

After Phase 18.7 validation:

### Phase 18.7A — Drop Sets + Pyramid workflows

- Drop Sets use the existing `DROP` set classification.
- Full Pyramid and Ascending Pyramid are live set-sequence workflows layered over ordinary independently editable sets.
- All completed sets, including Drop Sets and Pyramid-generated/prefilled sets, count toward normal lifting volume.
- No advanced set pattern receives special XP or alternate scoring.

### Phase 18.7B — Selective E1RM / deep exercise analytics

`Track in analytics` is intentionally narrow:

- tracked exercises appear in E1RM and other detailed per-exercise analytics;
- untracked exercises remain in workout history;
- untracked exercises still count fully toward session, weekly, monthly, and other aggregate lifting-volume totals;
- scoring/XP and underlying PR evidence remain based on normal completed workout data;
- tracking/untracking is a non-destructive view preference.
