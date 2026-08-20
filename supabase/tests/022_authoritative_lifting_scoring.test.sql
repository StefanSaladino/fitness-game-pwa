begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

select has_function('public', 'reconcile_lifting_v1_scoring_for_user', array['uuid'], 'internal lifting-v1 reconciliation function exists');
select has_function('public', 'reconcile_my_lifting_v1_scoring', array[]::text[], 'authenticated self-reconciliation wrapper exists');
select has_function('public', 'reconcile_lifting_v1_source_change', array[]::text[], 'source-change trigger function exists');
select is(has_function_privilege('authenticated', 'public.reconcile_lifting_v1_scoring_for_user(uuid)', 'execute'), false, 'authenticated cannot rebuild another user directly');
select is(has_function_privilege('authenticated', 'public.reconcile_my_lifting_v1_scoring()', 'execute'), true, 'authenticated may rebuild only its own score');
select is(has_function_privilege('anon', 'public.reconcile_my_lifting_v1_scoring()', 'execute'), false, 'anonymous clients cannot invoke scoring reconciliation');
select ok(
  position('scoring_version' in pg_get_indexdef('public.scoring_events_lifting_workout_unique'::regclass)) > 0
  and position('scoring_version' in pg_get_indexdef('public.scoring_events_exercise_complete_unique'::regclass)) > 0
  and position('scoring_version' in pg_get_indexdef('public.scoring_events_exercise_progress_unique'::regclass)) > 0
  and position('scoring_version' in pg_get_indexdef('public.scoring_events_cardio_bonus_unique'::regclass)) > 0,
  'authoritative event uniqueness is version-aware'
);

insert into auth.users (id, email) values
  ('71111111-1111-4111-8111-111111111111', 'phase7-score@test.local');

insert into public.exercise_catalog (id, canonical_name, measurement_type, active) values
  ('71000000-0000-4000-8000-000000000001', 'Phase 7 Weight 1', 'WEIGHT_REPS', true),
  ('71000000-0000-4000-8000-000000000002', 'Phase 7 Weight 2', 'WEIGHT_REPS', true),
  ('71000000-0000-4000-8000-000000000003', 'Phase 7 Weight 3', 'WEIGHT_REPS', true),
  ('71000000-0000-4000-8000-000000000004', 'Phase 7 Weight 4', 'WEIGHT_REPS', true),
  ('71000000-0000-4000-8000-000000000005', 'Phase 7 Weight 5', 'WEIGHT_REPS', true),
  ('71000000-0000-4000-8000-000000000006', 'Phase 7 Weight 6', 'WEIGHT_REPS', true),
  ('71000000-0000-4000-8000-000000000007', 'Phase 7 Weight 7', 'WEIGHT_REPS', true),
  ('71000000-0000-4000-8000-000000000008', 'Phase 7 Bodyweight', 'BODYWEIGHT_REPS', true);

-- Build day one through the real one-active-lift lifecycle before starting day two.
insert into public.workout_sessions (
  id, user_id, category, status, source, started_at, ended_at,
  active_duration_seconds, timezone_at_start, scoring_date
) values
  ('72000000-0000-4000-8000-000000000001','71111111-1111-4111-8111-111111111111','STRENGTH','IN_PROGRESS','IN_APP','2026-08-10 12:00+00',null,1200,'UTC','2026-08-10');

insert into public.workout_exercises (id, workout_id, exercise_id, order_index)
select gen_random_uuid(), '72000000-0000-4000-8000-000000000001'::uuid, e.id, row_number() over (order by e.id) - 1
from public.exercise_catalog e
where e.canonical_name like 'Phase 7 Weight %';

insert into public.workout_sets (
  id, workout_exercise_id, set_number, set_type, weight_kg, reps, completed, completed_at
)
select
  gen_random_uuid(), we.id, s.n, 'WORKING', 100, 10, true,
  '2026-08-10 12:15+00'::timestamptz + (s.n * interval '1 minute')
from public.workout_exercises we
cross join (values (1),(2)) as s(n)
where we.workout_id='72000000-0000-4000-8000-000000000001';

update public.workout_sessions
set status='COMPLETED', ended_at='2026-08-10 12:20+00'
where id='72000000-0000-4000-8000-000000000001';

