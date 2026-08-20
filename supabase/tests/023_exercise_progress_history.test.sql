begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

select has_function(
  'public',
  'get_my_exercise_progress_overview',
  array[]::text[],
  'progress overview RPC exists'
);

select has_function(
  'public',
  'get_my_exercise_progress_history',
  array['uuid'],
  'exercise progress history RPC exists'
);

select is(
  has_function_privilege('authenticated', 'public.get_my_exercise_progress_overview()', 'execute'),
  true,
  'authenticated role can execute progress overview RPC'
);
select is(
  has_function_privilege('anon', 'public.get_my_exercise_progress_overview()', 'execute'),
  false,
  'anonymous role cannot execute progress overview RPC'
);
select is(
  has_function_privilege('authenticated', 'public.get_my_exercise_progress_history(uuid)', 'execute'),
  true,
  'authenticated role can execute exercise history RPC'
);
select is(
  has_function_privilege('anon', 'public.get_my_exercise_progress_history(uuid)', 'execute'),
  false,
  'anonymous role cannot execute exercise history RPC'
);

insert into auth.users (id, email) values
  ('73111111-1111-4111-8111-111111111111', 'progress-owner@test.local'),
  ('73222222-2222-4222-8222-222222222222', 'progress-outsider@test.local');

insert into public.exercise_catalog (id, canonical_name, measurement_type) values
  ('73000000-0000-4000-8000-000000000001', 'Phase 8 Bench Press', 'WEIGHT_REPS'),
  ('73000000-0000-4000-8000-000000000002', 'Phase 8 Pull Up', 'BODYWEIGHT_REPS');

-- Three completed weighted sessions: baseline -> PR -> non-PR latest session.
insert into public.workout_sessions (
  id, user_id, category, status, source, started_at, ended_at,
  active_duration_seconds, timezone_at_start, scoring_date
) values
  ('73100000-0000-4000-8000-000000000010','73111111-1111-4111-8111-111111111111','STRENGTH','COMPLETED','IN_APP','2026-08-10T14:00:00Z','2026-08-10T14:30:00Z',1800,'America/Toronto','2026-08-10'),
  ('73100000-0000-4000-8000-000000000011','73111111-1111-4111-8111-111111111111','STRENGTH','COMPLETED','IN_APP','2026-08-12T14:00:00Z','2026-08-12T14:30:00Z',1800,'America/Toronto','2026-08-12'),
  ('73100000-0000-4000-8000-000000000012','73111111-1111-4111-8111-111111111111','STRENGTH','COMPLETED','IN_APP','2026-08-17T14:00:00Z','2026-08-17T14:30:00Z',1800,'America/Toronto','2026-08-17');

insert into public.workout_exercises (id, workout_id, exercise_id, order_index) values
  ('73100000-0000-4000-8000-000000000110','73100000-0000-4000-8000-000000000010','73000000-0000-4000-8000-000000000001',0),
  ('73100000-0000-4000-8000-000000000111','73100000-0000-4000-8000-000000000011','73000000-0000-4000-8000-000000000001',0),
  ('73100000-0000-4000-8000-000000000112','73100000-0000-4000-8000-000000000012','73000000-0000-4000-8000-000000000001',0);

insert into public.workout_sets (workout_exercise_id,set_number,set_type,weight_kg,reps,completed,completed_at) values
  ('73100000-0000-4000-8000-000000000110',1,'WORKING',100,5,true,'2026-08-10T14:10:00Z'),
  ('73100000-0000-4000-8000-000000000110',2,'WORKING',100,5,true,'2026-08-10T14:12:00Z'),
  ('73100000-0000-4000-8000-000000000110',3,'WORKING',100,5,true,'2026-08-10T14:14:00Z'),
  ('73100000-0000-4000-8000-000000000110',4,'WORKING',100,5,true,'2026-08-10T14:16:00Z'),
  ('73100000-0000-4000-8000-000000000111',1,'WORKING',105,5,true,'2026-08-12T14:10:00Z'),
  ('73100000-0000-4000-8000-000000000111',2,'WORKING',105,5,true,'2026-08-12T14:12:00Z'),
  ('73100000-0000-4000-8000-000000000111',3,'WORKING',105,5,true,'2026-08-12T14:14:00Z'),
  ('73100000-0000-4000-8000-000000000111',4,'WORKING',105,5,true,'2026-08-12T14:16:00Z'),
  ('73100000-0000-4000-8000-000000000112',1,'WORKING',100,5,true,'2026-08-17T14:10:00Z'),
  ('73100000-0000-4000-8000-000000000112',2,'WORKING',100,5,true,'2026-08-17T14:12:00Z'),
  ('73100000-0000-4000-8000-000000000112',3,'WORKING',100,5,true,'2026-08-17T14:14:00Z'),
  ('73100000-0000-4000-8000-000000000112',4,'WORKING',100,5,true,'2026-08-17T14:16:00Z');

