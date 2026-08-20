begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

select has_function('public', 'get_exercise_picker_catalog', array[]::text[], 'exercise picker catalog RPC exists');
select is(has_function_privilege('authenticated', 'public.get_exercise_picker_catalog()', 'execute'), true, 'authenticated can load exercise picker catalog');
select is(has_function_privilege('anon', 'public.get_exercise_picker_catalog()', 'execute'), false, 'anon cannot load exercise picker catalog');
select results_eq(
  $$select (count(*) >= 356) from public.exercise_catalog where active=true$$,
  array[true],
  'expanded canonical catalogue contains at least 356 active exercises'
);
select results_eq(
  $$select count(*) from public.exercise_catalog where active=true and (primary_muscle_group is null or primary_muscle_group='')$$,
  array[0::bigint],
  'all active exercises have a muscle-group classification'
);
select results_eq(
  $$select count(*) from public.exercise_catalog where active=true and (workout_type is null or workout_type='')$$,
  array[0::bigint],
  'all active exercises have a workout-type classification'
);
select results_eq(
  $$select primary_muscle_group from public.exercise_catalog where canonical_name='Barbell Bench Press'$$,
  array['CHEST'::text],
  'barbell bench press is grouped under chest'
);
select results_eq(
  $$select workout_type from public.exercise_catalog where canonical_name='Barbell Bench Press'$$,
  array['BARBELL'::text],
  'barbell bench press is grouped under barbell'
);
select results_eq(
  $$select aliases @> array['RDL']::text[] from public.exercise_catalog where canonical_name='Romanian Deadlift'$$,
  array[true],
  'Romanian deadlift carries the RDL alias'
);
select results_eq(
  $$select aliases @> array['OHP']::text[] from public.exercise_catalog where canonical_name='Overhead Press'$$,
  array[true],
  'overhead press carries the OHP alias'
);
select results_eq(
  $$select workout_type from public.exercise_catalog where canonical_name='Dumbbell Bench Press'$$,
  array['DUMBBELL'::text],
  'dumbbell bench press is grouped under dumbbell'
);
select results_eq(
  $$select workout_type from public.exercise_catalog where canonical_name='Kettlebell Swing'$$,
  array['KETTLEBELL'::text],
  'kettlebell swing is grouped under kettlebell'
);
select results_eq(
  $$select workout_type from public.exercise_catalog where canonical_name='Box Jump'$$,
  array['PLYOMETRIC'::text],
  'box jump is grouped under plyometric'
);
select results_eq(
  $$select primary_muscle_group from public.exercise_catalog where canonical_name='Cable Biceps Curl'$$,
  array['BICEPS'::text],
  'cable biceps curl is grouped under biceps'
);
select results_eq(
  $$select workout_type from public.exercise_catalog where canonical_name='Pull-Up'$$,
  array['BODYWEIGHT'::text],
  'pull-up is grouped under bodyweight'
);
select results_eq(
  $$select count(*) from pg_indexes where schemaname='public' and indexname in ('exercise_catalog_active_muscle_name_idx','exercise_catalog_active_type_name_idx')$$,
  array[2::bigint],
  'exercise browse indexes exist'
);

insert into auth.users (id, email) values
  ('c1111111-1111-4111-8111-111111111111', 'picker-recent@test.local'),
  ('c2222222-2222-4222-8222-222222222222', 'picker-other@test.local');

set local role authenticated;
set local request.jwt.claim.sub = 'c1111111-1111-4111-8111-111111111111';

create temporary table phase61c_ids(workout_id uuid, exercise_id uuid) on commit drop;
insert into phase61c_ids(exercise_id)
select id from public.exercise_catalog where canonical_name='Barbell Bench Press';
update phase61c_ids set workout_id = public.start_or_resume_lifting_workout();
select public.add_lifting_workout_exercise((select workout_id from phase61c_ids), (select exercise_id from phase61c_ids));
select public.finish_lifting_workout((select workout_id from phase61c_ids));

select results_eq(
  $$select last_used_at is not null from public.get_exercise_picker_catalog() where canonical_name='Barbell Bench Press'$$,
  array[true],
  'picker RPC exposes completed-workout recency to the owning user'
);
select results_eq(
  $$select count(*) from public.get_exercise_picker_catalog() where canonical_name='Barbell Bench Press'$$,
  array[1::bigint],
  'picker RPC returns active canonical exercises once'
);

set local request.jwt.claim.sub = 'c2222222-2222-4222-8222-222222222222';
select results_eq(
  $$select last_used_at is null from public.get_exercise_picker_catalog() where canonical_name='Barbell Bench Press'$$,
  array[true],
  'recent usage is isolated to the authenticated user'
);

reset role;
insert into public.exercise_catalog (canonical_name, measurement_type, active, primary_muscle_group, workout_type)
values ('Picker Inactive Exercise', 'OTHER', false, 'OTHER', 'OTHER');
set local role authenticated;
set local request.jwt.claim.sub = 'c1111111-1111-4111-8111-111111111111';
select results_eq(
  $$select count(*) from public.get_exercise_picker_catalog() where canonical_name='Picker Inactive Exercise'$$,
  array[0::bigint],
  'picker RPC excludes inactive exercises'
);

reset role;
select * from finish();
rollback;