-- Only after day one is closed may the same user have another active in-app lift.
insert into public.workout_sessions (
  id, user_id, category, status, source, started_at, ended_at,
  active_duration_seconds, timezone_at_start, scoring_date
) values
  ('72000000-0000-4000-8000-000000000002','71111111-1111-4111-8111-111111111111','STRENGTH','IN_PROGRESS','IN_APP','2026-08-11 12:00+00',null,1200,'UTC','2026-08-11');

insert into public.workout_exercises (id, workout_id, exercise_id, order_index)
select gen_random_uuid(), '72000000-0000-4000-8000-000000000002'::uuid, e.id, row_number() over (order by e.id) - 1
from public.exercise_catalog e
where e.canonical_name like 'Phase 7 Weight %';

insert into public.workout_sets (
  id, workout_exercise_id, set_number, set_type, weight_kg, reps, completed, completed_at
)
select
  gen_random_uuid(), we.id, s.n, 'WORKING',
  case we.exercise_id
    when '71000000-0000-4000-8000-000000000001' then 101
    when '71000000-0000-4000-8000-000000000002' then 103
    when '71000000-0000-4000-8000-000000000003' then 106
    else 100
  end,
  10, true,
  '2026-08-11 12:15+00'::timestamptz + (s.n * interval '1 minute')
from public.workout_exercises we
cross join (values (1),(2)) as s(n)
where we.workout_id='72000000-0000-4000-8000-000000000002';

update public.workout_sessions
set status='COMPLETED', ended_at='2026-08-11 12:20+00'
where id='72000000-0000-4000-8000-000000000002';

-- Two eligible cardio activities on day two: only the best 45-minute tier wins.
insert into public.workout_sessions (
  id,user_id,category,status,source,started_at,ended_at,active_duration_seconds,timezone_at_start,scoring_date
) values
  ('72000000-0000-4000-8000-000000000003','71111111-1111-4111-8111-111111111111','RUNNING','COMPLETED','IN_APP','2026-08-11 18:00+00','2026-08-11 18:45+00',2700,'UTC','2026-08-11'),
  ('72000000-0000-4000-8000-000000000004','71111111-1111-4111-8111-111111111111','CYCLING','COMPLETED','IN_APP','2026-08-11 19:00+00','2026-08-11 19:30+00',1800,'UTC','2026-08-11');

select is((select qualifies_lifting from public.workout_sessions where id='72000000-0000-4000-8000-000000000001'), true, 'completed source lift is authoritatively qualified');
select is((select sum(amount)::integer from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_date='2026-08-10' and scoring_version='lifting-v1'), 80, 'baseline day earns 50 lift plus capped 30 exercise completion XP');
select is((select coalesce(sum(amount),0)::integer from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_date='2026-08-10' and event_type='EXERCISE_PROGRESS' and scoring_version='lifting-v1'), 0, 'first valid performances establish baselines without progression XP');
select is((select count(*)::integer from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_date='2026-08-10' and event_type='EXERCISE_COMPLETE' and scoring_version='lifting-v1'), 6, 'exercise completion is capped at six canonical exercises per date');
select results_eq(
  $$select event_type::text, sum(amount)::integer from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_date='2026-08-11' and scoring_version='lifting-v1' group by event_type order by event_type::text$$,
  $$values ('CARDIO_BONUS'::text,15),('EXERCISE_COMPLETE'::text,30),('EXERCISE_PROGRESS'::text,30),('LIFTING_WORKOUT'::text,50)$$,
  'day two reconciles all four lifting-v1 scoring layers to the 125-XP cap'
);
select is((select count(*)::integer from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_date='2026-08-11' and event_type='CARDIO_BONUS' and scoring_version='lifting-v1'), 1, 'multiple eligible cardio activities reconcile to one best-of-day event');
select results_eq(
  $$select amount from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_date='2026-08-11' and event_type='EXERCISE_PROGRESS' order by exercise_id$$,
  array[5,10,15],
  'weighted Epley improvements map to the locked 5/10/15 tiers'
);
select is((select count(*)::integer from public.exercise_progress_observations where user_id='71111111-1111-4111-8111-111111111111'), 14, 'one best weighted observation is stored per exercise per workout');
select is((select count(*)::integer from public.exercise_progress where user_id='71111111-1111-4111-8111-111111111111' and metric_type='E1RM'), 7, 'personal-best snapshots are rebuilt for every measurable exercise');
select results_eq(
  $$select best_weight_kg::integer, best_reps from public.exercise_progress where user_id='71111111-1111-4111-8111-111111111111' and exercise_id='71000000-0000-4000-8000-000000000003' and metric_type='E1RM'$$,
  $$values (106,10)$$,
  'personal-best snapshot retains the source weight and reps'
);
select cmp_ok(
  (select max(total)::integer from (select scoring_date,sum(amount) total from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_version='lifting-v1' group by scoring_date) d),
  '<=', 125,
  'authoritative daily totals never exceed 125 XP'
);
select is((select count(*)::integer from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_version <> 'lifting-v1'), 0, 'all newly derived events carry lifting-v1 scoring metadata');

