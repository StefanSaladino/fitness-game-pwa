begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

select has_column('public', 'workout_sets', 'bodyweight_mode', 'workout sets persist bodyweight loading mode');
select has_function('public', 'add_lifting_workout_set', array['uuid','set_type'], 'add set RPC exists');
select has_function('public', 'copy_lifting_workout_set', array['uuid'], 'copy set RPC exists');
select has_function('public', 'save_lifting_workout_set', array['uuid','set_type','numeric','integer','text','boolean'], 'save set RPC exists');
select has_function('public', 'remove_lifting_workout_set', array['uuid'], 'remove set RPC exists');

select is(has_function_privilege('authenticated', 'public.add_lifting_workout_set(uuid,public.set_type)', 'execute'), true, 'authenticated can add sets');
select is(has_function_privilege('anon', 'public.add_lifting_workout_set(uuid,public.set_type)', 'execute'), false, 'anon cannot add sets');
select is(has_function_privilege('authenticated', 'public.copy_lifting_workout_set(uuid)', 'execute'), true, 'authenticated can copy sets');
select is(has_function_privilege('anon', 'public.copy_lifting_workout_set(uuid)', 'execute'), false, 'anon cannot copy sets');
select is(has_function_privilege('authenticated', 'public.save_lifting_workout_set(uuid,public.set_type,numeric,integer,text,boolean)', 'execute'), true, 'authenticated can save sets');
select is(has_function_privilege('anon', 'public.save_lifting_workout_set(uuid,public.set_type,numeric,integer,text,boolean)', 'execute'), false, 'anon cannot save sets');
select is(has_function_privilege('authenticated', 'public.remove_lifting_workout_set(uuid)', 'execute'), true, 'authenticated can remove sets');
select is(has_function_privilege('anon', 'public.remove_lifting_workout_set(uuid)', 'execute'), false, 'anon cannot remove sets');
select is(has_table_privilege('authenticated', 'public.workout_sets', 'insert'), false, 'authenticated cannot directly insert sets');
select is(has_table_privilege('authenticated', 'public.workout_sets', 'update'), false, 'authenticated cannot directly update sets');
select is(has_table_privilege('authenticated', 'public.workout_sets', 'delete'), false, 'authenticated cannot directly delete sets');

insert into auth.users (id, email) values
  ('c3111111-1111-4111-8111-111111111111', 'set-owner@test.local'),
  ('c3222222-2222-4222-8222-222222222222', 'set-other@test.local');

insert into public.exercise_catalog (id, canonical_name, measurement_type, active) values
  ('ce311111-1111-4111-8111-111111111111', 'Set Tracking Bench Press', 'WEIGHT_REPS', true),
  ('ce322222-2222-4222-8222-222222222222', 'Set Tracking Pull Up', 'BODYWEIGHT_REPS', true);

set local role authenticated;
set local request.jwt.claim.sub = 'c3111111-1111-4111-8111-111111111111';

create temporary table phase63_ids(
  workout_id uuid,
  weighted_exercise_id uuid,
  bodyweight_exercise_id uuid,
  warmup_id uuid,
  working_one_id uuid,
  working_two_id uuid,
  copied_id uuid,
  bodyweight_id uuid,
  added_id uuid,
  assisted_id uuid
) on commit drop;

insert into phase63_ids(workout_id) values (public.start_or_resume_lifting_workout());
update phase63_ids set weighted_exercise_id = public.add_lifting_workout_exercise(workout_id, 'ce311111-1111-4111-8111-111111111111');
update phase63_ids set bodyweight_exercise_id = public.add_lifting_workout_exercise(workout_id, 'ce322222-2222-4222-8222-222222222222');
update phase63_ids set warmup_id = public.add_lifting_workout_set(weighted_exercise_id, 'WARMUP');
update phase63_ids set working_one_id = public.add_lifting_workout_set(weighted_exercise_id, 'WORKING');
update phase63_ids set working_two_id = public.add_lifting_workout_set(weighted_exercise_id, 'WORKING');

select results_eq(
  $$select string_agg(set_number::text, ',' order by set_number) from public.workout_sets where workout_exercise_id=(select weighted_exercise_id from phase63_ids)$$,
  array['1,2,3'::text],
  'new sets append with dense one-based ordering'
);

select public.save_lifting_workout_set((select warmup_id from phase63_ids), 'WARMUP', 60, 10, null, false);
select public.save_lifting_workout_set((select working_one_id from phase63_ids), 'WORKING', 100, 5, null, true);
select public.save_lifting_workout_set((select working_two_id from phase63_ids), 'WORKING', 105, 4, null, true);

select results_eq(
  $$select string_agg(weight_kg::text || 'x' || reps::text, ',' order by set_number) from public.workout_sets where workout_exercise_id=(select weighted_exercise_id from phase63_ids)$$,
  array['60.000x10,100.000x5,105.000x4'::text],
  'different sets keep independent weight and rep values'
);
select results_eq(
  $$select string_agg(completed::text, ',' order by set_number) from public.workout_sets where workout_exercise_id=(select weighted_exercise_id from phase63_ids)$$,
  array['false,true,true'::text],
  'completion state is independent per set'
);

