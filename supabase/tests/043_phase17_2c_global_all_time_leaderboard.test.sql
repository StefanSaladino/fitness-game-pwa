begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

select has_function('public', 'get_global_all_time_leaderboard', array[]::text[], 'global all-time leaderboard RPC exists');
select is(has_function_privilege('authenticated','public.get_global_all_time_leaderboard()','execute'), true, 'authenticated role can execute global leaderboard RPC');
select is(has_function_privilege('anon','public.get_global_all_time_leaderboard()','execute'), false, 'anonymous role cannot execute global leaderboard RPC');

insert into auth.users (id, email) values
  ('92000000-0000-4000-8000-000000000001', 'global-01@test.local'),
  ('92000000-0000-4000-8000-000000000002', 'global-02@test.local'),
  ('92000000-0000-4000-8000-000000000003', 'global-03@test.local'),
  ('92000000-0000-4000-8000-000000000004', 'global-04@test.local'),
  ('92000000-0000-4000-8000-000000000005', 'global-05@test.local'),
  ('92000000-0000-4000-8000-000000000006', 'global-06@test.local'),
  ('92000000-0000-4000-8000-000000000007', 'global-07@test.local'),
  ('92000000-0000-4000-8000-000000000008', 'global-08@test.local'),
  ('92000000-0000-4000-8000-000000000009', 'global-09@test.local'),
  ('92000000-0000-4000-8000-000000000010', 'global-10@test.local'),
  ('92000000-0000-4000-8000-000000000011', 'global-11@test.local'),
  ('92000000-0000-4000-8000-000000000012', 'global-current@test.local'),
  ('92000000-0000-4000-8000-000000000099', 'global-suspended@test.local');

update public.profiles
set username = 'global_' || right(id::text, 2),
    display_name = 'Global ' || right(id::text, 2),
    timezone = 'America/Toronto',
    onboarding_completed_at = now()
where id::text like '92000000-0000-4000-8000-0000000000%';

-- The suspended user would otherwise tie for first and must never be eligible.
update private.platform_account_state
set status = 'SUSPENDED'::public.platform_account_status
where user_id = '92000000-0000-4000-8000-000000000099';

-- Scores are intentionally old: this board is lifetime, not a hidden weekly view.
insert into public.scoring_events (user_id, scoring_date, event_type, amount, scoring_version) values
  ('92000000-0000-4000-8000-000000000001', date '2020-01-01', 'LIFTING_WORKOUT', 125, 'lifting-v1'),
  ('92000000-0000-4000-8000-000000000002', date '2020-01-02', 'LIFTING_WORKOUT', 115, 'lifting-v1'),
  ('92000000-0000-4000-8000-000000000003', date '2020-01-03', 'LIFTING_WORKOUT', 105, 'lifting-v1'),
  ('92000000-0000-4000-8000-000000000004', date '2020-01-04', 'LIFTING_WORKOUT', 95, 'lifting-v1'),
  ('92000000-0000-4000-8000-000000000005', date '2020-01-05', 'LIFTING_WORKOUT', 85, 'lifting-v1'),
  ('92000000-0000-4000-8000-000000000006', date '2020-01-06', 'LIFTING_WORKOUT', 75, 'lifting-v1'),
  ('92000000-0000-4000-8000-000000000007', date '2020-01-07', 'LIFTING_WORKOUT', 65, 'lifting-v1'),
  ('92000000-0000-4000-8000-000000000008', date '2020-01-08', 'LIFTING_WORKOUT', 55, 'lifting-v1'),
  ('92000000-0000-4000-8000-000000000009', date '2020-01-09', 'LIFTING_WORKOUT', 45, 'lifting-v1'),
  ('92000000-0000-4000-8000-000000000010', date '2020-01-10', 'LIFTING_WORKOUT', 35, 'lifting-v1'),
  ('92000000-0000-4000-8000-000000000011', date '2020-01-11', 'LIFTING_WORKOUT', 25, 'lifting-v1'),
  ('92000000-0000-4000-8000-000000000012', date '2020-01-12', 'LIFTING_WORKOUT', 15, 'lifting-v1'),
  ('92000000-0000-4000-8000-000000000099', date '2020-01-01', 'LIFTING_WORKOUT', 125, 'lifting-v1');

set local role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000012', true);

select lives_ok(
  $$select * from public.get_global_all_time_leaderboard()$$,
  'an active onboarded user can load the global board without group membership'
);
select is(
  (select count(*)::integer from public.get_global_all_time_leaderboard() where row_kind = 'TOP'),
  10,
  'global response contains exactly ten top rows'
);
select is(
  (select count(*)::integer from public.get_global_all_time_leaderboard() where row_kind = 'CURRENT_USER'),
  1,
  'global response contains exactly one detached current-user row'
);
select is(
  (select rank from public.get_global_all_time_leaderboard() where row_kind = 'CURRENT_USER'),
  12::bigint,
  'detached current-user row reports the true global ordinal rank'
);
select is(
  (select xp from public.get_global_all_time_leaderboard() where row_kind = 'CURRENT_USER'),
  15::bigint,
  'detached current-user row carries authoritative lifetime XP'
);
select is(
  (select member_user_id from public.get_global_all_time_leaderboard() where row_kind = 'TOP' and rank = 1),
  '92000000-0000-4000-8000-000000000001'::uuid,
  'old authoritative XP participates in the lifetime ranking'
);
select ok(
  not exists(select 1 from public.get_global_all_time_leaderboard() where member_user_id = '92000000-0000-4000-8000-000000000099'),
  'suspended accounts are excluded even when they have leaderboard-leading XP'
);
select is(
  (select count(*)::integer from public.group_members where user_id = '92000000-0000-4000-8000-000000000012'),
  0,
  'global leaderboard eligibility is independent of group membership'
);

select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', true);
select is(
  (select count(*)::integer from public.get_global_all_time_leaderboard() where member_user_id = '92000000-0000-4000-8000-000000000001'),
  2,
  'a Top-10 current user is still repeated in the detached current-user row'
);
select is(
  (select count(*)::integer from public.get_global_all_time_leaderboard() where member_user_id = '92000000-0000-4000-8000-000000000001' and row_kind = 'TOP'),
  1,
  'Top-10 membership remains present when the same athlete is also detached'
);
select is(
  (select rank from public.get_global_all_time_leaderboard() where member_user_id = '92000000-0000-4000-8000-000000000001' and row_kind = 'CURRENT_USER'),
  1::bigint,
  'detached row preserves the current Top-10 user true rank'
);

select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select * from public.get_global_all_time_leaderboard()$$,
  '42501', 'Authentication required', 'global leaderboard rejects unauthenticated callers'
);

select * from finish();
rollback;