-- Manual/external history remains stored but does not automatically manufacture XP.
insert into public.workout_sessions (
  id,user_id,category,status,source,started_at,ended_at,active_duration_seconds,timezone_at_start,scoring_date
) values
  ('72000000-0000-4000-8000-000000000005','71111111-1111-4111-8111-111111111111','RUNNING','COMPLETED','MANUAL','2026-08-11 20:00+00','2026-08-11 21:00+00',3600,'UTC','2026-08-11');
select is((select count(*)::integer from public.scoring_events where workout_id='72000000-0000-4000-8000-000000000005'), 0, 'manual history is excluded from automatic lifting-v1 XP');

-- The public recovery hook is self-scoped and idempotent.
set local role authenticated;
set local request.jwt.claim.sub = '71111111-1111-4111-8111-111111111111';
select lives_ok($$select public.reconcile_my_lifting_v1_scoring()$$, 'authenticated user can safely rebuild their own authoritative score');
reset role;
select is((select count(*)::integer from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_version='lifting-v1'), 18, 'repeated reconciliation replaces derived state without duplicating events');

-- Qualification edge: 12-minute HIIT is eligible; one second below is not.
insert into public.workout_sessions (
  id,user_id,category,status,source,started_at,ended_at,active_duration_seconds,timezone_at_start,scoring_date
) values
  ('72000000-0000-4000-8000-000000000006','71111111-1111-4111-8111-111111111111','HIIT','COMPLETED','IN_APP','2026-08-12 10:00+00','2026-08-12 10:11:59+00',719,'UTC','2026-08-12'),
  ('72000000-0000-4000-8000-000000000007','71111111-1111-4111-8111-111111111111','HIIT','COMPLETED','IN_APP','2026-08-12 11:00+00','2026-08-12 11:12+00',720,'UTC','2026-08-12');
select results_eq(
  $$select qualifies_cardio_bonus from public.workout_sessions where id in ('72000000-0000-4000-8000-000000000006','72000000-0000-4000-8000-000000000007') order by id$$,
  array[false,true],
  'database qualification matches the 12-minute HIIT oracle edge'
);
select is((select amount from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_date='2026-08-12' and event_type='CARDIO_BONUS' and scoring_version='lifting-v1'), 5, 'minimum qualifying HIIT receives the under-30-minute cardio tier');

-- Plain bodyweight progression uses best reps and keeps the first observation baseline-only.
-- As above, create/finish the baseline workout before opening the progression workout.
insert into public.workout_sessions (
  id,user_id,category,status,source,started_at,ended_at,active_duration_seconds,timezone_at_start,scoring_date
) values
  ('72000000-0000-4000-8000-000000000008','71111111-1111-4111-8111-111111111111','STRENGTH','IN_PROGRESS','IN_APP','2026-08-13 12:00+00',null,1200,'UTC','2026-08-13');
insert into public.workout_exercises (id,workout_id,exercise_id,order_index) values
  ('73000000-0000-4000-8000-000000000008','72000000-0000-4000-8000-000000000008','71000000-0000-4000-8000-000000000008',0);
