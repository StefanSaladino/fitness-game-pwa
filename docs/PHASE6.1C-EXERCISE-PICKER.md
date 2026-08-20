# Phase 6.1C / 6.2 — Exercise picker and search

The active lifting session now uses the canonical exercise catalogue as the only exercise identity source.

## Browse model

The picker supports two equivalent browse axes:

- **Muscle group:** Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Calves, Core, Forearms / Grip, Neck, Full Body, Other.
- **Workout type:** Barbell, Dumbbell, Kettlebell, Machine / Smith, Cable, Bodyweight, Isometric, Plyometric, Medicine Ball, Landmine, Bands, Strongman / Carries / Sleds, Olympic / Power, Specialty / Accessory, Other.

A user can browse by one axis and filter by the other. The same canonical exercise ID is used regardless of how it is found.

## Search

Search runs locally over the authenticated catalogue payload so keystrokes do not require a network round trip. It includes:

- case-insensitive matching;
- common aliases such as `RDL` and `OHP`;
- common equipment abbreviations such as DB / KB variants;
- conservative typo tolerance;
- persisted recent-use ordering from completed lifting workouts.

Search never creates free-text exercise identity.

## Security and data ownership

`get_exercise_picker_catalog()` is authenticated-only. It may return the shared active canonical catalogue, but `last_used_at` is calculated only from the caller's completed in-app lifting sessions.

Exercise attachment itself remains protected by the Phase 6.1B `add_lifting_workout_exercise` RPC.
