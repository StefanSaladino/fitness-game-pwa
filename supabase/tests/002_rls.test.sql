begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'owner@test.local', '{"display_name":"Owner"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'member@test.local', '{"display_name":"Member"}'::jsonb),
  ('33333333-3333-4333-8333-333333333333', 'outsider@test.local', '{"display_name":"Outsider"}'::jsonb);

insert into public.groups (id, name, created_by)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Test Group', '11111111-1111-4111-8111-111111111111');
insert into public.group_members (group_id, user_id, role, status)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'MEMBER', 'ACTIVE');

insert into public.workout_sessions
  (id, user_id, category, status, source, started_at, active_duration_seconds, timezone_at_start, scoring_date)
values
  ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'RUNNING', 'COMPLETED', 'MANUAL', now(), 900, 'America/Toronto', current_date),
  ('55555555-5555-4555-8555-555555555555', '22222222-2222-4222-8222-222222222222', 'RUNNING', 'COMPLETED', 'MANUAL', now(), 900, 'America/Toronto', current_date);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq('select count(*) from public.profiles', array[2::bigint], 'owner can see self and active group member profiles');
select results_eq('select count(*) from public.groups', array[1::bigint], 'owner can see own group');
select results_eq('select count(*) from public.group_members', array[2::bigint], 'owner can see active group membership');
select results_eq('select count(*) from public.workout_sessions', array[1::bigint], 'owner only sees own workouts');
select throws_ok(
  $$insert into public.xp_events(user_id, scoring_date, event_type, amount) values ('11111111-1111-4111-8111-111111111111', current_date, 'DAILY_WORKOUT', 100)$$,
  '42501', null, 'authenticated client cannot insert XP events'
);
select throws_ok(
  $$insert into public.performance_benchmarks(user_id, benchmark_key, state, valid_observation_count) values ('11111111-1111-4111-8111-111111111111', 'strength:bench', 'UNSEEN', 0)$$,
  '42501', null, 'authenticated client cannot write benchmark state'
);

set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select results_eq('select count(*) from public.groups', array[0::bigint], 'outsider cannot see private group');
select results_eq('select count(*) from public.group_members', array[0::bigint], 'outsider cannot see group members');
select results_eq('select count(*) from public.workout_sessions', array[0::bigint], 'outsider cannot see other workouts');
select results_eq('select count(*) from public.profiles', array[1::bigint], 'outsider sees only own profile');

select * from finish();
rollback;
