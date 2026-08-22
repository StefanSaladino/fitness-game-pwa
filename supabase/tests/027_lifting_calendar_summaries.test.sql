begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select has_function(
  'public',
  'get_my_lifting_calendar_summaries',
  array['integer','integer'],
  'lifting calendar summary RPC exists'
);
select is(
  has_function_privilege('authenticated', 'public.get_my_lifting_calendar_summaries(integer,integer)', 'execute'),
  true,
  'authenticated role can execute lifting calendar summary RPC'
);
select is(
  has_function_privilege('anon', 'public.get_my_lifting_calendar_summaries(integer,integer)', 'execute'),
  false,
  'anonymous role cannot execute lifting calendar summary RPC'
);

insert into auth.users (id, email) values
  ('82111111-1111-4111-8111-111111111111', 'calendar-owner@test.local'),
  ('82222222-2222-4222-8222-222222222222', 'calendar-outsider@test.local');

update public.profiles
set timezone = 'America/Toronto'
where id in (
  '82111111-1111-4111-8111-111111111111',
  '82222222-2222-4222-8222-222222222222'
);

insert into public.exercise_catalog (id, canonical_name, measurement_type) values
  ('82000000-0000-4000-8000-000000000001', 'Phase 13B Bench Press', 'WEIGHT_REPS'),
  ('82000000-0000-4000-8000-000000000002', 'Phase 13B Row', 'WEIGHT_REPS');

-- Keep fixture dates relative to the authenticated user's current local calendar so the
-- summary remains deterministic whenever the pgTAP suite is executed.
with calendar as (
  select
    (now() at time zone 'America/Toronto')::date as today,
    date_trunc('week', (now() at time zone 'America/Toronto'))::date as week_start,
    date_trunc('month', (now() at time zone 'America/Toronto'))::date as month_start
)
insert into public.workout_sessions (
  id, user_id, category, status, source, started_at, ended_at,
  active_duration_seconds, timezone_at_start, scoring_date
)
select '82100000-0000-4000-8000-000000000010'::uuid, '82111111-1111-4111-8111-111111111111'::uuid, 'STRENGTH'::public.workout_category, 'COMPLETED'::public.workout_status, 'IN_APP'::public.workout_source, now() - interval '4 hours', now() - interval '3 hours', 3600, 'America/Toronto', greatest(week_start, month_start)
from calendar
union all
select '82100000-0000-4000-8000-000000000011'::uuid, '82111111-1111-4111-8111-111111111111'::uuid, 'STRENGTH'::public.workout_category, 'COMPLETED'::public.workout_status, 'IN_APP'::public.workout_source, now() - interval '2 hours', now() - interval '1 hour', 3600, 'America/Toronto', greatest(week_start, month_start)
from calendar
union all
select '82200000-0000-4000-8000-000000000010'::uuid, '82222222-2222-4222-8222-222222222222'::uuid, 'STRENGTH'::public.workout_category, 'COMPLETED'::public.workout_status, 'IN_APP'::public.workout_source, now() - interval '2 hours', now() - interval '1 hour', 3600, 'America/Toronto', greatest(week_start, month_start)
from calendar;

insert into public.workout_exercises (id, workout_id, exercise_id, order_index) values
  ('82100000-0000-4000-8000-000000000110','82100000-0000-4000-8000-000000000010','82000000-0000-4000-8000-000000000001',0),
  ('82100000-0000-4000-8000-000000000111','82100000-0000-4000-8000-000000000010','82000000-0000-4000-8000-000000000002',1),
  ('82100000-0000-4000-8000-000000000112','82100000-0000-4000-8000-000000000011','82000000-0000-4000-8000-000000000001',0),
  ('82200000-0000-4000-8000-000000000110','82200000-0000-4000-8000-000000000010','82000000-0000-4000-8000-000000000001',0);

