begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

select has_function('public', 'apply_lifting_workout_mutation', array['uuid','uuid','text','jsonb'], 'reliability gate uses the idempotent conflict-aware mutation boundary');

insert into auth.users (id, email) values
  ('e6111111-1111-4111-8111-111111111111', 'reliability-owner@test.local');

insert into public.exercise_catalog (id, canonical_name, measurement_type, active) values
  ('ee611111-1111-4111-8111-111111111111', 'Reliability Bench Press', 'WEIGHT_REPS', true);

set local role authenticated;
set local request.jwt.claim.sub = 'e6111111-1111-4111-8111-111111111111';

create temporary table phase64d_ids(
  workout_id uuid,
  exercise_id uuid,
  set_id uuid,
  copied_set_id uuid,
  second_workout_id uuid,
  second_exercise_id uuid,
  second_set_id uuid
) on commit drop;

insert into phase64d_ids(workout_id) values (public.start_or_resume_lifting_workout());

update phase64d_ids
set exercise_id = (public.apply_lifting_workout_mutation(
  'd6111111-1111-4111-8111-111111111111', workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'ee611111-1111-4111-8111-111111111111')
) ->> 'resultId')::uuid;

update phase64d_ids
set set_id = (public.apply_lifting_workout_mutation(
  'd6222222-2222-4222-8222-222222222222', workout_id, 'ADD_SET',
  jsonb_build_object('workoutExerciseId', exercise_id, 'setType', 'WORKING')
) ->> 'resultId')::uuid;

select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_id from phase64d_ids)), 1, 'baseline capture creates exactly one set');

select public.apply_lifting_workout_mutation(
  'd6333333-3333-4333-8333-333333333333', (select workout_id from phase64d_ids), 'SAVE_SET',
  jsonb_build_object('workoutSetId', (select set_id from phase64d_ids), 'setType', 'WORKING', 'weightKg', 100, 'reps', 5, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
);

select is((select revision from public.workout_sets where id=(select set_id from phase64d_ids)), 1::bigint, 'first accepted save advances the set revision');
select results_eq(
  $$select weight_kg::text || 'x' || reps::text from public.workout_sets where id=(select set_id from phase64d_ids)$$,
  array['100.000x5'::text],
  'authoritative set contains the accepted save'
);

select is(
  (public.apply_lifting_workout_mutation(
    'd6333333-3333-4333-8333-333333333333', (select workout_id from phase64d_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select set_id from phase64d_ids), 'setType', 'WORKING', 'weightKg', 100, 'reps', 5, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
  ) ->> 'resultId')::uuid,
  (select set_id from phase64d_ids),
  'ambiguous retry returns the original save receipt'
);
select is((select revision from public.workout_sets where id=(select set_id from phase64d_ids)), 1::bigint, 'idempotent replay does not apply the save twice');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'd6444444-4444-4444-8444-444444444444', (select workout_id from phase64d_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select set_id from phase64d_ids), 'setType', 'WORKING', 'weightKg', 80, 'reps', 8, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Set changed on the server.',
  'stale replay is stopped instead of overwriting the newer save'
);
select results_eq(
  $$select weight_kg::text || 'x' || reps::text from public.workout_sets where id=(select set_id from phase64d_ids)$$,
  array['100.000x5'::text],
  'newer authoritative set survives the stale retry'
);

update phase64d_ids
set copied_set_id = (public.apply_lifting_workout_mutation(
  'd6555555-5555-4555-8555-555555555555', workout_id, 'COPY_SET',
  jsonb_build_object('workoutSetId', set_id, 'expectedRevision', 1)
) ->> 'resultId')::uuid;
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_id from phase64d_ids)), 2, 'copy creates one additional set');

select public.apply_lifting_workout_mutation(
  'd6555555-5555-4555-8555-555555555555', (select workout_id from phase64d_ids), 'COPY_SET',
  jsonb_build_object('workoutSetId', (select set_id from phase64d_ids), 'expectedRevision', 1)
);
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_id from phase64d_ids)), 2, 'duplicate copy delivery cannot create a third set');

select public.apply_lifting_workout_mutation(
  'd6666666-6666-4666-8666-666666666666', (select workout_id from phase64d_ids), 'REMOVE_SET',
  jsonb_build_object('workoutSetId', (select copied_set_id from phase64d_ids), 'expectedRevision', 0)
);
select is((select count(*)::integer from public.workout_sets where id=(select copied_set_id from phase64d_ids)), 0, 'destructive delete removes the intended copied set');
select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'd6777777-7777-4777-8777-777777777777', (select workout_id from phase64d_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select copied_set_id from phase64d_ids), 'setType', 'WORKING', 'weightKg', 70, 'reps', 10, 'bodyweightMode', null, 'completed', false, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Set was removed on the server.',
  'reconnect cannot resurrect a deleted set'
);

select public.finish_lifting_workout((select workout_id from phase64d_ids));
select is((select status::text from public.workout_sessions where id=(select workout_id from phase64d_ids)), 'COMPLETED', 'finished workout remains completed');
select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'd6888888-8888-4888-8888-888888888888', (select workout_id from phase64d_ids), 'ADD_SET',
    jsonb_build_object('workoutExerciseId', (select exercise_id from phase64d_ids), 'setType', 'WORKING')
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Workout is no longer active on the server.',
  'queued capture cannot mutate a workout finished on another device'
);

update phase64d_ids set second_workout_id = public.start_or_resume_lifting_workout();
update phase64d_ids
set second_exercise_id = (public.apply_lifting_workout_mutation(
  'd6999999-9999-4999-8999-999999999999', second_workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'ee611111-1111-4111-8111-111111111111')
) ->> 'resultId')::uuid;
update phase64d_ids
set second_set_id = (public.apply_lifting_workout_mutation(
  'da111111-1111-4111-8111-111111111111', second_workout_id, 'ADD_SET',
  jsonb_build_object('workoutExerciseId', second_exercise_id, 'setType', 'WORKING')
) ->> 'resultId')::uuid;
select public.cancel_lifting_workout((select second_workout_id from phase64d_ids));
select is((select status::text from public.workout_sessions where id=(select second_workout_id from phase64d_ids)), 'CANCELLED', 'cancelled workout remains cancelled');
select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'da222222-2222-4222-8222-222222222222', (select second_workout_id from phase64d_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select second_set_id from phase64d_ids), 'setType', 'WORKING', 'weightKg', 50, 'reps', 10, 'bodyweightMode', null, 'completed', false, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Workout is no longer active on the server.',
  'queued capture cannot mutate a workout cancelled on another device'
);

reset role;
select is((select count(*)::integer from public.workout_mutation_receipts where user_id='e6111111-1111-4111-8111-111111111111' and result_payload is not null), 7, 'only successful unique writes produce completed receipts across the reliability journey');

select * from finish();
rollback;
