-- Phase 19.1: Exercise Catalogue Audit & normalization.
-- PREPARED ONLY. Do not apply to production until explicitly approved.
-- Scope: high-confidence catalogue corrections and alias normalization only.
-- No new picker categories or equipment hierarchy.

-- Shoulder-dominant vertical bodyweight presses were incorrectly filed under CHEST.
update public.exercise_catalog
set primary_muscle_group = 'SHOULDERS'
where canonical_name in ('Handstand Push-Up', 'Pike Push-Up')
  and primary_muscle_group = 'CHEST';

-- Shoulder-rotation rehab/accessory movements were incorrectly filed under CORE.
update public.exercise_catalog
set primary_muscle_group = 'SHOULDERS'
where canonical_name in ('Band External Rotation', 'Band Internal Rotation',
                         'Cable External Rotation', 'Cable Internal Rotation')
  and primary_muscle_group = 'CORE';

-- Normalize common search aliases without changing canonical exercise identity.
update public.exercise_catalog
set aliases = (
  select array_agg(distinct a order by a)
  from unnest(coalesce(aliases, array[]::text[]) || array['HSPU', 'Handstand Pushup']) a
)
where canonical_name = 'Handstand Push-Up';

update public.exercise_catalog
set aliases = (
  select array_agg(distinct a order by a)
  from unnest(coalesce(aliases, array[]::text[]) || array['Pike Pushup']) a
)
where canonical_name = 'Pike Push-Up';

update public.exercise_catalog
set aliases = (
  select array_agg(distinct a order by a)
  from unnest(coalesce(aliases, array[]::text[]) || array['External Rotation with Band']) a
)
where canonical_name = 'Band External Rotation';

update public.exercise_catalog
set aliases = (
  select array_agg(distinct a order by a)
  from unnest(coalesce(aliases, array[]::text[]) || array['Internal Rotation with Band']) a
)
where canonical_name = 'Band Internal Rotation';

update public.exercise_catalog
set aliases = (
  select array_agg(distinct a order by a)
  from unnest(coalesce(aliases, array[]::text[]) || array['Cable External Shoulder Rotation']) a
)
where canonical_name = 'Cable External Rotation';

update public.exercise_catalog
set aliases = (
  select array_agg(distinct a order by a)
  from unnest(coalesce(aliases, array[]::text[]) || array['Cable Internal Shoulder Rotation']) a
)
where canonical_name = 'Cable Internal Rotation';