insert into public.workout_sets (workout_exercise_id,set_number,set_type,weight_kg,reps,completed,completed_at) values
  ('82100000-0000-4000-8000-000000000110',1,'WORKING',100,5,true,now() - interval '210 minutes'),
  ('82100000-0000-4000-8000-000000000110',2,'WORKING',100,5,true,now() - interval '208 minutes'),
  ('82100000-0000-4000-8000-000000000111',1,'WORKING',80,8,true,now() - interval '206 minutes'),
  ('82100000-0000-4000-8000-000000000112',1,'WORKING',105,5,true,now() - interval '90 minutes'),
  ('82100000-0000-4000-8000-000000000112',2,'WARMUP',60,8,true,now() - interval '95 minutes'),
  ('82200000-0000-4000-8000-000000000110',1,'WORKING',200,5,true,now() - interval '90 minutes');

-- Source-row triggers reconcile authoritative progression automatically.
-- The first Bench session establishes the baseline; the later 105 kg session becomes the PR.

set local role authenticated;
set local request.jwt.claim.sub = '82111111-1111-4111-8111-111111111111';

select results_eq(
  $$select count(*) from public.get_my_lifting_calendar_summaries(3,2) where period_kind='WEEK'$$,
  array[3::bigint],
  'requested weekly bucket count is returned including zero-activity weeks'
);
select results_eq(
  $$select count(*) from public.get_my_lifting_calendar_summaries(3,2) where period_kind='MONTH'$$,
  array[2::bigint],
  'requested monthly bucket count is returned including zero-activity months'
);
select results_eq(
  $$select completed_lifting_sessions from public.get_my_lifting_calendar_summaries(3,2) where period_kind='WEEK' order by period_start desc limit 1$$,
  array[2::bigint],
  'current week counts distinct completed lifting sessions'
);
select results_eq(
  $$select exercise_count from public.get_my_lifting_calendar_summaries(3,2) where period_kind='WEEK' order by period_start desc limit 1$$,
  array[2::bigint],
  'current week counts distinct trained exercises'
);
select results_eq(
  $$select completed_working_sets from public.get_my_lifting_calendar_summaries(3,2) where period_kind='WEEK' order by period_start desc limit 1$$,
  array[4::bigint],
  'current week counts only completed working sets'
);
select cmp_ok(
  (select volume_kg_reps from public.get_my_lifting_calendar_summaries(3,2) where period_kind='WEEK' order by period_start desc limit 1),
  '=', 2165::numeric,
  'current week sums external-load volume for analytics only'
);
select results_eq(
  $$select pr_count from public.get_my_lifting_calendar_summaries(3,2) where period_kind='WEEK' order by period_start desc limit 1$$,
  array[1::bigint],
  'current week counts improvements but excludes the baseline observation'
);
select results_eq(
  $$select completed_lifting_sessions from public.get_my_lifting_calendar_summaries(3,2) where period_kind='MONTH' order by period_start desc limit 1$$,
  array[2::bigint],
  'current month exposes the same completed lifting sessions'
);
select results_eq(
  $$select completed_working_sets from public.get_my_lifting_calendar_summaries(3,2) where period_kind='MONTH' order by period_start desc limit 1$$,
  array[4::bigint],
  'current month exposes completed working-set count'
);
select results_eq(
  $$select pr_count from public.get_my_lifting_calendar_summaries(3,2) where period_kind='MONTH' order by period_start desc limit 1$$,
  array[1::bigint],
  'current month exposes PR count'
);

set local request.jwt.claim.sub = '82222222-2222-4222-8222-222222222222';
select results_eq(
  $$select completed_lifting_sessions from public.get_my_lifting_calendar_summaries(1,1) where period_kind='WEEK'$$,
  array[1::bigint],
  'summary is scoped to the authenticated user'
);
select results_eq(
  $$select exercise_count from public.get_my_lifting_calendar_summaries(1,1) where period_kind='WEEK'$$,
  array[1::bigint],
  'summary never includes another user exercises'
);

set local request.jwt.claim.sub = '82111111-1111-4111-8111-111111111111';
select throws_ok(
  $$select * from public.get_my_lifting_calendar_summaries(0,2)$$,
  '22023',
  'Week count must be between 1 and 52',
  'summary rejects an invalid week count'
);
select throws_ok(
  $$select * from public.get_my_lifting_calendar_summaries(3,25)$$,
  '22023',
  'Month count must be between 1 and 24',
  'summary rejects an invalid month count'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select * from public.get_my_lifting_calendar_summaries(3,2)$$,
  '42501',
  'Authentication required',
  'summary requires authentication'
);

select * from finish();
rollback;