update phase63_ids set copied_id = public.copy_lifting_workout_set(working_two_id);
select results_eq(
  $$select set_number::text || ':' || weight_kg::text || 'x' || reps::text || ':' || completed::text from public.workout_sets where id=(select copied_id from phase63_ids)$$,
  array['4:105.000x4:false'::text],
  'copy duplicates values into a new independent incomplete set'
);

select public.remove_lifting_workout_set((select working_one_id from phase63_ids));
select results_eq(
  $$select string_agg(set_number::text, ',' order by set_number) from public.workout_sets where workout_exercise_id=(select weighted_exercise_id from phase63_ids)$$,
  array['1,2,3'::text],
  'removing a set compacts stable set ordering'
);

update phase63_ids set bodyweight_id = public.add_lifting_workout_set(bodyweight_exercise_id, 'WORKING');
select public.save_lifting_workout_set((select bodyweight_id from phase63_ids), 'WORKING', null, 8, 'BODYWEIGHT', true);
select results_eq(
  $$select bodyweight_mode || ':' || coalesce(weight_kg::text, 'none') || ':' || reps::text from public.workout_sets where id=(select bodyweight_id from phase63_ids)$$,
  array['BODYWEIGHT:none:8'::text],
  'plain bodyweight sets persist reps without artificial load'
);

update phase63_ids set added_id = public.add_lifting_workout_set(bodyweight_exercise_id, 'WORKING');
select public.save_lifting_workout_set((select added_id from phase63_ids), 'WORKING', 20, 6, 'ADDED_WEIGHT', true);
select results_eq(
  $$select bodyweight_mode || ':' || weight_kg::text || ':' || reps::text from public.workout_sets where id=(select added_id from phase63_ids)$$,
  array['ADDED_WEIGHT:20.000:6'::text],
  'added-weight bodyweight sets are a distinct persisted mode'
);

update phase63_ids set assisted_id = public.add_lifting_workout_set(bodyweight_exercise_id, 'WORKING');
select public.save_lifting_workout_set((select assisted_id from phase63_ids), 'WORKING', 30, 7, 'ASSISTED', true);
select results_eq(
  $$select bodyweight_mode || ':' || weight_kg::text || ':' || reps::text from public.workout_sets where id=(select assisted_id from phase63_ids)$$,
  array['ASSISTED:30.000:7'::text],
  'assisted bodyweight sets are a distinct persisted mode'
);

select throws_ok(
  $$select public.save_lifting_workout_set((select bodyweight_id from phase63_ids), 'WORKING', 5, 8, 'BODYWEIGHT', true)$$,
  '22023', 'Plain bodyweight sets cannot include load',
  'plain bodyweight mode rejects a weight value'
);
select throws_ok(
  $$select public.save_lifting_workout_set((select warmup_id from phase63_ids), 'WORKING', null, 8, null, true)$$,
  '22023', 'Completed weighted sets require weight and reps',
  'completed weighted sets require both weight and reps'
);
select throws_ok(
  $$select public.save_lifting_workout_set((select warmup_id from phase63_ids), 'WORKING', 60, 0, null, false)$$,
  '22023', 'Reps are out of range',
  'set reps reject zero or negative values when supplied'
);

set local request.jwt.claim.sub = 'c3222222-2222-4222-8222-222222222222';
select throws_ok(
  $$select public.add_lifting_workout_set((select weighted_exercise_id from phase63_ids), 'WORKING')$$,
  '42501', 'Active workout exercise not found',
  'another user cannot add a set'
);
select throws_ok(
  $$select public.copy_lifting_workout_set((select warmup_id from phase63_ids))$$,
  '42501', 'Active workout set not found',
  'another user cannot copy a set'
);
select throws_ok(
  $$select public.save_lifting_workout_set((select warmup_id from phase63_ids), 'WARMUP', 60, 10, null, false)$$,
  '42501', 'Active workout set not found',
  'another user cannot save a set'
);
select throws_ok(
  $$select public.remove_lifting_workout_set((select warmup_id from phase63_ids))$$,
  '42501', 'Active workout set not found',
  'another user cannot remove a set'
);

set local request.jwt.claim.sub = 'c3111111-1111-4111-8111-111111111111';
select public.finish_lifting_workout((select workout_id from phase63_ids));
select throws_ok(
  $$select public.add_lifting_workout_set((select weighted_exercise_id from phase63_ids), 'WORKING')$$,
  '42501', 'Active workout exercise not found',
  'completed workouts reject new sets'
);
select throws_ok(
  $$select public.save_lifting_workout_set((select warmup_id from phase63_ids), 'WARMUP', 60, 10, null, false)$$,
  '42501', 'Active workout set not found',
  'completed workouts reject set edits'
);
select throws_ok(
  $$select public.remove_lifting_workout_set((select warmup_id from phase63_ids))$$,
  '42501', 'Active workout set not found',
  'completed workouts reject set removal'
);

reset role;
select * from finish();
rollback;
