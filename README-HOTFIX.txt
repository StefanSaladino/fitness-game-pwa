Fitness Game PWA — Phase 12A v0.11.0 hotfix 5

Root cause fixed:
- useWorkoutExercises could expose stale READY for one render after workoutId changed.
- useWorkoutSets could expose stale READY for one render after exercise IDs changed.
- WorkoutController could therefore persist an incomplete recovery snapshot before sets finished loading.

This hotfix fixes the production status race, adds hook regression tests, and makes the reliability integration gate wait for a complete canonical exercise+set snapshot before simulating offline loss.

No Supabase/scoring changes.
