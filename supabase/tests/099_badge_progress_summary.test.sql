begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select has_function(
  'public',
  'get_my_lifting_badge_progress',
  array[]::text[],
  'guarded badge progress RPC exists'
);

insert into auth.users (id, email)
values ('99111111-1111-4111-8111-111111111111', 'badge-progress@test.local');

update public.profiles
set username = 'badge_progress_user',
    display_name = 'Badge Progress User',
    timezone = 'America/Toronto',
    weekly_workout_target = 1,
    pending_weekly_workout_target = null,
    pending_weekly_workout_target_week_start = null,
    onboarding_completed_at = now()
where id = '99111111-1111-4111-8111-111111111111';

insert into public.weekly_goals (user_id, week_start, target)
values (
  '99111111-1111-4111-8111-111111111111',
  (date_trunc('week', now() at time zone 'America/Toronto'))::date - 21,
  1
);

-- Three completed successful weeks -> goals_hit=3, best streak=3, lifting days=3.
insert into public.scoring_events (user_id, scoring_date, event_type, amount, scoring_version)
values
  ('99111111-1111-4111-8111-111111111111', (date_trunc('week', now() at time zone 'America/Toronto'))::date - 21, 'LIFTING_WORKOUT', 50, 'lifting-v1'),
  ('99111111-1111-4111-8111-111111111111', (date_trunc('week', now() at time zone 'America/Toronto'))::date - 14, 'LIFTING_WORKOUT', 50, 'lifting-v1'),
  ('99111111-1111-4111-8111-111111111111', (date_trunc('week', now() at time zone 'America/Toronto'))::date - 7, 'LIFTING_WORKOUT', 50, 'lifting-v1');

-- Four cardio-bonus days remain one short of the first cardio threshold.
insert into public.scoring_events (user_id, scoring_date, event_type, amount, scoring_version)
select
  '99111111-1111-4111-8111-111111111111',
  (date_trunc('week', now() at time zone 'America/Toronto'))::date - 40 + day_offset,
  'CARDIO_BONUS',
  5,
  'lifting-v1'
from generate_series(0, 3) as g(day_offset);

insert into public.exercise_catalog (id, canonical_name, measurement_type)
values ('99000000-0000-4000-8000-000000000001', 'Badge Progress Test Press', 'WEIGHT_REPS');

-- Five observations = baseline + four PR improvements.
insert into public.workout_sessions (
  id, user_id, category, status, source, started_at, ended_at,
  active_duration_seconds, timezone_at_start, scoring_date
)
select
  ('99000000-0000-4000-8000-' || lpad(index::text, 12, '0'))::uuid,
  '99111111-1111-4111-8111-111111111111',
  'STRENGTH',
  'COMPLETED',
  'MANUAL',
  now() - ((10 - index) || ' days')::interval,
  now() - ((10 - index) || ' days')::interval + interval '30 minutes',
  1800,
  'America/Toronto',
  ((now() at time zone 'America/Toronto')::date - (10 - index))
from generate_series(1, 5) as g(index);

insert into public.exercise_progress_observations (
  user_id, workout_id, exercise_id, metric_type, metric_value,
  weight_kg, reps, scoring_date, valid, created_at
)
select
  '99111111-1111-4111-8111-111111111111',
  ('99000000-0000-4000-8000-' || lpad(index::text, 12, '0'))::uuid,
  '99000000-0000-4000-8000-000000000001',
  'E1RM',
  99 + index,
  80 + index,
  5,
  ((now() at time zone 'America/Toronto')::date - (10 - index)),
  true,
  now() - ((10 - index) || ' days')::interval
from generate_series(1, 5) as g(index);

set local role authenticated;
select set_config('request.jwt.claim.sub', '99111111-1111-4111-8111-111111111111', true);

select is((select pr_count from public.get_my_lifting_badge_progress()), 4, 'RPC exposes four persisted PR improvements');
select is((select lifting_day_count from public.get_my_lifting_badge_progress()), 3, 'RPC exposes authoritative lift-day progress');
select is((select goals_hit from public.get_my_lifting_badge_progress()), 3, 'RPC exposes completed weekly-target progress');
select is((select best_completed_week_streak from public.get_my_lifting_badge_progress()), 3, 'RPC exposes best historical streak progress');
select is((select cardio_bonus_day_count from public.get_my_lifting_badge_progress()), 4, 'RPC exposes cardio-bonus-day progress');
select is((select pr_count from public.get_my_lifting_badge_progress()), 4, 'reloading the progress RPC preserves the same authoritative PR count');

reset role;

-- Cross the PR_5 threshold and verify both progress and badge award move together.
insert into public.workout_sessions (
  id, user_id, category, status, source, started_at, ended_at,
  active_duration_seconds, timezone_at_start, scoring_date
) values (
  '99000000-0000-4000-8000-000000000006',
  '99111111-1111-4111-8111-111111111111',
  'STRENGTH',
  'COMPLETED',
  'MANUAL',
  now(),
  now() + interval '30 minutes',
  1800,
  'America/Toronto',
  (now() at time zone 'America/Toronto')::date
);

insert into public.exercise_progress_observations (
  user_id, workout_id, exercise_id, metric_type, metric_value,
  weight_kg, reps, scoring_date, valid, created_at
) values (
  '99111111-1111-4111-8111-111111111111',
  '99000000-0000-4000-8000-000000000006',
  '99000000-0000-4000-8000-000000000001',
  'E1RM',
  106,
  86,
  5,
  (now() at time zone 'America/Toronto')::date,
  true,
  now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '99111111-1111-4111-8111-111111111111', true);
select is((select pr_count from public.get_my_lifting_badge_progress()), 5, 'progress reaches five PRs after the fifth improvement');
select ok(exists(select 1 from public.user_badges where user_id='99111111-1111-4111-8111-111111111111' and badge_key='PR_5'), 'PR_5 award agrees with the progress threshold');

reset role;

-- Historical correction drops progress and revokes the badge through the same reconciler.
delete from public.exercise_progress_observations
where workout_id = '99000000-0000-4000-8000-000000000006';

set local role authenticated;
select set_config('request.jwt.claim.sub', '99111111-1111-4111-8111-111111111111', true);
select is((select pr_count from public.get_my_lifting_badge_progress()), 4, 'historical correction rebuilds partial PR progress downward');
select ok(not exists(select 1 from public.user_badges where user_id='99111111-1111-4111-8111-111111111111' and badge_key='PR_5'), 'historical correction revokes PR_5 when progress falls below five');

reset role;
select * from finish();
rollback;
