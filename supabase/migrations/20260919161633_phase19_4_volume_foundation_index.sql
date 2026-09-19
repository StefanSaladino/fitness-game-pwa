-- Phase 19.4 advisor follow-up.
-- Covers the exercise_catalog FK and future exercise-id-oriented volume lookups.

create index if not exists muscle_volume_exercise_rules_exercise_id_idx
  on public.muscle_volume_exercise_rules (exercise_id);