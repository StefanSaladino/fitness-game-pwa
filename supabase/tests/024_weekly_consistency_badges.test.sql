begin;
create extension if not exists pgtap with schema extensions;
select plan(46);

select has_table('public', 'weekly_lifting_snapshots', 'completed-week lifting snapshots exist');
select has_table('public', 'lifting_consistency_state', 'completed-week streak state exists');
select has_table('public', 'user_badges', 'non-XP user badges exist');
select has_column('public', 'profiles', 'pending_weekly_workout_target_week_start', 'scheduled target stores its effective Monday');
select has_function('public', 'reconcile_weekly_lifting_consistency_for_user', array['uuid','date'], 'private consistency reconciler exists');
select has_function('public', 'get_my_lifting_consistency_summary', array[]::text[], 'guarded consistency summary RPC exists');
select has_function('public', 'schedule_weekly_target', array['smallint'], 'weekly target scheduler remains available');

insert into auth.users (id, email)
values ('91111111-1111-4111-8111-111111111111', 'phase9@test.local');

update public.profiles
set username = 'phase9_user',
    display_name = 'Phase 9 User',
    timezone = 'America/Toronto',
    weekly_workout_target = 3,
    pending_weekly_workout_target = null,
    pending_weekly_workout_target_week_start = null,
    onboarding_completed_at = now()
where id = '91111111-1111-4111-8111-111111111111';

insert into public.weekly_goals (user_id, week_start, target)
values (
  '91111111-1111-4111-8111-111111111111',
  (date_trunc('week', now() at time zone 'America/Toronto'))::date - 21,
  3
);

-- Three completed target-hit weeks: 3 lifting days in each week.
insert into public.scoring_events (user_id, scoring_date, event_type, amount, scoring_version)
select
  '91111111-1111-4111-8111-111111111111',
  dates.scoring_date,
  'LIFTING_WORKOUT',
  50,
  'lifting-v1'
from (
  values
    ((date_trunc('week', now() at time zone 'America/Toronto'))::date - 21),
    ((date_trunc('week', now() at time zone 'America/Toronto'))::date - 19),
    ((date_trunc('week', now() at time zone 'America/Toronto'))::date - 17),
    ((date_trunc('week', now() at time zone 'America/Toronto'))::date - 14),
    ((date_trunc('week', now() at time zone 'America/Toronto'))::date - 13),
    ((date_trunc('week', now() at time zone 'America/Toronto'))::date - 11),
    ((date_trunc('week', now() at time zone 'America/Toronto'))::date - 6),
    ((date_trunc('week', now() at time zone 'America/Toronto'))::date - 4),
    ((date_trunc('week', now() at time zone 'America/Toronto'))::date - 2)
) as dates(scoring_date);

-- Five accessory cardio-bonus days qualify the first cardio badge without
-- contributing to weekly lifting-day targets.
insert into public.scoring_events (user_id, scoring_date, event_type, amount, scoring_version)
select
  '91111111-1111-4111-8111-111111111111',
  (date_trunc('week', now() at time zone 'America/Toronto'))::date - 40 + day_offset,
  'CARDIO_BONUS',
  5,
  'lifting-v1'
from generate_series(0, 4) as g(day_offset);

insert into public.exercise_catalog (id, canonical_name, measurement_type)
values ('90000000-0000-4000-8000-000000000001', 'Phase 9 Test Press', 'WEIGHT_REPS');

-- Six baseline/PR observations -> five PR improvements.
insert into public.workout_sessions (
  id, user_id, category, status, source, started_at, ended_at,
  active_duration_seconds, timezone_at_start, scoring_date
)
select
  ('90000000-0000-4000-8000-' || lpad(index::text, 12, '0'))::uuid,
  '91111111-1111-4111-8111-111111111111',
  'STRENGTH',
  'COMPLETED',
  'MANUAL',
  now() - ((10 - index) || ' days')::interval,
  now() - ((10 - index) || ' days')::interval + interval '30 minutes',
  1800,
  'America/Toronto',
  ((now() at time zone 'America/Toronto')::date - (10 - index))
from generate_series(1, 6) as g(index);

insert into public.exercise_progress_observations (
  user_id, workout_id, exercise_id, metric_type, metric_value,
  weight_kg, reps, scoring_date, valid, created_at
)
select
  '91111111-1111-4111-8111-111111111111',
  ('90000000-0000-4000-8000-' || lpad(index::text, 12, '0'))::uuid,
  '90000000-0000-4000-8000-000000000001',
  'E1RM',
  99 + index,
  80 + index,
  5,
  ((now() at time zone 'America/Toronto')::date - (10 - index)),
  true,
  now() - ((10 - index) || ' days')::interval
