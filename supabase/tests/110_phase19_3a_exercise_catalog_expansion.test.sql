begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_table('public', 'exercise_catalog', 'exercise catalogue exists');

select ok(
  (select count(*) from public.exercise_catalog where active = true) >= 464,
  'Phase 19.3A established a floor of 464 active exercises before later catalogue expansions'
);

select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where active = true and workout_type = 'DUMBBELL'$$,
  array[93::bigint],
  'Phase 19.3A expands active dumbbell coverage from 35 to 93 exercises'
);

select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where active = true and canonical_name in (
    'Dumbbell Gorilla Row','Dumbbell High Row','Dumbbell Spider Curl','Dumbbell Zottman Curl','Dumbbell Reverse Curl','Dumbbell Cross-Body Hammer Curl','Dumbbell Drag Curl','Seated Dumbbell Curl',
    'Neutral-Grip Dumbbell Bench Press','Single-Arm Dumbbell Bench Press','Single-Arm Incline Dumbbell Press','Incline Dumbbell Squeeze Press','Dumbbell Crunch','Dumbbell Sit-Up','Dumbbell Dead Bug',
    'Dumbbell Side Bend','Dumbbell Russian Twist','Dumbbell Wood Chop','Dumbbell Wrist Curl','Dumbbell Reverse Wrist Curl','Dumbbell Pronation/Supination','Dumbbell Finger Curl',
    'Dumbbell Hip Thrust','Dumbbell Glute Bridge','Dumbbell Frog Pump','Dumbbell Curtsy Lunge','Dumbbell Stiff-Leg Deadlift','Dumbbell Kickstand Romanian Deadlift','Dumbbell Leg Curl',
    'Dumbbell Split Squat','Dumbbell Forward Lunge','Dumbbell Lateral Lunge','Dumbbell Cyclist Squat','Dumbbell Heels-Elevated Squat','Dumbbell Box Squat','Dumbbell Sumo Squat',
    'Lean-Away Dumbbell Lateral Raise','Incline Dumbbell Lateral Raise','Seated Dumbbell Lateral Raise','Dumbbell Y-Raise','Dumbbell Scaption Raise','Dumbbell Upright Row','Dumbbell Rear Delt Row','Single-Arm Dumbbell Shoulder Press',
    'Dumbbell Tate Press','Dumbbell Rolling Triceps Extension','Dumbbell Close-Grip Bench Press','Single-Arm Overhead Dumbbell Triceps Extension','Seated Dumbbell Calf Raise','Single-Leg Dumbbell Calf Raise',
    'Dumbbell Clean','Dumbbell Clean and Press','Dumbbell Hang Clean','Dumbbell Power Clean','Dumbbell Snatch','Dumbbell Hang Snatch','Dumbbell Thruster','Dumbbell Devil Press'
  )$$,
  array[58::bigint],
  'all 58 Phase 19.3A canonical additions are present and active'
);

select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where canonical_name in ('Dumbbell Clean','Dumbbell Clean and Press','Dumbbell Hang Clean','Dumbbell Power Clean','Dumbbell Snatch','Dumbbell Hang Snatch','Dumbbell Thruster','Dumbbell Devil Press') and primary_muscle_group='FULL_BODY'$$,
  array[8::bigint],
  'eight dumbbell ballistic/whole-body additions retain FULL_BODY picker taxonomy'
);

select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where active=true and workout_type='DUMBBELL' and measurement_type <> 'WEIGHT_REPS'$$,
  array[0::bigint],
  'all active dumbbell catalogue entries remain WEIGHT_REPS in the current schema'
);

select is(
  (select primary_muscle_group from public.exercise_catalog where canonical_name='Dumbbell Kickstand Romanian Deadlift'),
  'HAMSTRINGS',
  'kickstand dumbbell RDL is browsed under hamstrings'
);

select is(
  (select primary_muscle_group from public.exercise_catalog where canonical_name='Dumbbell High Row'),
  'BACK',
  'dumbbell high row is browsed under back'
);

select is(
  (select primary_muscle_group from public.exercise_catalog where canonical_name='Dumbbell Rear Delt Row'),
  'SHOULDERS',
  'rear-delt dumbbell row is browsed under shoulders'
);

select ok(
  (select aliases @> array['DB Kickstand RDL']::text[] from public.exercise_catalog where canonical_name='Dumbbell Kickstand Romanian Deadlift'),
  'kickstand RDL alias is stored'
);

select ok(
  (select aliases @> array['Single-Arm Dumbbell Snatch']::text[] from public.exercise_catalog where canonical_name='Dumbbell Snatch'),
  'single-arm dumbbell snatch alias is stored'
);

select ok(
  not exists (
    select 1
    from public.exercise_catalog
    where active=true
      and primary_muscle_group not in ('CHEST','BACK','SHOULDERS','BICEPS','TRICEPS','QUADS','HAMSTRINGS','GLUTES','CALVES','CORE','OBLIQUES','FOREARMS_GRIP','NECK','FULL_BODY')
  ),
  'Phase 19.3A adds no picker muscle categories'
);

select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where active=true and workout_type='DUMBBELL' and primary_muscle_group <> 'FULL_BODY'$$,
  array[85::bigint],
  '85 active dumbbell exercises are non-FULL_BODY catalogue movements after Phase 19.3A'
);

select * from finish();
rollback;
