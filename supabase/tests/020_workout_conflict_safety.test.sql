begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

select has_column('public', 'workout_exercises', 'revision', 'workout exercises expose a conflict revision');
select has_column('public', 'workout_sets', 'revision', 'workout sets expose a conflict revision');
select has_function('public', 'bump_workout_row_revision', array[]::text[], 'row revision trigger function exists');
select has_function('public', 'apply_lifting_workout_mutation', array['uuid','uuid','text','jsonb'], 'mutation gateway remains the write boundary');
select is(has_function_privilege('authenticated', 'public.apply_lifting_workout_mutation(uuid,uuid,text,jsonb)', 'execute'), true, 'authenticated keeps gateway execute access');

insert into auth.users (id, email) values
  ('e5111111-1111-4111-8111-111111111111', 'conflict-owner@test.local');

insert into public.exercise_catalog (id, canonical_name, measurement_type, active) values
  ('ee511111-1111-4111-8111-111111111111', 'Conflict Bench Press', 'WEIGHT_REPS', true),
  ('ee522222-2222-4222-8222-222222222222', 'Conflict Row', 'WEIGHT_REPS', true);

set local role authenticated;
set local request.jwt.claim.sub = 'e5111111-1111-4111-8111-111111111111';

create temporary table phase64c_ids(
  workout_id uuid,
  second_workout_id uuid,
  exercise_one_id uuid,
  exercise_two_id uuid,
  set_one_id uuid,
  copied_set_id uuid,
  second_set_id uuid,
  set_one_revision bigint
) on commit drop;

insert into phase64c_ids(workout_id) values (public.start_or_resume_lifting_workout());

update phase64c_ids
set exercise_one_id = (public.apply_lifting_workout_mutation(
  'd5111111-1111-4111-8111-111111111111', workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'ee511111-1111-4111-8111-111111111111')
) ->> 'resultId')::uuid,
exercise_two_id = (public.apply_lifting_workout_mutation(
  'd5222222-2222-4222-8222-222222222222', workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'ee522222-2222-4222-8222-222222222222')
) ->> 'resultId')::uuid;

select is((select revision from public.workout_exercises where id=(select exercise_one_id from phase64c_ids)), 0::bigint, 'new exercise starts at revision zero');
select is((select revision from public.workout_exercises where id=(select exercise_two_id from phase64c_ids)), 0::bigint, 'second new exercise starts at revision zero');

select public.apply_lifting_workout_mutation(
  'd5333333-3333-4333-8333-333333333333', (select workout_id from phase64c_ids), 'MOVE_EXERCISE',
  jsonb_build_object('workoutExerciseId', (select exercise_two_id from phase64c_ids), 'newOrderIndex', 0, 'expectedRevision', 0)
);

select results_eq(
  $$select exercise_id::text from public.workout_exercises where workout_id=(select workout_id from phase64c_ids) order by order_index$$,
  array['ee522222-2222-4222-8222-222222222222'::text, 'ee511111-1111-4111-8111-111111111111'::text],
  'revision-matched move changes authoritative order'
);
select cmp_ok((select revision from public.workout_exercises where id=(select exercise_two_id from phase64c_ids)), '>', 0::bigint, 'exercise revision advances after reorder');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'd5444444-4444-4444-8444-444444444444', (select workout_id from phase64c_ids), 'MOVE_EXERCISE',
    jsonb_build_object('workoutExerciseId', (select exercise_two_id from phase64c_ids), 'newOrderIndex', 1, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Exercise order changed on the server.',
  'stale exercise reorder is rejected as a conflict'
);
select results_eq(
  $$select exercise_id::text from public.workout_exercises where workout_id=(select workout_id from phase64c_ids) order by order_index$$,
  array['ee522222-2222-4222-8222-222222222222'::text, 'ee511111-1111-4111-8111-111111111111'::text],
  'stale move cannot overwrite newer exercise order'
);

update phase64c_ids
set set_one_id = (public.apply_lifting_workout_mutation(
  'f5111111-1111-4111-8111-111111111111', workout_id, 'ADD_SET',
  jsonb_build_object('workoutExerciseId', exercise_one_id, 'setType', 'WORKING')
) ->> 'resultId')::uuid;

select is((select revision from public.workout_sets where id=(select set_one_id from phase64c_ids)), 0::bigint, 'new set starts at revision zero');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'f5000000-0000-4000-8000-000000000000', (select workout_id from phase64c_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 90, 'reps', 8, 'bodyweightMode', null, 'completed', false)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Queued change has no safe server revision.',
  'legacy destructive writes without a revision are surfaced as conflicts'
);
select is((select revision from public.workout_sets where id=(select set_one_id from phase64c_ids)), 0::bigint, 'unsafe legacy replay leaves the server set unchanged');