from generate_series(1, 6) as g(index);

select public.reconcile_weekly_lifting_consistency_for_user(
  '91111111-1111-4111-8111-111111111111',
  (now() at time zone 'America/Toronto')::date
);

select is(
  (select count(*)::integer from public.weekly_lifting_snapshots where user_id = '91111111-1111-4111-8111-111111111111'),
  3,
  'three completed weeks are snapshotted'
);
select is(
  (select count(*)::integer from public.weekly_lifting_snapshots where user_id = '91111111-1111-4111-8111-111111111111' and achieved),
  3,
  'all three seeded completed weeks hit the lifting target'
);
select is((select current_completed_week_streak from public.lifting_consistency_state where user_id = '91111111-1111-4111-8111-111111111111'), 3, 'current completed-week streak is three');
select is((select best_completed_week_streak from public.lifting_consistency_state where user_id = '91111111-1111-4111-8111-111111111111'), 3, 'best completed-week streak is three');
select is((select completed_weeks from public.lifting_consistency_state where user_id = '91111111-1111-4111-8111-111111111111'), 3, 'completed-week count excludes the current in-progress week');
select is((select goals_hit from public.lifting_consistency_state where user_id = '91111111-1111-4111-8111-111111111111'), 3, 'goal-hit count matches completed successful weeks');

select ok(exists(select 1 from public.user_badges where user_id='91111111-1111-4111-8111-111111111111' and badge_key='FIRST_PR'), 'first PR badge is earned');
select ok(exists(select 1 from public.user_badges where user_id='91111111-1111-4111-8111-111111111111' and badge_key='PR_5'), 'five-PR badge is earned');
select ok(not exists(select 1 from public.user_badges where user_id='91111111-1111-4111-8111-111111111111' and badge_key='PR_10'), 'ten-PR badge is not awarded early');
select ok(exists(select 1 from public.user_badges where user_id='91111111-1111-4111-8111-111111111111' and badge_key='LIFT_DAYS_5'), 'five-lift-day badge is earned');
select ok(not exists(select 1 from public.user_badges where user_id='91111111-1111-4111-8111-111111111111' and badge_key='LIFT_DAYS_10'), 'ten-lift-day badge is not awarded at nine days');
select ok(exists(select 1 from public.user_badges where user_id='91111111-1111-4111-8111-111111111111' and badge_key='GOAL_WEEK_1'), 'first weekly target badge is earned');
select ok(exists(select 1 from public.user_badges where user_id='91111111-1111-4111-8111-111111111111' and badge_key='GOAL_STREAK_2'), 'two-week consistency badge is earned');
select ok(not exists(select 1 from public.user_badges where user_id='91111111-1111-4111-8111-111111111111' and badge_key='GOAL_STREAK_4'), 'four-week streak badge is not awarded early');
select ok(exists(select 1 from public.user_badges where user_id='91111111-1111-4111-8111-111111111111' and badge_key='CARDIO_BONUS_DAYS_5'), 'five cardio-bonus-day accessory badge is earned');
select ok(not exists(select 1 from public.user_badges where user_id='91111111-1111-4111-8111-111111111111' and badge_key='CARDIO_BONUS_DAYS_10'), 'ten cardio-bonus-day badge is not awarded early');
select is((select count(*)::integer from public.scoring_events where user_id='91111111-1111-4111-8111-111111111111'), 14, 'consistency reconciliation writes no XP/scoring events');

set local role authenticated;
select set_config('request.jwt.claim.sub', '91111111-1111-4111-8111-111111111111', true);

select is(
  (select current_completed_week_streak from public.get_my_lifting_consistency_summary()),
  3,
  'guarded summary exposes the completed-week streak'
);
select is(
  (select jsonb_array_length(recent_weeks) from public.get_my_lifting_consistency_summary()),
  3,
  'guarded summary exposes recent completed-week snapshots'
);
select is(
  (select jsonb_array_length(badges) from public.get_my_lifting_consistency_summary()),
  6,
  'guarded summary exposes only currently earned badges'
);

select lives_ok(
  $$select public.schedule_weekly_target(4::smallint)$$,
  'authenticated user can schedule next-week lifting target'
);
select is((select pending_weekly_workout_target from public.profiles where id='91111111-1111-4111-8111-111111111111'), 4::smallint, 'scheduled target is stored as pending');
select is(
  (select pending_weekly_workout_target_week_start from public.profiles where id='91111111-1111-4111-8111-111111111111'),
  (date_trunc('week', now() at time zone 'America/Toronto'))::date + 7,
  'scheduled target receives the next Monday as its effective date'
);
select is((select weekly_workout_target from public.profiles where id='91111111-1111-4111-8111-111111111111'), 3::smallint, 'current-week target does not change immediately');