-- Three bodyweight sessions: plain baseline -> added-weight analytics-only -> plain PR.
insert into public.workout_sessions (
  id, user_id, category, status, source, started_at, ended_at,
  active_duration_seconds, timezone_at_start, scoring_date
) values
  ('73200000-0000-4000-8000-000000000010','73111111-1111-4111-8111-111111111111','STRENGTH','COMPLETED','IN_APP','2026-08-11T14:00:00Z','2026-08-11T14:30:00Z',1800,'America/Toronto','2026-08-11'),
  ('73200000-0000-4000-8000-000000000011','73111111-1111-4111-8111-111111111111','STRENGTH','COMPLETED','IN_APP','2026-08-13T14:00:00Z','2026-08-13T14:30:00Z',1800,'America/Toronto','2026-08-13'),
  ('73200000-0000-4000-8000-000000000012','73111111-1111-4111-8111-111111111111','STRENGTH','COMPLETED','IN_APP','2026-08-18T14:00:00Z','2026-08-18T14:30:00Z',1800,'America/Toronto','2026-08-18');

insert into public.workout_exercises (id, workout_id, exercise_id, order_index) values
  ('73200000-0000-4000-8000-000000000110','73200000-0000-4000-8000-000000000010','73000000-0000-4000-8000-000000000002',0),
  ('73200000-0000-4000-8000-000000000111','73200000-0000-4000-8000-000000000011','73000000-0000-4000-8000-000000000002',0),
  ('73200000-0000-4000-8000-000000000112','73200000-0000-4000-8000-000000000012','73000000-0000-4000-8000-000000000002',0);

insert into public.workout_sets (workout_exercise_id,set_number,set_type,weight_kg,reps,bodyweight_mode,completed,completed_at) values
  ('73200000-0000-4000-8000-000000000110',1,'WORKING',null,10,'BODYWEIGHT',true,'2026-08-11T14:10:00Z'),
  ('73200000-0000-4000-8000-000000000110',2,'WORKING',null,10,'BODYWEIGHT',true,'2026-08-11T14:12:00Z'),
  ('73200000-0000-4000-8000-000000000110',3,'WORKING',null,10,'BODYWEIGHT',true,'2026-08-11T14:14:00Z'),
  ('73200000-0000-4000-8000-000000000110',4,'WORKING',null,10,'BODYWEIGHT',true,'2026-08-11T14:16:00Z'),
  ('73200000-0000-4000-8000-000000000111',1,'WORKING',10,10,'ADDED_WEIGHT',true,'2026-08-13T14:10:00Z'),
  ('73200000-0000-4000-8000-000000000111',2,'WORKING',10,10,'ADDED_WEIGHT',true,'2026-08-13T14:12:00Z'),
  ('73200000-0000-4000-8000-000000000111',3,'WORKING',10,10,'ADDED_WEIGHT',true,'2026-08-13T14:14:00Z'),
  ('73200000-0000-4000-8000-000000000111',4,'WORKING',10,10,'ADDED_WEIGHT',true,'2026-08-13T14:16:00Z'),
  ('73200000-0000-4000-8000-000000000112',1,'WORKING',null,12,'BODYWEIGHT',true,'2026-08-18T14:10:00Z'),
  ('73200000-0000-4000-8000-000000000112',2,'WORKING',null,12,'BODYWEIGHT',true,'2026-08-18T14:12:00Z'),
  ('73200000-0000-4000-8000-000000000112',3,'WORKING',null,12,'BODYWEIGHT',true,'2026-08-18T14:14:00Z'),
  ('73200000-0000-4000-8000-000000000112',4,'WORKING',null,12,'BODYWEIGHT',true,'2026-08-18T14:16:00Z');

set local role authenticated;
set local request.jwt.claim.sub = '73111111-1111-4111-8111-111111111111';

