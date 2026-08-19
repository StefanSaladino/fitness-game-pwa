begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

select has_table('public', 'scoring_events', 'lifting-v1 scoring ledger exists');
select has_table('public', 'exercise_progress_observations', 'exercise progression observations exist');
select has_table('public', 'exercise_progress', 'exercise progress snapshot exists');
select has_column('public', 'workout_sessions', 'qualifies_lifting', 'workout has lifting qualification flag');
select has_column('public', 'workout_sessions', 'qualifies_cardio_bonus', 'workout has cardio bonus qualification flag');
select col_is_pk('public', 'scoring_events', 'id', 'scoring events id is primary key');
select has_function('public', 'prepare_workout_session', array[]::text[], 'qualification trigger function still exists');

insert into auth.users (id, email)
values ('81111111-1111-4111-8111-111111111111', 'lifting-v1@test.local');

insert into public.exercise_catalog (id, canonical_name, measurement_type)
values ('80000000-0000-4000-8000-000000000001', 'Phase 5.4 Test Bench Press', 'WEIGHT_REPS');

insert into public.workout_sessions (
  id,user_id,category,status,source,started_at,active_duration_seconds,timezone_at_start,scoring_date
) values
 ('80000000-0000-4000-8000-000000000010','81111111-1111-4111-8111-111111111111','RUNNING','COMPLETED','MANUAL',now(),900,'America/Toronto',current_date),
 ('80000000-0000-4000-8000-000000000011','81111111-1111-4111-8111-111111111111','MOBILITY','COMPLETED','MANUAL',now(),3600,'America/Toronto',current_date),
 ('80000000-0000-4000-8000-000000000012','81111111-1111-4111-8111-111111111111','STRENGTH','IN_PROGRESS','IN_APP',now(),900,'America/Toronto',current_date);

select is((select qualifies_lifting from public.workout_sessions where id='80000000-0000-4000-8000-000000000010'), false, 'running never qualifies as lifting');
select is((select qualifies_cardio_bonus from public.workout_sessions where id='80000000-0000-4000-8000-000000000010'), true, '15-minute run qualifies for cardio bonus');
select is((select qualifies from public.workout_sessions where id='80000000-0000-4000-8000-000000000010'), true, 'legacy aggregate flag mirrors cardio scoring eligibility');
select is((select qualifies_cardio_bonus from public.workout_sessions where id='80000000-0000-4000-8000-000000000011'), false, 'mobility does not qualify for cardio bonus');
select is((select qualifies from public.workout_sessions where id='80000000-0000-4000-8000-000000000011'), false, 'mobility is history-only for lifting-v1 scoring');

insert into public.workout_exercises (id, workout_id, exercise_id, order_index)
values ('80000000-0000-4000-8000-000000000020','80000000-0000-4000-8000-000000000012','80000000-0000-4000-8000-000000000001',0);

insert into public.workout_sets (workout_exercise_id,set_number,set_type,weight_kg,reps,completed,completed_at) values
 ('80000000-0000-4000-8000-000000000020',1,'WORKING',80,8,true,now()),
 ('80000000-0000-4000-8000-000000000020',2,'WORKING',80,8,true,now()),
 ('80000000-0000-4000-8000-000000000020',3,'WORKING',80,8,true,now()),
 ('80000000-0000-4000-8000-000000000020',4,'WORKING',80,8,true,now());

update public.workout_sessions
set status='COMPLETED', ended_at=now()
where id='80000000-0000-4000-8000-000000000012';

select is((select qualifies_lifting from public.workout_sessions where id='80000000-0000-4000-8000-000000000012'), true, 'strength qualifies with 15 minutes and four working sets');
select is((select qualifies_cardio_bonus from public.workout_sessions where id='80000000-0000-4000-8000-000000000012'), false, 'strength never uses cardio bonus flag');
select is((select qualifies from public.workout_sessions where id='80000000-0000-4000-8000-000000000012'), true, 'legacy aggregate flag mirrors lifting scoring eligibility');

set local role authenticated;
select set_config('request.jwt.claim.sub', '81111111-1111-4111-8111-111111111111', true);

select throws_ok(
  $$insert into public.scoring_events (user_id,scoring_date,workout_id,event_type,amount) values ('81111111-1111-4111-8111-111111111111',current_date,'80000000-0000-4000-8000-000000000012','LIFTING_WORKOUT',50)$$,
  '42501',
  null,
  'authenticated client cannot write authoritative scoring events'
);

select throws_ok(
  $$insert into public.exercise_progress (user_id,exercise_id,metric_type,best_value,source_workout_id,achieved_at) values ('81111111-1111-4111-8111-111111111111','80000000-0000-4000-8000-000000000001','E1RM',100,'80000000-0000-4000-8000-000000000012',now())$$,
  '42501',
  null,
  'authenticated client cannot write exercise progress snapshots'
);

reset role;
select * from finish();
rollback;