insert into public.workout_sets (id,workout_exercise_id,set_number,set_type,weight_kg,reps,bodyweight_mode,completed,completed_at)
select gen_random_uuid(),'73000000-0000-4000-8000-000000000008',n,'WORKING',null,10,'BODYWEIGHT',true,'2026-08-13 12:15+00'::timestamptz from generate_series(1,4) as gs(n);
update public.workout_sessions set status='COMPLETED',ended_at='2026-08-13 12:20+00' where id='72000000-0000-4000-8000-000000000008';

insert into public.workout_sessions (
  id,user_id,category,status,source,started_at,ended_at,active_duration_seconds,timezone_at_start,scoring_date
) values
  ('72000000-0000-4000-8000-000000000009','71111111-1111-4111-8111-111111111111','STRENGTH','IN_PROGRESS','IN_APP','2026-08-14 12:00+00',null,1200,'UTC','2026-08-14');
insert into public.workout_exercises (id,workout_id,exercise_id,order_index) values
  ('73000000-0000-4000-8000-000000000009','72000000-0000-4000-8000-000000000009','71000000-0000-4000-8000-000000000008',0);
insert into public.workout_sets (id,workout_exercise_id,set_number,set_type,weight_kg,reps,bodyweight_mode,completed,completed_at)
select gen_random_uuid(),'73000000-0000-4000-8000-000000000009',n,'WORKING',null,12,'BODYWEIGHT',true,'2026-08-14 12:15+00'::timestamptz from generate_series(1,4) as gs(n);
update public.workout_sessions set status='COMPLETED',ended_at='2026-08-14 12:20+00' where id='72000000-0000-4000-8000-000000000009';
select is((select amount from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_date='2026-08-14' and exercise_id='71000000-0000-4000-8000-000000000008' and event_type='EXERCISE_PROGRESS'), 10, 'plain bodyweight +2-rep improvement earns the locked 10-XP tier');
select is((select best_reps from public.exercise_progress where user_id='71111111-1111-4111-8111-111111111111' and exercise_id='71000000-0000-4000-8000-000000000008' and metric_type='BODYWEIGHT_REPS'), 12, 'plain bodyweight personal best stores the best rep count');

-- Editing an old baseline rebuilds downstream progression rather than patching one date.
update public.workout_sets
set weight_kg=90
where workout_exercise_id=(
  select id from public.workout_exercises
  where workout_id='72000000-0000-4000-8000-000000000001'
    and exercise_id='71000000-0000-4000-8000-000000000001'
)
and set_number in (1,2);
select is((select amount from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_date='2026-08-11' and exercise_id='71000000-0000-4000-8000-000000000001' and event_type='EXERCISE_PROGRESS'), 15, 'historical baseline edit automatically rebuilds the later progression tier');
select is((select sum(amount)::integer from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_date='2026-08-11' and event_type='EXERCISE_PROGRESS'), 30, 'historical rebuild still enforces the 30-XP daily progression cap');
select is((select (metadata ->> 'capped')::boolean from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_date='2026-08-11' and exercise_id='71000000-0000-4000-8000-000000000003' and event_type='EXERCISE_PROGRESS'), true, 'capped progression event records that its raw award was trimmed by the daily ceiling');

-- Deleting later source data removes its derived award and falls the PB back to history.
delete from public.workout_exercises
where workout_id='72000000-0000-4000-8000-000000000002'
  and exercise_id='71000000-0000-4000-8000-000000000003';
select is((select count(*)::integer from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_date='2026-08-11' and exercise_id='71000000-0000-4000-8000-000000000003'), 0, 'deleting a scored exercise removes its completion/progression events for that date');
select is((select source_workout_id from public.exercise_progress where user_id='71111111-1111-4111-8111-111111111111' and exercise_id='71000000-0000-4000-8000-000000000003' and metric_type='E1RM'), '72000000-0000-4000-8000-000000000001'::uuid, 'deleting the later PR falls the personal best back to the prior source workout');
select is((select sum(amount)::integer from public.scoring_events where user_id='71111111-1111-4111-8111-111111111111' and scoring_date='2026-08-11' and scoring_version='lifting-v1'), 120, 'delete reconciliation removes orphaned progression XP without disturbing other layers');

select * from finish();
rollback;
