# Phase 6.1C.1 / 6.1C.2 — Muscle Library Navigation + Timer Cleanup

Status: DONE in v0.4.5.

## Muscle-group exercise library

- The top-level exercise picker presents muscle groups as icon + visible-label navigation destinations.
- Selecting a muscle group opens a dedicated screen containing exercises for that group.
- That screen can be narrowed by workout/equipment type and searched within the selected muscle group.
- `Search all exercises` remains a separate top-level path across the complete canonical catalogue.
- Detail screens provide an explicit back arrow; muscle groups are no longer toggle filters.
- Workout type stays text-first so the iconography remains limited to anatomy-based navigation.
- Individual transparent PNG assets remain under `src/assets/muscle-groups/`.
- `OBLIQUES` remains a real catalogue taxonomy value.

## Opaque exercise picker

The active workout must not show through the exercise-library panel. The outside backdrop may be translucent, but the picker panel, sticky header, and detail toolbar use opaque surfaces.

## Timer synchronization

The previous timer could drift by roughly the network round-trip time. Starting a workout required an RPC followed by a second select, so the active screen could appear several seconds after the user pressed Start. Pause/resume were also persisted at server request time rather than the button-click time.

v0.4.5 changes this boundary:

- Start displays a local clock immediately while persistence is in flight.
- Pause freezes at the exact button-click timestamp.
- Resume restarts locally at the exact button-click timestamp.
- New intent-aware lifecycle RPCs receive that action timestamp, accept it only within a narrow server-time window, and otherwise fall back to server time.
- Start, pause, and resume return the persisted session snapshot directly, eliminating the extra follow-up read.

This keeps the server authoritative while removing ordinary request latency from the user's workout duration.

## Next phase

Phase 6.3 adds real set logging. `workout_sets` already models each set independently with its own set number, warmup/working type, weight, reps, completion state, and completion timestamp. Different sets in the same exercise can therefore use different weights and rep counts.