select results_eq(
  $$select count(*) from public.get_my_exercise_progress_overview()$$,
  array[2::bigint],
  'overview returns both trained canonical exercises'
);
select results_eq(
  $$select session_count from public.get_my_exercise_progress_overview() where exercise_id='73000000-0000-4000-8000-000000000001'$$,
  array[3::bigint],
  'weighted overview counts completed exercise sessions'
);
select results_eq(
  $$select observation_count from public.get_my_exercise_progress_overview() where exercise_id='73000000-0000-4000-8000-000000000001'$$,
  array[3::bigint],
  'weighted overview counts comparable observations'
);
select cmp_ok(
  (select round(best_value, 3) from public.get_my_exercise_progress_overview() where exercise_id='73000000-0000-4000-8000-000000000001'),
  '=', 122.500::numeric,
  'weighted overview exposes current e1RM PB'
);
select cmp_ok(
  (select round(previous_pr_value, 3) from public.get_my_exercise_progress_overview() where exercise_id='73000000-0000-4000-8000-000000000001'),
  '=', 116.667::numeric,
  'weighted overview exposes the PR immediately before current PB'
);
select cmp_ok(
  (select round(latest_metric_value, 3) from public.get_my_exercise_progress_overview() where exercise_id='73000000-0000-4000-8000-000000000001'),
  '=', 116.667::numeric,
  'overview distinguishes latest performance from current PB'
);
select cmp_ok(
  (select average_days_between_sessions from public.get_my_exercise_progress_overview() where exercise_id='73000000-0000-4000-8000-000000000001'),
  '=', 3.50::numeric,
  'overview exposes average session spacing as frequency context'
);
select results_eq(
  $$select session_count from public.get_my_exercise_progress_overview() where exercise_id='73000000-0000-4000-8000-000000000002'$$,
  array[3::bigint],
  'bodyweight overview counts analytics-only variant sessions too'
);
select results_eq(
  $$select observation_count from public.get_my_exercise_progress_overview() where exercise_id='73000000-0000-4000-8000-000000000002'$$,
  array[2::bigint],
  'added-weight bodyweight session is excluded from plain-bodyweight observations'
);
select cmp_ok(
  (select best_value from public.get_my_exercise_progress_overview() where exercise_id='73000000-0000-4000-8000-000000000002'),
  '=', 12::numeric,
  'bodyweight overview exposes current best reps'
);
select cmp_ok(
  (select previous_pr_value from public.get_my_exercise_progress_overview() where exercise_id='73000000-0000-4000-8000-000000000002'),
  '=', 10::numeric,
  'bodyweight overview exposes prior best reps'
);
select results_eq(
  $$select count(*) from public.get_my_exercise_progress_history('73000000-0000-4000-8000-000000000001')$$,
  array[3::bigint],
  'weighted history returns one row per completed exercise session'
);
select is(
  (select is_baseline from public.get_my_exercise_progress_history('73000000-0000-4000-8000-000000000001') where scoring_date='2026-08-10'),
  true,
  'first comparable weighted observation is marked baseline'
);
select is(
  (select is_pr from public.get_my_exercise_progress_history('73000000-0000-4000-8000-000000000001') where scoring_date='2026-08-12'),
  true,
  'later weighted improvement is marked as a PR'
);
select is(
  (select is_current_pr from public.get_my_exercise_progress_history('73000000-0000-4000-8000-000000000001') where scoring_date='2026-08-12'),
  true,
  'history identifies the session that owns the current PB'
);
select is(
  (select is_pr from public.get_my_exercise_progress_history('73000000-0000-4000-8000-000000000001') where scoring_date='2026-08-17'),
  false,
  'later non-improving weighted session is not marked PR'
);
select cmp_ok(
  (select session_volume_kg_reps from public.get_my_exercise_progress_history('73000000-0000-4000-8000-000000000001') where scoring_date='2026-08-12'),
  '=', 2100::numeric,
  'history exposes completed working-set volume for analytics only'
);
select is(
  (select metric_value from public.get_my_exercise_progress_history('73000000-0000-4000-8000-000000000002') where scoring_date='2026-08-13'),
  null::numeric,
  'added-weight bodyweight session has no plain-bodyweight progression metric'
);
select results_eq(
  $$select added_weight_sets from public.get_my_exercise_progress_history('73000000-0000-4000-8000-000000000002') where scoring_date='2026-08-13'$$,
  array[4::integer],
  'history preserves added-weight sets as analytics-only session data'
);
select is(
  (select is_current_pr from public.get_my_exercise_progress_history('73000000-0000-4000-8000-000000000002') where scoring_date='2026-08-18'),
  true,
  'plain-bodyweight PR remains current despite intervening added-weight work'
);

set local request.jwt.claim.sub = '73222222-2222-4222-8222-222222222222';
select results_eq(
  $$select count(*) from public.get_my_exercise_progress_overview()$$,
  array[0::bigint],
  'overview never exposes another user progression data'
);
select results_eq(
  $$select count(*) from public.get_my_exercise_progress_history('73000000-0000-4000-8000-000000000001')$$,
  array[0::bigint],
  'history never exposes another user exercise sessions'
);
select throws_ok(
  $$select * from public.get_my_exercise_progress_history(null::uuid)$$,
  '22023',
  'Exercise id is required',
  'history rejects a missing exercise id'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select * from public.get_my_exercise_progress_overview()$$,
  '42501',
  'Authentication required',
  'overview requires authentication'
);
select throws_ok(
  $$select * from public.get_my_exercise_progress_history('73000000-0000-4000-8000-000000000001')$$,
  '42501',
  'Authentication required',
  'history requires authentication'
);

select * from finish();
rollback;
