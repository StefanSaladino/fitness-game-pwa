# Roadmap execution-rules update

Roadmap-only patch for the fitness-game PWA after the v0.5.0 / Phase 6.3 checkpoint.

## Changes

- Adds project-wide separation-of-concerns rules.
- Adds a small-slice delivery rule so future work is decomposed before coding.
- Splits Phase 6.4 Workout Reliability into:
  - 6.4A Local active-workout recovery
  - 6.4B Idempotent workout mutation queue
  - 6.4C Conflict and destructive-edit safety
  - 6.4D Reliability integration gate
- Keeps 6.4A as the next implementation slice.
- Does not change product code, scoring, database schema, or CSS.

Overlay only `docs/ROADMAP.md` onto the repository.
