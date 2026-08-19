begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select has_function(
  'public',
  'get_group_lifting_leaderboard',
  array['uuid','date'],
  'dashboard leaderboard RPC exists'
);

insert into auth.users (id, email) values
  ('91111111-1111-4111-8111-111111111111', 'dashboard-owner@test.local'),
  ('92222222-2222-4222-8222-222222222222', 'dashboard-member@test.local'),
  ('93333333-3333-4333-8333-333333333333', 'dashboard-outsider@test.local');

update public.profiles set username='dashboard_owner', display_name='Dashboard Owner'
where id='91111111-1111-4111-8111-111111111111';
update public.profiles set username='dashboard_member', display_name='Dashboard Member'
where id='92222222-2222-4222-8222-222222222222';

insert into public.groups (id, name, created_by)
values ('90000000-0000-4000-8000-000000000001', 'Dashboard Crew', '91111111-1111-4111-8111-111111111111');

insert into public.group_members (group_id, user_id, role, status)
values ('90000000-0000-4000-8000-000000000001', '92222222-2222-4222-8222-222222222222', 'MEMBER', 'ACTIVE');

insert into public.scoring_events (user_id, scoring_date, event_type, amount, scoring_version) values
  ('91111111-1111-4111-8111-111111111111', date '2026-08-17', 'LIFTING_WORKOUT', 50, 'lifting-v1'),
  ('91111111-1111-4111-8111-111111111111', date '2026-08-17', 'CARDIO_BONUS', 10, 'lifting-v1'),
  ('92222222-2222-4222-8222-222222222222', date '2026-08-18', 'LIFTING_WORKOUT', 50, 'lifting-v1'),
  ('92222222-2222-4222-8222-222222222222', date '2026-08-18', 'CARDIO_BONUS', 5, 'lifting-v1');

set local role authenticated;
set local request.jwt.claim.sub = '91111111-1111-4111-8111-111111111111';

select lives_ok(
  $$select * from public.get_group_lifting_leaderboard('90000000-0000-4000-8000-000000000001', date '2026-08-17')$$,
  'active member can read group leaderboard'
);

select results_eq(
  $$select count(*) from public.get_group_lifting_leaderboard('90000000-0000-4000-8000-000000000001', date '2026-08-17')$$,
  array[2::bigint],
  'leaderboard returns all active group members'
);

select results_eq(
  $$select member_user_id from public.get_group_lifting_leaderboard('90000000-0000-4000-8000-000000000001', date '2026-08-17') limit 1$$,
  array['91111111-1111-4111-8111-111111111111'::uuid],
  'higher weekly lifting-v1 XP ranks first'
);

select results_eq(
  $$select xp from public.get_group_lifting_leaderboard('90000000-0000-4000-8000-000000000001', date '2026-08-17') where member_user_id='91111111-1111-4111-8111-111111111111'$$,
  array[60::bigint],
  'leaderboard sums lifting-v1 scoring events for the supplied week'
);

select results_eq(
  $$select xp from public.get_group_lifting_leaderboard('90000000-0000-4000-8000-000000000001', date '2026-08-17') where member_user_id='92222222-2222-4222-8222-222222222222'$$,
  array[55::bigint],
  'leaderboard preserves each member weekly XP total'
);

set local request.jwt.claim.sub = '93333333-3333-4333-8333-333333333333';
select throws_ok(
  $$select * from public.get_group_lifting_leaderboard('90000000-0000-4000-8000-000000000001', date '2026-08-17')$$,
  '42501',
  'Not a group member',
  'outsider cannot read a group leaderboard'
);

reset role;
select is(
  has_function_privilege('authenticated', 'public.get_group_lifting_leaderboard(uuid,date)', 'execute'),
  true,
  'authenticated role can execute the leaderboard RPC'
);

select is(
  has_function_privilege('anon', 'public.get_group_lifting_leaderboard(uuid,date)', 'execute'),
  false,
  'anonymous role cannot execute the leaderboard RPC'
);

select * from finish();
rollback;
