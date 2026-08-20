begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

select has_table('public', 'workout_mutation_receipts', 'workout mutation receipt table exists');
select has_column('public', 'workout_mutation_receipts', 'idempotency_key', 'receipt stores idempotency key');
select has_column('public', 'workout_mutation_receipts', 'request_payload', 'receipt stores the exact request payload');
select has_column('public', 'workout_mutation_receipts', 'result_payload', 'receipt stores the authoritative result');
select has_function('public', 'apply_lifting_workout_mutation', array['uuid','uuid','text','jsonb'], 'idempotent mutation RPC exists');
select is(has_function_privilege('authenticated', 'public.apply_lifting_workout_mutation(uuid,uuid,text,jsonb)', 'execute'), true, 'authenticated can apply idempotent workout mutations');
select is(has_function_privilege('anon', 'public.apply_lifting_workout_mutation(uuid,uuid,text,jsonb)', 'execute'), false, 'anon cannot apply workout mutations');
select is(has_table_privilege('authenticated', 'public.workout_mutation_receipts', 'select'), false, 'authenticated cannot directly read mutation receipts');
select is(has_table_privilege('authenticated', 'public.workout_mutation_receipts', 'insert'), false, 'authenticated cannot forge mutation receipts');

insert into auth.users (id, email) values
  ('d4111111-1111-4111-8111-111111111111', 'queue-owner@test.local'),
  ('d4222222-2222-4222-8222-222222222222', 'queue-other@test.local');

insert into public.exercise_catalog (id, canonical_name, measurement_type, active) values
  ('de411111-1111-4111-8111-111111111111', 'Queue Bench Press', 'WEIGHT_REPS', true),
  ('de422222-2222-4222-8222-222222222222', 'Queue Row', 'WEIGHT_REPS', true);

set local role authenticated;
set local request.jwt.claim.sub = 'd4111111-1111-4111-8111-111111111111';

create temporary table phase64b_ids(
  workout_id uuid,
  exercise_one_id uuid,
  exercise_two_id uuid,
  set_one_id uuid,
  copied_set_id uuid
) on commit drop;

insert into phase64b_ids(workout_id) values (public.start_or_resume_lifting_workout());

update phase64b_ids
set exercise_one_id = (public.apply_lifting_workout_mutation(
  'a4111111-1111-4111-8111-111111111111', workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'de411111-1111-4111-8111-111111111111')
) ->> 'resultId')::uuid;

select is(
  (public.apply_lifting_workout_mutation(
    'a4111111-1111-4111-8111-111111111111', (select workout_id from phase64b_ids), 'ADD_EXERCISE',
    jsonb_build_object('exerciseId', 'de411111-1111-4111-8111-111111111111')
  ) ->> 'resultId')::uuid,
  (select exercise_one_id from phase64b_ids),
  'replaying an exercise add returns the original result id'
);
select is((select count(*)::integer from public.workout_exercises where workout_id=(select workout_id from phase64b_ids)), 1, 'replaying exercise add cannot duplicate the exercise');

update phase64b_ids
set exercise_two_id = (public.apply_lifting_workout_mutation(
  'a4222222-2222-4222-8222-222222222222', workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'de422222-2222-4222-8222-222222222222')
) ->> 'resultId')::uuid;
select is((select count(*)::integer from public.workout_exercises where workout_id=(select workout_id from phase64b_ids)), 2, 'a different idempotency key can create a different exercise mutation');

select public.apply_lifting_workout_mutation(
  'a4333333-3333-4333-8333-333333333333', (select workout_id from phase64b_ids), 'MOVE_EXERCISE',
  jsonb_build_object('workoutExerciseId', (select exercise_two_id from phase64b_ids), 'newOrderIndex', 0, 'expectedRevision', 0)
);
select public.apply_lifting_workout_mutation(
  'a4333333-3333-4333-8333-333333333333', (select workout_id from phase64b_ids), 'MOVE_EXERCISE',
  jsonb_build_object('workoutExerciseId', (select exercise_two_id from phase64b_ids), 'newOrderIndex', 0, 'expectedRevision', 0)
);
select results_eq(
  $$select string_agg(order_index::text, ',' order by order_index) from public.workout_exercises where workout_id=(select workout_id from phase64b_ids)$$,
  array['0,1'::text],
  'replaying a move keeps dense exercise ordering'
);

update phase64b_ids
set set_one_id = (public.apply_lifting_workout_mutation(
  'b4111111-1111-4111-8111-111111111111', workout_id, 'ADD_SET',
  jsonb_build_object('workoutExerciseId', exercise_one_id, 'setType', 'WORKING')
) ->> 'resultId')::uuid;

