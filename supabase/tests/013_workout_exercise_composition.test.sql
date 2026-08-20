begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

select has_function('public', 'add_lifting_workout_exercise', array['uuid','uuid'], 'add exercise RPC exists');
select has_function('public', 'remove_lifting_workout_exercise', array['uuid'], 'remove exercise RPC exists');
select has_function('public', 'move_lifting_workout_exercise', array['uuid','integer'], 'move exercise RPC exists');
select is(has_function_privilege('authenticated', 'public.add_lifting_workout_exercise(uuid,uuid)', 'execute'), true, 'authenticated can add exercise');
select is(has_function_privilege('anon', 'public.add_lifting_workout_exercise(uuid,uuid)', 'execute'), false, 'anon cannot add exercise');
select is(has_function_privilege('authenticated', 'public.remove_lifting_workout_exercise(uuid)', 'execute'), true, 'authenticated can remove exercise');
select is(has_function_privilege('anon', 'public.remove_lifting_workout_exercise(uuid)', 'execute'), false, 'anon cannot remove exercise');
select is(has_function_privilege('authenticated', 'public.move_lifting_workout_exercise(uuid,integer)', 'execute'), true, 'authenticated can move exercise');
select is(has_function_privilege('anon', 'public.move_lifting_workout_exercise(uuid,integer)', 'execute'), false, 'anon cannot move exercise');
select is(has_table_privilege('authenticated', 'public.workout_exercises', 'insert'), false, 'authenticated cannot directly insert workout exercises');
select is(has_table_privilege('authenticated', 'public.workout_exercises', 'update'), false, 'authenticated cannot directly update workout exercises');
select is(has_table_privilege('authenticated', 'public.workout_exercises', 'delete'), false, 'authenticated cannot directly delete workout exercises');
select results_eq(
  $$select count(*)::bigint from pg_indexes where schemaname='public' and indexname='workout_exercises_one_canonical_per_workout'$$,
  array[1::bigint],
  'one-canonical-exercise-per-workout index exists'
);

insert into auth.users (id, email) values
  ('b1111111-1111-4111-8111-111111111111', 'composition-owner@test.local'),
  ('b2222222-2222-4222-8222-222222222222', 'composition-other@test.local');

insert into public.exercise_catalog (id, canonical_name, measurement_type, active) values
  ('be111111-1111-4111-8111-111111111111', 'Composition Bench Press', 'WEIGHT_REPS', true),
  ('be222222-2222-4222-8222-222222222222', 'Composition Row', 'WEIGHT_REPS', true),
  ('be333333-3333-4333-8333-333333333333', 'Composition Pull Up', 'BODYWEIGHT_REPS', true),
  ('be444444-4444-4444-8444-444444444444', 'Composition Inactive', 'OTHER', false);

set local role authenticated;
set local request.jwt.claim.sub = 'b1111111-1111-4111-8111-111111111111';

create temporary table phase61b_ids(
  workout_id uuid,
  bench_id uuid,
  row_id uuid,
  pull_id uuid,
  duplicate_bench_id uuid
) on commit drop;

insert into phase61b_ids(workout_id) values (public.start_or_resume_lifting_workout());
update phase61b_ids set bench_id = public.add_lifting_workout_exercise(workout_id, 'be111111-1111-4111-8111-111111111111');
update phase61b_ids set duplicate_bench_id = public.add_lifting_workout_exercise(workout_id, 'be111111-1111-4111-8111-111111111111');
update phase61b_ids set row_id = public.add_lifting_workout_exercise(workout_id, 'be222222-2222-4222-8222-222222222222');
update phase61b_ids set pull_id = public.add_lifting_workout_exercise(workout_id, 'be333333-3333-4333-8333-333333333333');

select is((select bench_id = duplicate_bench_id from phase61b_ids), true, 'adding the same canonical exercise is idempotent');
select results_eq(
  $$select count(*) from public.workout_exercises where workout_id=(select workout_id from phase61b_ids)$$,
  array[3::bigint],
  'idempotent add creates only one row per canonical exercise'
);
select results_eq(
  $$select string_agg(order_index::text, ',' order by order_index) from public.workout_exercises where workout_id=(select workout_id from phase61b_ids)$$,
  array['0,1,2'::text],
  'new exercises append with dense zero-based ordering'
);

select public.move_lifting_workout_exercise((select pull_id from phase61b_ids), 0);
select results_eq(
  $$select string_agg(exercise_id::text, ',' order by order_index) from public.workout_exercises where workout_id=(select workout_id from phase61b_ids)$$,
  array['be333333-3333-4333-8333-333333333333,be111111-1111-4111-8111-111111111111,be222222-2222-4222-8222-222222222222'::text],
  'move reorders the exercise list atomically'
);

select public.remove_lifting_workout_exercise((select bench_id from phase61b_ids));
select results_eq(
  $$select string_agg(order_index::text, ',' order by order_index) from public.workout_exercises where workout_id=(select workout_id from phase61b_ids)$$,
  array['0,1'::text],
  'remove compacts the remaining order indexes'
);

select throws_ok(
  $$select public.add_lifting_workout_exercise((select workout_id from phase61b_ids), 'be444444-4444-4444-8444-444444444444')$$,
  '22023',
  'Active exercise not found',
  'inactive exercises cannot be attached'
);

select throws_ok(
  $$select public.move_lifting_workout_exercise((select row_id from phase61b_ids), 8)$$,
  '22023',
  'Exercise order is out of range',
  'move rejects an out-of-range position'
);

set local request.jwt.claim.sub = 'b2222222-2222-4222-8222-222222222222';
select throws_ok(
  $$select public.add_lifting_workout_exercise((select workout_id from phase61b_ids), 'be111111-1111-4111-8111-111111111111')$$,
  '42501',
  'Active lifting workout not found',
  'another user cannot add to the workout'
);
select throws_ok(
  $$select public.remove_lifting_workout_exercise((select row_id from phase61b_ids))$$,
  '42501',
  'Active workout exercise not found',
  'another user cannot remove from the workout'
);
select throws_ok(
  $$select public.move_lifting_workout_exercise((select row_id from phase61b_ids), 0)$$,
  '42501',
  'Active workout exercise not found',
  'another user cannot reorder the workout'
);

set local request.jwt.claim.sub = 'b1111111-1111-4111-8111-111111111111';
select public.finish_lifting_workout((select workout_id from phase61b_ids));
select throws_ok(
  $$select public.add_lifting_workout_exercise((select workout_id from phase61b_ids), 'be111111-1111-4111-8111-111111111111')$$,
  '42501',
  'Active lifting workout not found',
  'completed workouts reject composition changes'
);

reset role;
select * from finish();
rollback;