select throws_ok(
  $$insert into public.user_badges (user_id,badge_key) values ('91111111-1111-4111-8111-111111111111','PR_10')$$,
  '42501',
  null,
  'authenticated client cannot directly award a badge'
);
select throws_ok(
  $$insert into public.weekly_lifting_snapshots (user_id,week_start,target,lifting_days,achieved) values ('91111111-1111-4111-8111-111111111111', date '2026-01-05', 1, 1, true)$$,
  '42501',
  null,
  'authenticated client cannot directly write weekly snapshots'
);
select throws_ok(
  $$select public.reconcile_weekly_lifting_consistency_for_user('91111111-1111-4111-8111-111111111111', current_date)$$,
  '42501',
  null,
  'authenticated client cannot execute the private reconciler'
);

reset role;

-- Simulate crossing into next week. The pending target activates on its effective
-- Monday, while the just-finished current week is snapshotted as a miss.
select public.reconcile_weekly_lifting_consistency_for_user(
  '91111111-1111-4111-8111-111111111111',
  (date_trunc('week', now() at time zone 'America/Toronto'))::date + 7
);

select is((select weekly_workout_target from public.profiles where id='91111111-1111-4111-8111-111111111111'), 4::smallint, 'pending target activates at the next week boundary');
select ok((select pending_weekly_workout_target is null and pending_weekly_workout_target_week_start is null from public.profiles where id='91111111-1111-4111-8111-111111111111'), 'pending target state clears after activation');
select is(
  (select target from public.weekly_goals where user_id='91111111-1111-4111-8111-111111111111' and week_start=(date_trunc('week', now() at time zone 'America/Toronto'))::date + 7),
  4::smallint,
  'new week receives the scheduled lifting target'
);
select is(
  (select lifting_days from public.weekly_lifting_snapshots where user_id='91111111-1111-4111-8111-111111111111' and week_start=(date_trunc('week', now() at time zone 'America/Toronto'))::date),
  0::smallint,
  'completed zero-lift week snapshots zero lifting days'
);
select is(
  (select achieved from public.weekly_lifting_snapshots where user_id='91111111-1111-4111-8111-111111111111' and week_start=(date_trunc('week', now() at time zone 'America/Toronto'))::date),
  false,
  'completed zero-lift week is a missed target'
);
select is((select current_completed_week_streak from public.lifting_consistency_state where user_id='91111111-1111-4111-8111-111111111111'), 0, 'a missed immediately previous week resets current streak');
select is((select best_completed_week_streak from public.lifting_consistency_state where user_id='91111111-1111-4111-8111-111111111111'), 3, 'missed week does not erase historical best streak');

-- Historical authoritative-ledger correction recomputes snapshots and badges.
delete from public.scoring_events
where user_id='91111111-1111-4111-8111-111111111111'
  and event_type='LIFTING_WORKOUT'
  and scoring_date=(date_trunc('week', now() at time zone 'America/Toronto'))::date - 13;

select public.reconcile_weekly_lifting_consistency_for_user(
  '91111111-1111-4111-8111-111111111111',
  (now() at time zone 'America/Toronto')::date
);

select is(
  (select achieved from public.weekly_lifting_snapshots where user_id='91111111-1111-4111-8111-111111111111' and week_start=(date_trunc('week', now() at time zone 'America/Toronto'))::date - 14),
  false,
  'historical lifting-day removal reconciles the completed-week snapshot'
);
select is((select current_completed_week_streak from public.lifting_consistency_state where user_id='91111111-1111-4111-8111-111111111111'), 1, 'historical missed week leaves only the latest successful week in the current streak');
select is((select best_completed_week_streak from public.lifting_consistency_state where user_id='91111111-1111-4111-8111-111111111111'), 1, 'historical correction also rebuilds best streak');
select ok(not exists(select 1 from public.user_badges where user_id='91111111-1111-4111-8111-111111111111' and badge_key='GOAL_STREAK_2'), 'streak badge is removed when corrected history no longer qualifies');

-- Removing one PR improvement drops the PR count below five and revokes PR_5.
delete from public.exercise_progress_observations
where workout_id='90000000-0000-4000-8000-000000000006';
select public.reconcile_weekly_lifting_consistency_for_user(
  '91111111-1111-4111-8111-111111111111',
  (now() at time zone 'America/Toronto')::date
);
select ok(not exists(select 1 from public.user_badges where user_id='91111111-1111-4111-8111-111111111111' and badge_key='PR_5'), 'PR badge is removed when corrected history falls below its milestone');

select * from finish();
rollback;
