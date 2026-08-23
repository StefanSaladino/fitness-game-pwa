begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select has_function(
  'public',
  'start_lifting_workout_from_preset',
  array['uuid[]', 'timestamp with time zone'],
  'preset workout start RPC exists'
);
select is(
  has_function_privilege('authenticated', 'public.start_lifting_workout_from_preset(uuid[],timestamp with time zone)', 'execute'),
  true,
  'authenticated can start a preset workout'
);
select is(
  has_function_privilege('anon', 'public.start_lifting_workout_from_preset(uuid[],timestamp with time zone)', 'execute'),
  false,
  'anon cannot start a preset workout'
);

insert into auth.users (id, email) values
  ('a8888888-8888-4888-8888-888888888888', 'preset-owner@test.local');

set local role authenticated;
set local request.jwt.claim.sub = 'a8888888-8888-4888-8888-888888888888';

create temporary table phase158_ids(workout_id uuid, bench_id uuid, row_id uuid, squat_id uuid) on commit drop;
insert into phase158_ids(bench_id, row_id, squat_id)
select
  (select id from public.exercise_catalog where canonical_name = 'Barbell Bench Press' and active = true limit 1),
  (select id from public.exercise_catalog where canonical_name = 'Barbell Row' and active = true limit 1),
  (select id from public.exercise_catalog where canonical_name = 'Back Squat' and active = true limit 1);

select ok(
  (select bench_id is not null and row_id is not null and squat_id is not null from phase158_ids),
  'verified canonical preset exercises exist'
);

update phase158_ids
set workout_id = (
  select (public.start_lifting_workout_from_preset(
    array[bench_id, row_id, squat_id],
    clock_timestamp()
  ) ->> 'id')::uuid
  from phase158_ids source
);

select results_eq(
  $$select count(*)::bigint from public.workout_sessions where id=(select workout_id from phase158_ids) and user_id='a8888888-8888-4888-8888-888888888888' and status='IN_PROGRESS'$$,
  array[1::bigint],
  'preset start creates one active lifting session'
);
select results_eq(
  $$select e.canonical_name from public.workout_exercises we join public.exercise_catalog e on e.id=we.exercise_id where we.workout_id=(select workout_id from phase158_ids) order by we.order_index$$,
  array['Barbell Bench Press'::text, 'Barbell Row'::text, 'Back Squat'::text],
  'preset exercises persist atomically in requested order'
);
select is(
  (select array_agg(order_index order by order_index) from public.workout_exercises where workout_id=(select workout_id from phase158_ids)),
  array[0,1,2]::integer[],
  'preset exercise ordering starts at zero and remains contiguous'
);

select throws_ok(
  $$select public.start_lifting_workout_from_preset(array[(select bench_id from phase158_ids)], clock_timestamp())$$,
  '22023',
  'Preset workout requires an empty active lift',
  'preset cannot overwrite or append onto a non-empty active lift'
);

select public.cancel_lifting_workout((select workout_id from phase158_ids));

select throws_ok(
  $$select public.start_lifting_workout_from_preset(array[(select bench_id from phase158_ids),(select bench_id from phase158_ids)], clock_timestamp())$$,
  '22023',
  'Preset workout cannot contain duplicate exercises',
  'duplicate preset exercises fail closed'
);
select results_eq(
  $$select count(*)::bigint from public.workout_sessions where user_id='a8888888-8888-4888-8888-888888888888' and status='IN_PROGRESS'$$,
  array[0::bigint],
  'failed preset validation does not leave an active workout behind'
);

reset role;
select * from finish();
rollback;