select is(
  (public.apply_lifting_workout_mutation(
    'b4111111-1111-4111-8111-111111111111', (select workout_id from phase64b_ids), 'ADD_SET',
    jsonb_build_object('workoutExerciseId', (select exercise_one_id from phase64b_ids), 'setType', 'WORKING')
  ) ->> 'resultId')::uuid,
  (select set_one_id from phase64b_ids),
  'replaying set add returns the original set id'
);
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_one_id from phase64b_ids)), 1, 'replaying set add cannot duplicate a set');

select public.apply_lifting_workout_mutation(
  'b4222222-2222-4222-8222-222222222222', (select workout_id from phase64b_ids), 'SAVE_SET',
  jsonb_build_object('workoutSetId', (select set_one_id from phase64b_ids), 'setType', 'WORKING', 'weightKg', 100, 'reps', 5, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
);
select public.apply_lifting_workout_mutation(
  'b4222222-2222-4222-8222-222222222222', (select workout_id from phase64b_ids), 'SAVE_SET',
  jsonb_build_object('workoutSetId', (select set_one_id from phase64b_ids), 'setType', 'WORKING', 'weightKg', 100, 'reps', 5, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
);
select results_eq(
  $$select weight_kg::text || 'x' || reps::text || ':' || completed::text from public.workout_sets where id=(select set_one_id from phase64b_ids)$$,
  array['100.000x5:true'::text],
  'replaying set save leaves one authoritative value'
);

update phase64b_ids
set copied_set_id = (public.apply_lifting_workout_mutation(
  'b4333333-3333-4333-8333-333333333333', workout_id, 'COPY_SET',
  jsonb_build_object('workoutSetId', set_one_id, 'expectedRevision', 1)
) ->> 'resultId')::uuid;
select is(
  (public.apply_lifting_workout_mutation(
    'b4333333-3333-4333-8333-333333333333', (select workout_id from phase64b_ids), 'COPY_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64b_ids), 'expectedRevision', 1)
  ) ->> 'resultId')::uuid,
  (select copied_set_id from phase64b_ids),
  'replaying copy set returns the original copied-set id'
);
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_one_id from phase64b_ids)), 2, 'replaying copy set cannot create a second copy');

select public.apply_lifting_workout_mutation(
  'b4444444-4444-4444-8444-444444444444', (select workout_id from phase64b_ids), 'REMOVE_SET',
  jsonb_build_object('workoutSetId', (select copied_set_id from phase64b_ids), 'expectedRevision', 0)
);
select public.apply_lifting_workout_mutation(
  'b4444444-4444-4444-8444-444444444444', (select workout_id from phase64b_ids), 'REMOVE_SET',
  jsonb_build_object('workoutSetId', (select copied_set_id from phase64b_ids), 'expectedRevision', 0)
);
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_one_id from phase64b_ids)), 1, 'replaying a remove does not fail or delete another set');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'b4111111-1111-4111-8111-111111111111', (select workout_id from phase64b_ids), 'ADD_SET',
    jsonb_build_object('workoutExerciseId', (select exercise_one_id from phase64b_ids), 'setType', 'WARMUP')
  )$$,
  '22023', 'Idempotency key was already used for a different workout mutation',
  'an idempotency key cannot be reused with changed payload'
);

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'b4555555-5555-4555-8555-555555555555', (select workout_id from phase64b_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64b_ids), 'setType', 'WORKING', 'weightKg', -5, 'reps', 5, 'bodyweightMode', null, 'completed', false, 'expectedRevision', (select revision from public.workout_sets where id=(select set_one_id from phase64b_ids)))
  )$$,
  '22023', 'Weight is out of range',
  'validation failures remain terminal instead of becoming successful receipts'
);
reset role;
select is((select count(*)::integer from public.workout_mutation_receipts where idempotency_key='b4555555-5555-4555-8555-555555555555'), 0, 'failed mutation does not leave a misleading success receipt');
set local role authenticated;
set local request.jwt.claim.sub = 'd4111111-1111-4111-8111-111111111111';

set local request.jwt.claim.sub = 'd4222222-2222-4222-8222-222222222222';
select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'c4111111-1111-4111-8111-111111111111', (select workout_id from phase64b_ids), 'ADD_SET',
    jsonb_build_object('workoutExerciseId', (select exercise_one_id from phase64b_ids), 'setType', 'WORKING')
  )$$,
  '42501', 'Active lifting workout not found',
  'another user cannot attach an idempotency receipt to the owner workout'
);

set local request.jwt.claim.sub = 'd4111111-1111-4111-8111-111111111111';
reset role;
select is((select count(*)::integer from public.workout_mutation_receipts where user_id='d4111111-1111-4111-8111-111111111111'), 7, 'successful unique mutations create one receipt each');
select is((select count(*)::integer from public.workout_mutation_receipts where completed_at is not null), 7, 'successful receipts are marked complete');
select is((select count(*)::integer from public.workout_mutation_receipts where result_payload is not null), 7, 'successful receipts retain result payloads');

reset role;
select * from finish();
rollback;
