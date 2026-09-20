begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_function(
  'public',
  'get_my_muscle_performance_observations',
  array['date', 'integer'],
  'Phase 19.8 muscle-performance RPC exists'
);

select ok(
  coalesce((
    select not p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_my_muscle_performance_observations'
      and pg_get_function_identity_arguments(p.oid)
        = 'p_anchor_date date, p_lookback_days integer'
  ), false),
  'muscle-performance RPC is SECURITY INVOKER'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.get_my_muscle_performance_observations(date, integer)',
    'execute'
  ),
  true,
  'authenticated can execute muscle-performance RPC'
);

select is(
  has_function_privilege(
    'anon',
    'public.get_my_muscle_performance_observations(date, integer)',
    'execute'
  ),
  false,
  'anon cannot execute muscle-performance RPC'
);

insert into auth.users (id, email) values
  ('19800000-0000-4000-8000-000000000001', 'phase198-primary@test.local'),
  ('29800000-0000-4000-8000-000000000002', 'phase198-other@test.local');

update public.profiles
set username = 'phase198_primary',
    display_name = 'Phase 19.8 Primary',
    timezone = 'UTC',
    onboarding_completed_at = now()
where id = '19800000-0000-4000-8000-000000000001';

update public.profiles
set username = 'phase198_other',
    display_name = 'Phase 19.8 Other',
    timezone = 'UTC',
    onboarding_completed_at = now()
where id = '29800000-0000-4000-8000-000000000002';

create temporary table phase198_exercises (
  kind text primary key,
  exercise_id uuid not null
) on commit drop;

insert into phase198_exercises(kind, exercise_id)
select 'BENCH', id
from public.exercise_catalog
where canonical_name = 'Barbell Bench Press'
  and active
union all
select 'FLY', id
from public.exercise_catalog
where canonical_name = 'Cable Chest Fly'
  and active;

insert into public.workout_sessions (
  id, user_id, category, status, source,
  started_at, ended_at, active_duration_seconds,
  timezone_at_start, scoring_date,
  qualifies, needs_review, qualifies_lifting, qualifies_cardio_bonus
)
values
  ('19800000-0000-4000-8000-000000001000','19800000-0000-4000-8000-000000000001','STRENGTH','COMPLETED','IN_APP','2026-07-01T12:00:00Z','2026-07-01T13:00:00Z',3600,'UTC','2026-07-01',true,false,true,false),
  ('19800000-0000-4000-8000-000000001001','19800000-0000-4000-8000-000000000001','STRENGTH','COMPLETED','IN_APP','2026-08-01T12:00:00Z','2026-08-01T13:00:00Z',3600,'UTC','2026-08-01',true,false,true,false),
  ('19800000-0000-4000-8000-000000001002','19800000-0000-4000-8000-000000000001','STRENGTH','COMPLETED','IN_APP','2026-08-15T12:00:00Z','2026-08-15T13:00:00Z',3600,'UTC','2026-08-15',true,false,true,false),
  ('19800000-0000-4000-8000-000000001003','19800000-0000-4000-8000-000000000001','STRENGTH','COMPLETED','IN_APP','2026-09-01T12:00:00Z','2026-09-01T13:00:00Z',3600,'UTC','2026-09-01',true,false,true,false),
  ('19800000-0000-4000-8000-000000001004','19800000-0000-4000-8000-000000000001','STRENGTH','COMPLETED','IN_APP','2026-09-15T12:00:00Z','2026-09-15T13:00:00Z',3600,'UTC','2026-09-15',true,false,true,false),
  ('19800000-0000-4000-8000-000000001005','29800000-0000-4000-8000-000000000002','STRENGTH','COMPLETED','IN_APP','2026-09-15T12:00:00Z','2026-09-15T13:00:00Z',3600,'UTC','2026-09-15',true,false,true,false);

