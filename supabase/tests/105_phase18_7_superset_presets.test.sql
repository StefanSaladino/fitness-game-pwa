begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select has_function(
  'public',
  'start_lifting_workout_from_preset',
  array['uuid[]', 'timestamp with time zone'],
  'legacy non-Superset preset RPC remains available'
);

select has_function(
  'public',
  'start_lifting_workout_from_preset',
  array['uuid[]', 'jsonb', 'timestamp with time zone'],
  'Superset-aware preset RPC exists'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.start_lifting_workout_from_preset(uuid[],jsonb,timestamp with time zone)',
    'execute'
  ),
  true,
  'authenticated can start a Superset preset'
);

select is(
  has_function_privilege(
    'anon',
    'public.start_lifting_workout_from_preset(uuid[],jsonb,timestamp with time zone)',
    'execute'
  ),
  false,
  'anon cannot start a Superset preset'
);

insert into auth.users (id, email) values
  ('a1870000-0000-4000-8000-000000000007', 'phase187-preset@test.local');

set local role authenticated;
set local request.jwt.claim.sub = 'a1870000-0000-4000-8000-000000000007';

create temporary table phase187_ids(
  workout_id uuid,
  bench_id uuid,
  row_id uuid,
  squat_id uuid,
  deadlift_id uuid
) on commit drop;

insert into phase187_ids(bench_id, row_id, squat_id, deadlift_id)
select
  (select id from public.exercise_catalog where canonical_name = 'Barbell Bench Press' and active = true limit 1),
  (select id from public.exercise_catalog where canonical_name = 'Barbell Row' and active = true limit 1),
  (select id from public.exercise_catalog where canonical_name = 'Back Squat' and active = true limit 1),
  (select id from public.exercise_catalog where canonical_name = 'Deadlift' and active = true limit 1);

select ok(
  (
    select bench_id is not null
      and row_id is not null
      and squat_id is not null
      and deadlift_id is not null
    from phase187_ids
  ),
  'canonical exercises needed by the Superset preset contract exist'
);

update phase187_ids target
set workout_id = (
  select (
    public.start_lifting_workout_from_preset(
      array[source.bench_id, source.row_id, source.squat_id, source.deadlift_id],
      jsonb_build_array(
        jsonb_build_array(source.bench_id::text, source.row_id::text),
        jsonb_build_array(source.squat_id::text, source.deadlift_id::text)
      ),
      clock_timestamp()
    ) ->> 'id'
  )::uuid
  from phase187_ids source
);

select results_eq(
  $$select count(*)::bigint from public.workout_sessions where id=(select workout_id from phase187_ids) and user_id='a1870000-0000-4000-8000-000000000007' and status='IN_PROGRESS'$$,
  array[1::bigint],
  'Superset preset start creates one active lifting session'
);

select results_eq(
  $$select e.canonical_name from public.workout_exercises we join public.exercise_catalog e on e.id=we.exercise_id where we.workout_id=(select workout_id from phase187_ids) order by we.order_index$$,
  array['Barbell Bench Press'::text, 'Barbell Row'::text, 'Back Squat'::text, 'Deadlift'::text],
  'Superset preset preserves requested exercise order'
);

select ok(
  (
    select
      count(*) = 4
      and count(distinct superset_group_id) = 2
      and bool_and(superset_group_id is not null)
      and array_agg(superset_order order by order_index) = array[0,1,0,1]::integer[]
      and min(superset_group_id) filter (where order_index = 0) = min(superset_group_id) filter (where order_index = 1)
      and min(superset_group_id) filter (where order_index = 2) = min(superset_group_id) filter (where order_index = 3)
      and min(superset_group_id) filter (where order_index = 0) <> min(superset_group_id) filter (where order_index = 2)
    from public.workout_exercises
    where workout_id=(select workout_id from phase187_ids)
  ),
  'two preset Supersets persist with independent group ids and contiguous member order'
);

select public.cancel_lifting_workout((select workout_id from phase187_ids));

select throws_ok(
  $$
    select public.start_lifting_workout_from_preset(
      array[
        (select bench_id from phase187_ids),
        (select row_id from phase187_ids),
        (select squat_id from phase187_ids)
      ],
      jsonb_build_array(
        jsonb_build_array(
          (select bench_id from phase187_ids)::text,
          (select row_id from phase187_ids)::text
        ),
        jsonb_build_array(
          (select bench_id from phase187_ids)::text,
          (select squat_id from phase187_ids)::text
        )
      ),
      clock_timestamp()
    )
  $$,
  '22023',
  'Preset exercise cannot belong to more than one Superset',
  'duplicate Superset membership fails closed'
);

select results_eq(
  $$select count(*)::bigint from public.workout_sessions where user_id='a1870000-0000-4000-8000-000000000007' and status='IN_PROGRESS'$$,
  array[0::bigint],
  'failed Superset preset validation leaves no active workout behind'
);

reset role;
select * from finish();
rollback;