select public.apply_lifting_workout_mutation(
  'f5222222-2222-4222-8222-222222222222', (select workout_id from phase64c_ids), 'SAVE_SET',
  jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 100, 'reps', 5, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
);
select is((select revision from public.workout_sets where id=(select set_one_id from phase64c_ids)), 1::bigint, 'accepted set save advances the revision');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'f5333333-3333-4333-8333-333333333333', (select workout_id from phase64c_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 80, 'reps', 10, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Set changed on the server.',
  'stale set save is rejected instead of overwriting newer data'
);
select results_eq(
  $$select weight_kg::text || 'x' || reps::text from public.workout_sets where id=(select set_one_id from phase64c_ids)$$,
  array['100.000x5'::text],
  'newer set value survives a stale save attempt'
);

select is(
  (public.apply_lifting_workout_mutation(
    'f5222222-2222-4222-8222-222222222222', (select workout_id from phase64c_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 100, 'reps', 5, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
  ) ->> 'resultId')::uuid,
  (select set_one_id from phase64c_ids),
  'exact idempotent replay returns its receipt even after revision advances'
);

update phase64c_ids
set copied_set_id = (public.apply_lifting_workout_mutation(
  'f5444444-4444-4444-8444-444444444444', workout_id, 'COPY_SET',
  jsonb_build_object('workoutSetId', set_one_id, 'expectedRevision', 1)
) ->> 'resultId')::uuid;
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_one_id from phase64c_ids)), 2, 'revision-matched copy creates one set');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'f5555555-5555-4555-8555-555555555555', (select workout_id from phase64c_ids), 'COPY_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Set changed on the server.',
  'copying from a stale source revision is rejected'
);

select public.apply_lifting_workout_mutation(
  'f5666666-6666-4666-8666-666666666666', (select workout_id from phase64c_ids), 'REMOVE_SET',
  jsonb_build_object('workoutSetId', (select copied_set_id from phase64c_ids), 'expectedRevision', 0)
);
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_one_id from phase64c_ids)), 1, 'revision-matched delete removes only the intended set');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'f5777777-7777-4777-8777-777777777777', (select workout_id from phase64c_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select copied_set_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 70, 'reps', 8, 'bodyweightMode', null, 'completed', false, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Set was removed on the server.',
  'a stale edit cannot resurrect a deleted set'
);
select is((select count(*)::integer from public.workout_sets where id=(select copied_set_id from phase64c_ids)), 0, 'deleted set remains deleted after stale replay');

update phase64c_ids
set set_one_revision = (select revision from public.workout_sets where id=set_one_id);

select public.apply_lifting_workout_mutation(
  'f5888888-8888-4888-8888-888888888888', (select workout_id from phase64c_ids), 'SAVE_SET',
  jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 102.5, 'reps', 4, 'bodyweightMode', null, 'completed', true, 'expectedRevision', (select set_one_revision from phase64c_ids))
);
select cmp_ok(
  (select revision from public.workout_sets where id=(select set_one_id from phase64c_ids)),
  '>',
  (select set_one_revision from phase64c_ids),
  'accepted later save advances from the current server revision'
);

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'f5999999-9999-4999-8999-999999999999', (select workout_id from phase64c_ids), 'REMOVE_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'expectedRevision', (select set_one_revision from phase64c_ids))
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Set changed on the server.',
  'stale destructive delete cannot erase a newer set edit'
);
select is((select count(*)::integer from public.workout_sets where id=(select set_one_id from phase64c_ids)), 1, 'set remains after stale destructive delete');

select public.finish_lifting_workout((select workout_id from phase64c_ids));
select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'fa111111-1111-4111-8111-111111111111', (select workout_id from phase64c_ids), 'ADD_SET',
    jsonb_build_object('workoutExerciseId', (select exercise_one_id from phase64c_ids), 'setType', 'WORKING')
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Workout is no longer active on the server.',
  'completed workout rejects later queued capture mutations as conflicts'
);
select is((select status::text from public.workout_sessions where id=(select workout_id from phase64c_ids)), 'COMPLETED', 'completed workout remains immutable');

update phase64c_ids set second_workout_id = public.start_or_resume_lifting_workout();
update phase64c_ids
set exercise_one_id = (public.apply_lifting_workout_mutation(
  'fa222222-2222-4222-8222-222222222222', second_workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'ee511111-1111-4111-8111-111111111111')
) ->> 'resultId')::uuid;
update phase64c_ids
set second_set_id = (public.apply_lifting_workout_mutation(
  'fa333333-3333-4333-8333-333333333333', second_workout_id, 'ADD_SET',
  jsonb_build_object('workoutExerciseId', exercise_one_id, 'setType', 'WORKING')
) ->> 'resultId')::uuid;
select public.cancel_lifting_workout((select second_workout_id from phase64c_ids));

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'fa444444-4444-4444-8444-444444444444', (select second_workout_id from phase64c_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select second_set_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 50, 'reps', 10, 'bodyweightMode', null, 'completed', false, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Workout is no longer active on the server.',
  'cancelled workout rejects queued edits as conflicts'
);
select is((select status::text from public.workout_sessions where id=(select second_workout_id from phase64c_ids)), 'CANCELLED', 'cancelled workout remains immutable');

reset role;
select is((select count(*)::integer from public.workout_mutation_receipts where user_id='e5111111-1111-4111-8111-111111111111' and result_payload is not null), 10, 'only successful unique mutations create completed receipts');

select * from finish();
rollback;