insert into public.exercise_progress_observations (
  user_id, workout_id, exercise_id, metric_type,
  metric_value, weight_kg, reps, scoring_date, valid
)
values
  ('19800000-0000-4000-8000-000000000001','19800000-0000-4000-8000-000000001000',(select exercise_id from phase198_exercises where kind='BENCH'),'E1RM',90,80,4,'2026-07-01',true),
  ('19800000-0000-4000-8000-000000000001','19800000-0000-4000-8000-000000001001',(select exercise_id from phase198_exercises where kind='BENCH'),'E1RM',100,90,4,'2026-08-01',true),
  ('19800000-0000-4000-8000-000000000001','19800000-0000-4000-8000-000000001002',(select exercise_id from phase198_exercises where kind='BENCH'),'E1RM',110,100,3,'2026-08-15',true),
  ('19800000-0000-4000-8000-000000000001','19800000-0000-4000-8000-000000001003',(select exercise_id from phase198_exercises where kind='FLY'),'E1RM',50,40,6,'2026-09-01',true),
  ('19800000-0000-4000-8000-000000000001','19800000-0000-4000-8000-000000001004',(select exercise_id from phase198_exercises where kind='FLY'),'E1RM',55,45,6,'2026-09-15',true),
  ('29800000-0000-4000-8000-000000000002','19800000-0000-4000-8000-000000001005',(select exercise_id from phase198_exercises where kind='BENCH'),'E1RM',999,900,3,'2026-09-15',true);

insert into public.exercise_progress_observations (
  user_id, workout_id, exercise_id, metric_type,
  metric_value, weight_kg, reps, scoring_date, valid
)
values (
  '19800000-0000-4000-8000-000000000001',
  '19800000-0000-4000-8000-000000001004',
  (select exercise_id from phase198_exercises where kind='BENCH'),
  'BODYWEIGHT_REPS',
  200,
  null,
  200,
  '2026-09-15',
  false
);

grant select on phase198_exercises to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '19800000-0000-4000-8000-000000000001';

select results_eq(
  $$select count(*)::bigint
    from public.get_my_muscle_performance_observations('2026-09-19', 56)
    where muscle_group = 'CHEST'$$,
  array[4::bigint],
  '56-day Chest performance read model returns only the four valid in-window primary-user observations'
);

select results_eq(
  $$select scoring_date, reference_metric_value, round(relative_performance_index, 4)
    from public.get_my_muscle_performance_observations('2026-09-19', 56)
    where muscle_group = 'CHEST'
      and exercise_id = (select exercise_id from phase198_exercises where kind='BENCH')
    order by scoring_date$$,
  $$values
      ('2026-08-01'::date, 100::numeric, 1.0000::numeric),
      ('2026-08-15'::date, 100::numeric, 1.1000::numeric)$$,
  'Bench observations normalize against the first valid in-window Bench observation'
);

select results_eq(
  $$select scoring_date, reference_metric_value, round(relative_performance_index, 4)
    from public.get_my_muscle_performance_observations('2026-09-19', 56)
    where muscle_group = 'CHEST'
      and exercise_id = (select exercise_id from phase198_exercises where kind='FLY')
    order by scoring_date$$,
  $$values
      ('2026-09-01'::date, 50::numeric, 1.0000::numeric),
      ('2026-09-15'::date, 50::numeric, 1.1000::numeric)$$,
  'Cable Fly observations normalize independently from Bench observations'
);

select results_eq(
  $$select count(*)::bigint
    from public.get_my_muscle_performance_observations('2026-09-19', 56)
    where scoring_date = '2026-07-01'$$,
  array[0::bigint],
  'observations outside the requested lookback are excluded before normalization'
);

select results_eq(
  $$select count(*)::bigint
    from public.get_my_muscle_performance_observations('2026-09-19', 56)
    where metric_value = 200$$,
  array[0::bigint],
  'invalid progress observations are excluded'
);

select results_eq(
  $$select count(*)::bigint
    from public.get_my_muscle_performance_observations('2026-09-19', 56)
    where metric_value = 999$$,
  array[0::bigint],
  'SECURITY INVOKER plus RLS prevents another user performance observation from leaking'
);

select ok(
  exists (
    select 1
    from public.get_my_muscle_performance_observations('2026-09-19', 56)
    where exercise_id = (select exercise_id from phase198_exercises where kind='BENCH')
      and muscle_group = 'SHOULDERS'
      and contribution_role = 'INDIRECT'
      and contribution_weight = 0.5
  ),
  'performance observations preserve the reviewed indirect muscle contribution metadata'
);

select throws_ok(
  $$select * from public.get_my_muscle_performance_observations('2026-09-19', 27)$$,
  '22023',
  'Lookback days must be between 28 and 180',
  'lookback shorter than 28 days is rejected'
);

select throws_ok(
  $$select * from public.get_my_muscle_performance_observations('2026-09-19', 181)$$,
  '22023',
  'Lookback days must be between 28 and 180',
  'lookback longer than 180 days is rejected'
);

reset role;
select * from finish();
rollback;
