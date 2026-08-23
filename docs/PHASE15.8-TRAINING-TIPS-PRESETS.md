# Phase 15.8 — Curated training tips + preset workouts

## Status

**IN PROGRESS.**

Phase 15.8 lands before the Phase 16 visual overhaul resumes. It turns two useful ideas from the visual concept work into real product behavior so later design work does not present decorative or fake controls.

## Objective

Add lightweight training guidance and preset lifting starts without creating a second workout system, changing authoritative scoring, or pretending to provide individualized coaching.

## Curated training tips

Training tips are application-owned educational copy.

- tips are curated in source control;
- tips are deterministic rather than generated on demand;
- no LLM or remote AI service produces workout, health, medical, injury, or recovery advice;
- tips do not inspect private workout history to diagnose or prescribe training;
- the same user/date selection is stable and testable;
- tips may appear on Home and the pre-workout surface;
- copy should emphasize repeatable technique, sensible progression, logging quality, workout structure, and consistency;
- tips never change XP, qualification, badges, rankings, progression calculations, weekly targets, or persisted workouts.

The tip surface is informational only. It is not a mandatory acknowledgement, notification category, or scoring action.

## Preset workouts

Preset workouts are a convenience layer over the existing lifting workflow.

The initial curated presets are:

- Full Body Strength;
- Upper Strength;
- Lower Strength;
- Push;
- Pull.

Each preset defines an ordered set of canonical exercise names. The active exercise catalogue remains authoritative.

Presets deliberately do **not** define:

- required weights;
- required working-set counts;
- required rep targets;
- automatic set completion;
- special XP values;
- a new scoring category;
- a separate workout-history type.

After a preset starts, the result is an ordinary in-app lifting session. The user can add, remove, reorder, or substitute exercises and controls all set entries exactly as in a manually composed lift.

## Atomic preset start contract

Starting a preset is one authenticated database operation.

`public.start_lifting_workout_from_preset(uuid[], timestamptz)` must:

1. derive the actor from `auth.uid()`;
2. accept only 1–8 non-null, unique exercise IDs;
3. require every requested ID to resolve to an active canonical exercise;
4. reuse the existing intent-aware lifting start boundary so network transport time is not added to the visible timer;
5. validate that the resulting active workout belongs to the authenticated user and is an in-app strength session;
6. require the active workout to contain zero exercises before applying a preset;
7. insert the complete ordered preset in one transaction;
8. return the same authoritative session snapshot shape used by normal workout start;
9. be executable by `authenticated` but not `anon`/`PUBLIC`.

If any validation or insert fails, the transaction fails as a unit. A failed preset must not leave a newly started half-populated workout behind.

A preset must never append silently onto a workout that the user has already begun composing. The user can still use the ordinary exercise picker inside an active workout.

## Catalogue resolution

The browser presents named presets using `get_exercise_picker_catalog`, which is already the canonical picker read boundary.

- each preset button is enabled only when every required canonical exercise is present in the loaded active catalogue;
- browser resolution preserves preset order;
- the server re-validates the submitted IDs and remains authoritative;
- removing/deactivating a catalogue exercise therefore fails closed instead of creating an invalid template.

## Workout reliability

Phase 15.8 must preserve the existing workout reliability contracts:

- ordinary empty workout start remains available;
- start/preset-start shows an immediate local timer from the exact user action timestamp while the request is in flight;
- one active in-app lifting session per user remains authoritative;
- existing pause/resume timer semantics remain unchanged;
- local active-workout recovery remains unchanged;
- idempotent mutation queue and conflict handling remain unchanged;
- exercise picker and manual composition remain available after preset start;
- finish/cancel behavior remains unchanged.

Presets are an online start convenience. Phase 15.8 does not invent an offline queue for creating an entirely new preset session.

## Presentation boundary

This is a functional pre-visual slice, not Phase 16 styling.

- the pre-workout page may expose the real presets now;
- Home may expose a real curated training tip now;
- styling should remain compatible with the existing application rather than opportunistically reskinning unrelated pages;
- Phase 16 will later redesign these real surfaces using the approved smooth, restrained, trope-free visual direction.

## Non-goals

Phase 15.8 does not:

- add user-created/saved templates;
- schedule recurring programs;
- prescribe periodization;
- recommend loads from PRs;
- generate AI coaching;
- change scoring or progression;
- change cardio behavior;
- add new notification categories;
- alter group membership or competition semantics;
- perform the Phase 16 shell/navigation overhaul.

## Validation gate

Before Phase 15.8 can be marked DONE:

- pure preset resolution tests pass;
- deterministic training-tip tests pass;
- component tests cover disabled/unavailable preset states and ordinary empty start;
- controller coverage proves the selected preset resolves canonical IDs in order and enters the normal active workout flow;
- service coverage proves one RPC carries the ordered IDs and action timestamp;
- hosted migration is applied;
- hosted pgTAP proves authorization, atomic ordering, non-empty-workout refusal, duplicate refusal, and rollback behavior;
- TypeScript, unit, integration, build/bundle, structural/internal, Browser, and Database repository-contract gates are green on the exact PR head;
- the roadmap is reconciled before merge.

Only then may Phase 16.0 restart from this updated baseline.
