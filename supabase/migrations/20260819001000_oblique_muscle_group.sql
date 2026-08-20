-- Workout Game PWA — Phase 6.1C.1 muscle-group filter taxonomy (v0.4.3)
-- Adds an explicit OBLIQUES target so the visual muscle selector maps to real
-- canonical exercise metadata rather than a UI-only pseudo-filter.

begin;

alter table public.exercise_catalog
  drop constraint if exists exercise_catalog_primary_muscle_group_check;

alter table public.exercise_catalog
  add constraint exercise_catalog_primary_muscle_group_check
  check (primary_muscle_group in (
    'CHEST','BACK','SHOULDERS','BICEPS','TRICEPS','QUADS','HAMSTRINGS',
    'GLUTES','CALVES','CORE','OBLIQUES','FOREARMS_GRIP','NECK','FULL_BODY','OTHER'
  ));

update public.exercise_catalog
set primary_muscle_group = 'OBLIQUES'
where canonical_name in (
  'Kettlebell Windmill',
  'Pallof Press',
  'Cable Wood Chop',
  'Cable Reverse Wood Chop',
  'Side Plank',
  'Bicycle Crunch',
  'Medicine Ball Russian Twist',
  'Landmine Rotation'
);

notify pgrst, 'reload schema';

commit;
