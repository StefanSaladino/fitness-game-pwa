
-- ========================================
-- 001_schema.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'groups', 'groups exists');
select has_table('public', 'group_members', 'group_members exists');
select has_table('public', 'group_invites', 'group_invites exists');
select has_table('public', 'workout_sessions', 'workout_sessions exists');
select has_table('public', 'workout_exercises', 'workout_exercises exists');
select has_table('public', 'workout_sets', 'workout_sets exists');
select has_table('public', 'xp_events', 'xp_events exists');
select has_table('public', 'performance_observations', 'performance_observations exists');
select has_table('public', 'performance_benchmarks', 'performance_benchmarks exists');
select has_table('public', 'weekly_goals', 'weekly_goals exists');
select has_table('public', 'exercise_catalog', 'exercise catalog exists');

select col_is_pk('public', 'profiles', 'id', 'profiles.id is primary key');
select col_is_pk('public', 'groups', 'id', 'groups.id is primary key');
select col_is_pk('public', 'workout_sessions', 'id', 'workout_sessions.id is primary key');
select col_is_pk('public', 'xp_events', 'id', 'xp_events.id is primary key');
select col_is_pk('public', 'performance_observations', 'id', 'performance observations id is primary key');

select has_function('public', 'complete_onboarding', array['text','text','text','smallint'], 'onboarding RPC exists');
select has_function('public', 'schedule_weekly_target', array['smallint'], 'weekly target scheduling RPC exists');
select has_function('public', 'join_group_by_invite', array['uuid'], 'join invite RPC exists');
select has_function('public', 'remove_group_member', array['uuid','uuid'], 'remove member RPC exists');
select has_function('public', 'transfer_group_ownership', array['uuid','uuid'], 'ownership transfer RPC exists');
select has_function('public', 'leave_group', array['uuid'], 'leave group RPC exists');
select has_function('public', 'prepare_workout_session', array[]::text[], 'qualification trigger function exists');

select * from finish();
rollback;

-- ========================================
-- 002_rls.test.sql
-- ========================================

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

-- ========================================
-- 003_groups.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id,email) values
 ('61111111-1111-4111-8111-111111111111','g-owner@test.local'),
 ('62222222-2222-4222-8222-222222222222','g-member@test.local'),
 ('63333333-3333-4333-8333-333333333333','g-third@test.local');
update public.profiles set username='group_owner' where id='61111111-1111-4111-8111-111111111111';
update public.profiles set username='group_member',profile_code='FG-GROUPMEM001' where id='62222222-2222-4222-8222-222222222222';

insert into public.groups(id,name,created_by) values('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Expandable Group','61111111-1111-4111-8111-111111111111');
select results_eq($$select count(*) from public.group_members where group_id='6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and role='OWNER' and status='ACTIVE'$$,array[1::bigint],'group creator automatically becomes the single active owner');

insert into auth.users(id,email) select md5('extra-'||g)::uuid,'extra-'||g||'@test.local' from generate_series(1,8) g;
insert into public.group_members(group_id,user_id,role,status) select '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',md5('extra-'||g)::uuid,'MEMBER','ACTIVE' from generate_series(1,8) g;
select results_eq($$select count(*) from public.group_members where group_id='6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and status='ACTIVE'$$,array[9::bigint],'group accepts more than four members before invite acceptance');

set local role authenticated;
set local request.jwt.claim.sub='61111111-1111-4111-8111-111111111111';
select lives_ok($$select public.create_group_invite('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','group_member')$$,'owner can target a member by username');
set local request.jwt.claim.sub='62222222-2222-4222-8222-222222222222';
select lives_ok($$select public.accept_group_invite((select id from public.get_my_pending_group_invites() where group_id='6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'))$$,'targeted user can accept invite');
select results_eq($$select count(*) from public.group_members where group_id='6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and user_id='62222222-2222-4222-8222-222222222222' and status='ACTIVE'$$,array[1::bigint],'acceptance creates one active membership');
select results_eq($$select count(*) from public.get_my_pending_group_invites() where group_id='6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,array[0::bigint],'accepted invitation is removed from recipient inbox');
select results_eq($$select count(*) from public.group_members where group_id='6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and status='ACTIVE'$$,array[10::bigint],'invited member expands group to ten active members');

set local request.jwt.claim.sub='63333333-3333-4333-8333-333333333333';
select throws_ok($$select public.set_group_member_role('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','62222222-2222-4222-8222-222222222222','ADMIN')$$,'42501','Only the owner can change roles','outsider cannot change group roles');
select throws_ok($$select public.transfer_group_ownership('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','62222222-2222-4222-8222-222222222222')$$,'42501','Only the owner can transfer ownership','outsider cannot transfer ownership');
set local request.jwt.claim.sub='61111111-1111-4111-8111-111111111111';
select lives_ok($$select public.set_group_member_role('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','62222222-2222-4222-8222-222222222222','ADMIN')$$,'owner can promote member to admin');
set local request.jwt.claim.sub='62222222-2222-4222-8222-222222222222';
select throws_ok($$select public.remove_group_member('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','61111111-1111-4111-8111-111111111111')$$,'42501','Owner cannot be removed','admin cannot remove owner');
set local request.jwt.claim.sub='61111111-1111-4111-8111-111111111111';
select lives_ok($$select public.transfer_group_ownership('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','62222222-2222-4222-8222-222222222222')$$,'owner can transfer ownership');
select results_eq($$select count(*) from public.group_members where group_id='6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and role='OWNER' and status='ACTIVE'$$,array[1::bigint],'ownership transfer preserves exactly one active owner');
select * from finish();
rollback;

-- ========================================
-- 004_qualification.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values ('71111111-1111-4111-8111-111111111111', 'qual@test.local');

insert into public.workout_sessions (id,user_id,category,status,source,started_at,active_duration_seconds,timezone_at_start,scoring_date) values
 ('70000000-0000-4000-8000-000000000001','71111111-1111-4111-8111-111111111111','RUNNING','COMPLETED','MANUAL',now(),899,'America/Toronto',current_date),
 ('70000000-0000-4000-8000-000000000002','71111111-1111-4111-8111-111111111111','RUNNING','COMPLETED','MANUAL',now(),900,'America/Toronto',current_date),
 ('70000000-0000-4000-8000-000000000003','71111111-1111-4111-8111-111111111111','HIIT','COMPLETED','MANUAL',now(),719,'America/Toronto',current_date),
 ('70000000-0000-4000-8000-000000000004','71111111-1111-4111-8111-111111111111','HIIT','COMPLETED','MANUAL',now(),720,'America/Toronto',current_date),
 ('70000000-0000-4000-8000-000000000005','71111111-1111-4111-8111-111111111111','SPORT','COMPLETED','MANUAL',now(),1200,'America/Toronto',current_date),
 ('70000000-0000-4000-8000-000000000006','71111111-1111-4111-8111-111111111111','RUNNING','IN_PROGRESS','IN_APP',now(),5000,'America/Toronto',current_date),
 ('70000000-0000-4000-8000-000000000007','71111111-1111-4111-8111-111111111111','RUNNING','COMPLETED','MANUAL',now(),21601,'America/Toronto',current_date);

select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000001'), false, 'run fails one second below threshold');
select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000002'), true, 'run qualifies exactly at threshold');
select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000003'), false, 'HIIT fails one second below threshold');
select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000004'), true, 'HIIT qualifies exactly at threshold');
select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000005'), true, 'sport qualifies at 20 minutes');
select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000006'), false, 'in-progress workout never qualifies');
select is((select needs_review from public.workout_sessions where id='70000000-0000-4000-8000-000000000007'), true, 'workout over six hours is flagged for review');
select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000007'), false, 'review-required workout does not auto-qualify');
select is((select scoring_date from public.workout_sessions where id='70000000-0000-4000-8000-000000000002'), (now() at time zone 'America/Toronto')::date, 'scoring date is derived from start timezone');

select * from finish();
rollback;

-- ========================================
-- 005_profile_onboarding.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data)
values ('81111111-1111-4111-8111-111111111111', 'onboarding@test.local', '{"display_name":"Initial"}'::jsonb);

set local role authenticated;
set local request.jwt.claim.sub = '81111111-1111-4111-8111-111111111111';

select is((select weekly_workout_target from public.profiles where id='81111111-1111-4111-8111-111111111111'), 3::smallint, 'new profile starts with default target 3');
select is((select onboarding_completed_at is null from public.profiles where id='81111111-1111-4111-8111-111111111111'), true, 'new profile is not automatically onboarded');
select lives_ok($$select public.complete_onboarding('stefan_test','Stefan Test','America/Toronto',4::smallint)$$, 'user can complete onboarding once');
select is((select weekly_workout_target from public.profiles where id='81111111-1111-4111-8111-111111111111'), 4::smallint, 'onboarding sets current weekly target');
select results_eq(
  $$select target from public.weekly_goals where user_id='81111111-1111-4111-8111-111111111111'$$,
  array[4::smallint], 'onboarding snapshots current target into weekly goals'
);
select throws_ok(
  $$select public.complete_onboarding('again_user','Again','America/Toronto',2::smallint)$$,
  '22023', 'Onboarding already completed', 'complete_onboarding cannot be reused to rewrite current target'
);
select lives_ok($$select public.schedule_weekly_target(5::smallint)$$, 'user can schedule a future weekly target');
select results_eq(
  $$select weekly_workout_target, pending_weekly_workout_target from public.profiles where id='81111111-1111-4111-8111-111111111111'$$,
  $$values (4::smallint, 5::smallint)$$,
  'scheduling changes pending target without rewriting current target'
);

select * from finish();
rollback;

-- ========================================
-- 006_phase5_onboarding_username.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select has_function(
  'public',
  'complete_onboarding',
  array['text', 'text', 'text', 'smallint'],
  'Phase 5 complete_onboarding accepts username, display name, timezone, and weekly target'
);

select is(
  to_regprocedure('public.complete_onboarding(text,text,smallint)') is null,
  true,
  'legacy three-argument onboarding overload is removed'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('82111111-1111-4111-8111-111111111111', 'taken@test.local', '{"display_name":"Taken"}'::jsonb),
  ('82222222-2222-4222-8222-222222222222', 'candidate@test.local', '{"display_name":"Candidate"}'::jsonb),
  ('82333333-3333-4333-8333-333333333333', 'valid@test.local', '{"display_name":"Valid"}'::jsonb);

update public.profiles
set username = 'taken_name'
where id = '82111111-1111-4111-8111-111111111111';

set local role authenticated;
set local request.jwt.claim.sub = '82222222-2222-4222-8222-222222222222';

select throws_ok(
  $$select public.complete_onboarding('bad-name!', 'Candidate', 'America/Toronto', 3::smallint)$$,
  '22023',
  'Username must be 3-32 lowercase letters, numbers, or underscores',
  'invalid username characters are rejected'
);

select is(
  (select onboarding_completed_at is null from public.profiles where id = '82222222-2222-4222-8222-222222222222'),
  true,
  'failed username validation does not partially complete onboarding'
);

select throws_ok(
  $$select public.complete_onboarding('taken_name', 'Candidate', 'America/Toronto', 3::smallint)$$,
  '23505',
  'Username already taken',
  'duplicate canonical usernames are rejected explicitly'
);

select is(
  (select onboarding_completed_at is null from public.profiles where id = '82222222-2222-4222-8222-222222222222'),
  true,
  'duplicate username failure remains atomic'
);

set local request.jwt.claim.sub = '82333333-3333-4333-8333-333333333333';

select lives_ok(
  $$select public.complete_onboarding('  Valid_User  ', '  Valid Athlete  ', 'America/Toronto', 5::smallint)$$,
  'valid onboarding completes with normalized username and display name'
);

select results_eq(
  $$select username, display_name, timezone, weekly_workout_target from public.profiles where id = '82333333-3333-4333-8333-333333333333'$$,
  $$values ('valid_user'::text, 'Valid Athlete'::text, 'America/Toronto'::text, 5::smallint)$$,
  'onboarding persists normalized profile fields atomically'
);

select is(
  (
    select count(*)::integer
    from public.weekly_goals
    where user_id = '82333333-3333-4333-8333-333333333333'
      and target = 5
  ),
  1,
  'successful onboarding creates exactly one current weekly-goal snapshot'
);

select * from finish();
rollback;

-- ========================================
-- 007_lifting_scoring_foundation.test.sql
-- ========================================

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

-- ========================================
-- 008_profile_pictures.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_column('public', 'profiles', 'profile_picture_path', 'profiles store a profile-picture path reference');
select results_eq(
  $$select public from storage.buckets where id = 'profile-pictures'$$,
  array[true],
  'profile-pictures bucket is public for social display'
);
select results_eq(
  $$select file_size_limit from storage.buckets where id = 'profile-pictures'$$,
  array[2097152::bigint],
  'profile-picture bucket caps stored objects at 2 MiB'
);
select results_eq(
  $$select allowed_mime_types @> array['image/jpeg','image/png','image/webp']::text[] from storage.buckets where id = 'profile-pictures'$$,
  array[true],
  'profile-picture bucket allows the supported image MIME types'
);
select is(
  has_column_privilege('authenticated', 'public.profiles', 'profile_picture_path', 'UPDATE'),
  true,
  'authenticated users have column-level update privilege for profile_picture_path'
);
select results_eq(
  $$select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname='profile_pictures_select_own'$$,
  array[1::bigint],
  'own-folder storage select policy exists'
);
select results_eq(
  $$select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname='profile_pictures_insert_own'$$,
  array[1::bigint],
  'own-folder storage insert policy exists'
);
select results_eq(
  $$select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname='profile_pictures_delete_own'$$,
  array[1::bigint],
  'own-folder storage delete policy exists'
);

insert into auth.users (id, email) values
  ('91111111-1111-4111-8111-111111111111', 'pfp-owner@test.local'),
  ('92222222-2222-4222-8222-222222222222', 'pfp-other@test.local');

set local role authenticated;
select set_config('request.jwt.claim.sub', '91111111-1111-4111-8111-111111111111', true);

select lives_ok(
  $$update public.profiles set profile_picture_path='91111111-1111-4111-8111-111111111111/photo.webp' where id='91111111-1111-4111-8111-111111111111'$$,
  'user can store a path inside their own UUID folder'
);
select throws_ok(
  $$update public.profiles set profile_picture_path='92222222-2222-4222-8222-222222222222/photo.webp' where id='91111111-1111-4111-8111-111111111111'$$,
  '23514',
  null,
  'profile row rejects another users storage folder'
);
select lives_ok(
  $$update public.profiles set profile_picture_path=null where id='91111111-1111-4111-8111-111111111111'$$,
  'user can clear their own profile picture path'
);
select results_eq(
  $$select count(*) from public.profiles where id='92222222-2222-4222-8222-222222222222' and profile_picture_path is not null$$,
  array[0::bigint],
  'user cannot alter another profile picture through their own update path'
);

reset role;
select * from finish();
rollback;

-- ========================================
-- 009_dashboard_read_models.test.sql
-- ========================================

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

-- ========================================
-- 010_group_administration_permissions.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select is(has_function_privilege('authenticated','public.create_group_invite(uuid,text)','execute'),true,'authenticated can execute create_group_invite');
select is(has_function_privilege('anon','public.create_group_invite(uuid,text)','execute'),false,'anon cannot execute create_group_invite');
select is(has_function_privilege('authenticated','public.remove_group_member(uuid,uuid)','execute'),true,'authenticated can execute remove_group_member');
select is(has_function_privilege('anon','public.remove_group_member(uuid,uuid)','execute'),false,'anon cannot execute remove_group_member');
select is(has_function_privilege('authenticated','public.set_group_member_role(uuid,uuid,public.group_role)','execute'),true,'authenticated can execute set_group_member_role');
select is(has_function_privilege('anon','public.set_group_member_role(uuid,uuid,public.group_role)','execute'),false,'anon cannot execute set_group_member_role');
select is(has_function_privilege('authenticated','public.transfer_group_ownership(uuid,uuid)','execute'),true,'authenticated can execute transfer_group_ownership');
select is(has_function_privilege('anon','public.transfer_group_ownership(uuid,uuid)','execute'),false,'anon cannot execute transfer_group_ownership');
select is(has_function_privilege('authenticated','public.leave_group(uuid)','execute'),true,'authenticated can execute leave_group');
select is(has_function_privilege('anon','public.leave_group(uuid)','execute'),false,'anon cannot execute leave_group');
select * from finish();
rollback;

-- ========================================
-- 011_workout_session_lifecycle.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

select has_function('public', 'start_or_resume_lifting_workout', array[]::text[], 'start/resume lifting RPC exists');
select has_function('public', 'pause_lifting_workout', array['uuid'], 'pause lifting RPC exists');
select has_function('public', 'resume_lifting_workout', array['uuid'], 'resume lifting RPC exists');
select has_function('public', 'finish_lifting_workout', array['uuid'], 'finish lifting RPC exists');
select has_function('public', 'cancel_lifting_workout', array['uuid'], 'cancel lifting RPC exists');
select has_column('public', 'workout_sessions', 'paused_at', 'workout session records pause state');
select has_column('public', 'workout_sessions', 'last_resumed_at', 'workout session records active interval start');
select results_eq(
  $$select count(*)::bigint from pg_indexes where schemaname='public' and indexname='workout_sessions_one_active_in_app_lift'$$,
  array[1::bigint],
  'one-active-lift unique index exists'
);

select is(has_function_privilege('authenticated', 'public.start_or_resume_lifting_workout()', 'execute'), true, 'authenticated can start/resume lift');
select is(has_function_privilege('anon', 'public.start_or_resume_lifting_workout()', 'execute'), false, 'anon cannot start/resume lift');
select is(has_function_privilege('authenticated', 'public.pause_lifting_workout(uuid)', 'execute'), true, 'authenticated can pause lift');
select is(has_function_privilege('anon', 'public.pause_lifting_workout(uuid)', 'execute'), false, 'anon cannot pause lift');
select is(has_function_privilege('authenticated', 'public.resume_lifting_workout(uuid)', 'execute'), true, 'authenticated can resume lift');
select is(has_function_privilege('anon', 'public.resume_lifting_workout(uuid)', 'execute'), false, 'anon cannot resume lift');
select is(has_function_privilege('authenticated', 'public.finish_lifting_workout(uuid)', 'execute'), true, 'authenticated can finish lift');
select is(has_function_privilege('anon', 'public.finish_lifting_workout(uuid)', 'execute'), false, 'anon cannot finish lift');
select is(has_function_privilege('authenticated', 'public.cancel_lifting_workout(uuid)', 'execute'), true, 'authenticated can cancel lift');
select is(has_function_privilege('anon', 'public.cancel_lifting_workout(uuid)', 'execute'), false, 'anon cannot cancel lift');
select is(has_table_privilege('authenticated', 'public.workout_sessions', 'insert'), false, 'authenticated cannot directly insert workout sessions');
select is(has_table_privilege('authenticated', 'public.workout_sessions', 'update'), false, 'authenticated cannot directly update workout sessions');
select is(has_table_privilege('authenticated', 'public.workout_sessions', 'delete'), false, 'authenticated cannot directly delete workout sessions');

insert into auth.users (id, email) values
  ('a1111111-1111-4111-8111-111111111111', 'workout-owner@test.local'),
  ('a2222222-2222-4222-8222-222222222222', 'workout-other@test.local');

set local role authenticated;
set local request.jwt.claim.sub = 'a1111111-1111-4111-8111-111111111111';

create temporary table phase61_ids(first_id uuid, second_id uuid, cancelled_id uuid) on commit drop;
insert into phase61_ids(first_id)
select public.start_or_resume_lifting_workout();
update phase61_ids set second_id = public.start_or_resume_lifting_workout();

select is((select first_id = second_id from phase61_ids), true, 'start is idempotent while an active lift exists');
select results_eq(
  $$select count(*) from public.workout_sessions where user_id='a1111111-1111-4111-8111-111111111111' and category='STRENGTH' and source='IN_APP' and status='IN_PROGRESS'$$,
  array[1::bigint],
  'only one active in-app lifting session exists'
);

select public.pause_lifting_workout((select first_id from phase61_ids));
select results_eq(
  $$select (paused_at is not null and last_resumed_at is null)::text from public.workout_sessions where id=(select first_id from phase61_ids)$$,
  array['true'::text],
  'pause persists a stopped timer state'
);
select public.resume_lifting_workout((select first_id from phase61_ids));
select results_eq(
  $$select (paused_at is null and last_resumed_at is not null)::text from public.workout_sessions where id=(select first_id from phase61_ids)$$,
  array['true'::text],
  'resume persists a running timer state'
);

select public.finish_lifting_workout((select first_id from phase61_ids));
update phase61_ids set cancelled_id = public.start_or_resume_lifting_workout();
select public.cancel_lifting_workout((select cancelled_id from phase61_ids));

select results_eq(
  $$select status::text from public.workout_sessions where id=(select first_id from phase61_ids)$$,
  array['COMPLETED'::text],
  'finish transitions the active lift to completed'
);
select results_eq(
  $$select status::text from public.workout_sessions where id=(select cancelled_id from phase61_ids)$$,
  array['CANCELLED'::text],
  'cancel transitions the active lift to cancelled'
);

set local request.jwt.claim.sub = 'a2222222-2222-4222-8222-222222222222';
select throws_ok(
  $$select public.finish_lifting_workout((select first_id from phase61_ids))$$,
  '42501',
  'Active lifting workout not found',
  'another user cannot mutate a lifting session'
);

reset role;
select * from finish();
rollback;

-- ========================================
-- 012_create_group_rpc.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('a1111111-1111-4111-8111-111111111111', 'create-group-owner@test.local'),
  ('a2222222-2222-4222-8222-222222222222', 'create-group-other@test.local');

select ok(
  to_regprocedure('public.create_group(text)') is not null,
  'create_group RPC exists'
);

select ok(
  has_function_privilege('authenticated', 'public.create_group(text)', 'execute'),
  'authenticated can execute create_group'
);

select ok(
  not has_function_privilege('anon', 'public.create_group(text)', 'execute'),
  'anon cannot execute create_group'
);

select ok(
  not has_table_privilege('authenticated', 'public.groups', 'insert'),
  'authenticated cannot insert directly into groups'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a1111111-1111-4111-8111-111111111111';

select lives_ok(
  $$select public.create_group('  Heavy   Crew  ')$$,
  'authenticated user can create a group through the RPC'
);

reset role;

select results_eq(
  $$select count(*) from public.groups where created_by='a1111111-1111-4111-8111-111111111111' and name='Heavy Crew'$$,
  array[1::bigint],
  'RPC normalizes and creates exactly one group for the caller'
);

select results_eq(
  $$select count(*) from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where g.created_by='a1111111-1111-4111-8111-111111111111'
      and gm.user_id='a1111111-1111-4111-8111-111111111111'
      and gm.role='OWNER' and gm.status='ACTIVE'$$,
  array[1::bigint],
  'group creator becomes the active owner'
);

select results_eq(
  $$select count(*) from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where g.created_by='a1111111-1111-4111-8111-111111111111' and gm.status='ACTIVE'$$,
  array[1::bigint],
  'new group begins with exactly one active member'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a2222222-2222-4222-8222-222222222222';

select throws_ok(
  $$insert into public.groups (name, created_by) values ('Forbidden direct insert', 'a2222222-2222-4222-8222-222222222222')$$,
  '42501',
  null,
  'direct authenticated insert is denied'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a2222222-2222-4222-8222-222222222222';

select throws_ok(
  $$select public.create_group('   ')$$,
  '22023',
  'Group name must be between 1 and 80 characters',
  'create_group rejects an empty normalized group name'
);

select * from finish();
rollback;

-- ========================================
-- 013_workout_exercise_composition.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

select has_function('public', 'add_lifting_workout_exercise', array['uuid','uuid'], 'add exercise RPC exists');
select has_function('public', 'remove_lifting_workout_exercise', array['uuid'], 'remove exercise RPC exists');
select has_function('public', 'move_lifting_workout_exercise', array['uuid','integer'], 'move exercise RPC exists');
select is(has_function_privilege('authenticated', 'public.add_lifting_workout_exercise(uuid,uuid)', 'execute'), true, 'authenticated can add exercise');
select is(has_function_privilege('anon', 'public.add_lifting_workout_exercise(uuid,uuid)', 'execute'), false, 'anon cannot add exercise');
select is(has_function_privilege('authenticated', 'public.remove_lifting_workout_exercise(uuid)', 'execute'), true, 'authenticated can remove exercise');
select is(has_function_privilege('anon', 'public.remove_lifting_workout_exercise(uuid)', 'execute'), false, 'anon cannot remove exercise');
select is(has_function_privilege('authenticated', 'public.move_lifting_workout_exercise(uuid,integer)', 'execute'), true, 'authenticated can move exercise');
select is(has_function_privilege('anon', 'public.move_lifting_workout_exercise(uuid,integer)', 'execute'), false, 'anon cannot move exercise');
select is(has_table_privilege('authenticated', 'public.workout_exercises', 'insert'), false, 'authenticated cannot directly insert workout exercises');
select is(has_table_privilege('authenticated', 'public.workout_exercises', 'update'), false, 'authenticated cannot directly update workout exercises');
select is(has_table_privilege('authenticated', 'public.workout_exercises', 'delete'), false, 'authenticated cannot directly delete workout exercises');
select results_eq(
  $$select count(*)::bigint from pg_indexes where schemaname='public' and indexname='workout_exercises_one_canonical_per_workout'$$,
  array[1::bigint],
  'one-canonical-exercise-per-workout index exists'
);

insert into auth.users (id, email) values
  ('b1111111-1111-4111-8111-111111111111', 'composition-owner@test.local'),
  ('b2222222-2222-4222-8222-222222222222', 'composition-other@test.local');

insert into public.exercise_catalog (id, canonical_name, measurement_type, active) values
  ('be111111-1111-4111-8111-111111111111', 'Composition Bench Press', 'WEIGHT_REPS', true),
  ('be222222-2222-4222-8222-222222222222', 'Composition Row', 'WEIGHT_REPS', true),
  ('be333333-3333-4333-8333-333333333333', 'Composition Pull Up', 'BODYWEIGHT_REPS', true),
  ('be444444-4444-4444-8444-444444444444', 'Composition Inactive', 'OTHER', false);

set local role authenticated;
set local request.jwt.claim.sub = 'b1111111-1111-4111-8111-111111111111';

create temporary table phase61b_ids(
  workout_id uuid,
  bench_id uuid,
  row_id uuid,
  pull_id uuid,
  duplicate_bench_id uuid
) on commit drop;

insert into phase61b_ids(workout_id) values (public.start_or_resume_lifting_workout());
update phase61b_ids set bench_id = public.add_lifting_workout_exercise(workout_id, 'be111111-1111-4111-8111-111111111111');
update phase61b_ids set duplicate_bench_id = public.add_lifting_workout_exercise(workout_id, 'be111111-1111-4111-8111-111111111111');
update phase61b_ids set row_id = public.add_lifting_workout_exercise(workout_id, 'be222222-2222-4222-8222-222222222222');
update phase61b_ids set pull_id = public.add_lifting_workout_exercise(workout_id, 'be333333-3333-4333-8333-333333333333');

select is((select bench_id = duplicate_bench_id from phase61b_ids), true, 'adding the same canonical exercise is idempotent');
select results_eq(
  $$select count(*) from public.workout_exercises where workout_id=(select workout_id from phase61b_ids)$$,
  array[3::bigint],
  'idempotent add creates only one row per canonical exercise'
);
select results_eq(
  $$select string_agg(order_index::text, ',' order by order_index) from public.workout_exercises where workout_id=(select workout_id from phase61b_ids)$$,
  array['0,1,2'::text],
  'new exercises append with dense zero-based ordering'
);

select public.move_lifting_workout_exercise((select pull_id from phase61b_ids), 0);
select results_eq(
  $$select string_agg(exercise_id::text, ',' order by order_index) from public.workout_exercises where workout_id=(select workout_id from phase61b_ids)$$,
  array['be333333-3333-4333-8333-333333333333,be111111-1111-4111-8111-111111111111,be222222-2222-4222-8222-222222222222'::text],
  'move reorders the exercise list atomically'
);

select public.remove_lifting_workout_exercise((select bench_id from phase61b_ids));
select results_eq(
  $$select string_agg(order_index::text, ',' order by order_index) from public.workout_exercises where workout_id=(select workout_id from phase61b_ids)$$,
  array['0,1'::text],
  'remove compacts the remaining order indexes'
);

select throws_ok(
  $$select public.add_lifting_workout_exercise((select workout_id from phase61b_ids), 'be444444-4444-4444-8444-444444444444')$$,
  '22023',
  'Active exercise not found',
  'inactive exercises cannot be attached'
);

select throws_ok(
  $$select public.move_lifting_workout_exercise((select row_id from phase61b_ids), 8)$$,
  '22023',
  'Exercise order is out of range',
  'move rejects an out-of-range position'
);

set local request.jwt.claim.sub = 'b2222222-2222-4222-8222-222222222222';
select throws_ok(
  $$select public.add_lifting_workout_exercise((select workout_id from phase61b_ids), 'be111111-1111-4111-8111-111111111111')$$,
  '42501',
  'Active lifting workout not found',
  'another user cannot add to the workout'
);
select throws_ok(
  $$select public.remove_lifting_workout_exercise((select row_id from phase61b_ids))$$,
  '42501',
  'Active workout exercise not found',
  'another user cannot remove from the workout'
);
select throws_ok(
  $$select public.move_lifting_workout_exercise((select row_id from phase61b_ids), 0)$$,
  '42501',
  'Active workout exercise not found',
  'another user cannot reorder the workout'
);

set local request.jwt.claim.sub = 'b1111111-1111-4111-8111-111111111111';
select public.finish_lifting_workout((select workout_id from phase61b_ids));
select throws_ok(
  $$select public.add_lifting_workout_exercise((select workout_id from phase61b_ids), 'be111111-1111-4111-8111-111111111111')$$,
  '42501',
  'Active lifting workout not found',
  'completed workouts reject composition changes'
);

reset role;
select * from finish();
rollback;

-- ========================================
-- 014_exercise_picker_catalog.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

select has_function('public', 'get_exercise_picker_catalog', array[]::text[], 'exercise picker catalog RPC exists');
select is(has_function_privilege('authenticated', 'public.get_exercise_picker_catalog()', 'execute'), true, 'authenticated can load exercise picker catalog');
select is(has_function_privilege('anon', 'public.get_exercise_picker_catalog()', 'execute'), false, 'anon cannot load exercise picker catalog');
select results_eq(
  $$select (count(*) >= 356) from public.exercise_catalog where active=true$$,
  array[true],
  'expanded canonical catalogue contains at least 356 active exercises'
);
select results_eq(
  $$select count(*) from public.exercise_catalog where active=true and (primary_muscle_group is null or primary_muscle_group='')$$,
  array[0::bigint],
  'all active exercises have a muscle-group classification'
);
select results_eq(
  $$select count(*) from public.exercise_catalog where active=true and (workout_type is null or workout_type='')$$,
  array[0::bigint],
  'all active exercises have a workout-type classification'
);
select results_eq(
  $$select primary_muscle_group from public.exercise_catalog where canonical_name='Barbell Bench Press'$$,
  array['CHEST'::text],
  'barbell bench press is grouped under chest'
);
select results_eq(
  $$select workout_type from public.exercise_catalog where canonical_name='Barbell Bench Press'$$,
  array['BARBELL'::text],
  'barbell bench press is grouped under barbell'
);
select results_eq(
  $$select aliases @> array['RDL']::text[] from public.exercise_catalog where canonical_name='Romanian Deadlift'$$,
  array[true],
  'Romanian deadlift carries the RDL alias'
);
select results_eq(
  $$select aliases @> array['OHP']::text[] from public.exercise_catalog where canonical_name='Overhead Press'$$,
  array[true],
  'overhead press carries the OHP alias'
);
select results_eq(
  $$select workout_type from public.exercise_catalog where canonical_name='Dumbbell Bench Press'$$,
  array['DUMBBELL'::text],
  'dumbbell bench press is grouped under dumbbell'
);
select results_eq(
  $$select workout_type from public.exercise_catalog where canonical_name='Kettlebell Swing'$$,
  array['KETTLEBELL'::text],
  'kettlebell swing is grouped under kettlebell'
);
select results_eq(
  $$select workout_type from public.exercise_catalog where canonical_name='Box Jump'$$,
  array['PLYOMETRIC'::text],
  'box jump is grouped under plyometric'
);
select results_eq(
  $$select primary_muscle_group from public.exercise_catalog where canonical_name='Cable Biceps Curl'$$,
  array['BICEPS'::text],
  'cable biceps curl is grouped under biceps'
);
select results_eq(
  $$select workout_type from public.exercise_catalog where canonical_name='Pull-Up'$$,
  array['BODYWEIGHT'::text],
  'pull-up is grouped under bodyweight'
);
select results_eq(
  $$select count(*) from pg_indexes where schemaname='public' and indexname in ('exercise_catalog_active_muscle_name_idx','exercise_catalog_active_type_name_idx')$$,
  array[2::bigint],
  'exercise browse indexes exist'
);

insert into auth.users (id, email) values
  ('c1111111-1111-4111-8111-111111111111', 'picker-recent@test.local'),
  ('c2222222-2222-4222-8222-222222222222', 'picker-other@test.local');

set local role authenticated;
set local request.jwt.claim.sub = 'c1111111-1111-4111-8111-111111111111';

create temporary table phase61c_ids(workout_id uuid, exercise_id uuid) on commit drop;
insert into phase61c_ids(exercise_id)
select id from public.exercise_catalog where canonical_name='Barbell Bench Press';
update phase61c_ids set workout_id = public.start_or_resume_lifting_workout();
select public.add_lifting_workout_exercise((select workout_id from phase61c_ids), (select exercise_id from phase61c_ids));
select public.finish_lifting_workout((select workout_id from phase61c_ids));

select results_eq(
  $$select last_used_at is not null from public.get_exercise_picker_catalog() where canonical_name='Barbell Bench Press'$$,
  array[true],
  'picker RPC exposes completed-workout recency to the owning user'
);
select results_eq(
  $$select count(*) from public.get_exercise_picker_catalog() where canonical_name='Barbell Bench Press'$$,
  array[1::bigint],
  'picker RPC returns active canonical exercises once'
);

set local request.jwt.claim.sub = 'c2222222-2222-4222-8222-222222222222';
select results_eq(
  $$select last_used_at is null from public.get_exercise_picker_catalog() where canonical_name='Barbell Bench Press'$$,
  array[true],
  'recent usage is isolated to the authenticated user'
);

reset role;
insert into public.exercise_catalog (canonical_name, measurement_type, active, primary_muscle_group, workout_type)
values ('Picker Inactive Exercise', 'OTHER', false, 'OTHER', 'OTHER');
set local role authenticated;
set local request.jwt.claim.sub = 'c1111111-1111-4111-8111-111111111111';
select results_eq(
  $$select count(*) from public.get_exercise_picker_catalog() where canonical_name='Picker Inactive Exercise'$$,
  array[0::bigint],
  'picker RPC excludes inactive exercises'
);

reset role;
select * from finish();
rollback;

-- ========================================
-- 015_muscle_group_icon_taxonomy.test.sql
-- ========================================

begin;

select plan(6);

select has_column(
  'public',
  'exercise_catalog',
  'primary_muscle_group',
  'exercise catalogue keeps primary muscle-group metadata'
);

select results_eq(
  $$
    select position('OBLIQUES' in pg_get_constraintdef(oid)) > 0
    from pg_constraint
    where conname = 'exercise_catalog_primary_muscle_group_check'
      and conrelid = 'public.exercise_catalog'::regclass
  $$,
  $$ values (true) $$,
  'muscle-group constraint accepts OBLIQUES'
);

select results_eq(
  $$ select count(*)::bigint from public.exercise_catalog where primary_muscle_group = 'OBLIQUES' $$,
  $$ values (8::bigint) $$,
  'eight canonical rotational/side-core exercises are classified as obliques'
);

select results_eq(
  $$ select primary_muscle_group from public.exercise_catalog where canonical_name = 'Side Plank' $$,
  $$ values ('OBLIQUES'::text) $$,
  'Side Plank is an oblique exercise'
);

select results_eq(
  $$ select primary_muscle_group from public.exercise_catalog where canonical_name = 'Cable Wood Chop' $$,
  $$ values ('OBLIQUES'::text) $$,
  'Cable Wood Chop is an oblique exercise'
);

select results_eq(
  $$ select primary_muscle_group from public.exercise_catalog where canonical_name = 'Landmine Rotation' $$,
  $$ values ('OBLIQUES'::text) $$,
  'Landmine Rotation is an oblique exercise'
);

select * from finish();
rollback;

-- ========================================
-- 016_targeted_group_invitations.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

select has_column('public','profiles','profile_code','profiles expose a stable invite ID');
select has_column('public','group_invites','invited_user_id','group invites target exactly one user');
select is(to_regprocedure('public.join_group_by_invite(uuid)') is null,true,'legacy reusable join RPC is removed');
select has_function('public','create_group_invite',array['uuid','text'],'targeted invite creator exists');
select has_function('public','get_group_pending_invites',array['uuid'],'outgoing pending invite reader exists');
select has_function('public','get_my_pending_group_invites',array[]::text[],'recipient inbox exists');
select has_function('public','accept_group_invite',array['uuid'],'accept RPC exists');
select has_function('public','decline_group_invite',array['uuid'],'decline RPC exists');
select has_function('public','revoke_group_invite',array['uuid'],'revoke RPC exists');
select is(has_function_privilege('authenticated','public.create_group_invite(uuid,text)','execute'),true,'authenticated can create targeted invites');
select is(has_function_privilege('anon','public.create_group_invite(uuid,text)','execute'),false,'anon cannot create targeted invites');
select is(has_table_privilege('authenticated','public.group_invites','insert'),false,'browser cannot directly insert invites');
select is(has_table_privilege('authenticated','public.group_invites','update'),false,'browser cannot directly update invites');
select is(has_table_privilege('authenticated','public.group_invites','delete'),false,'browser cannot directly delete invites');

insert into auth.users (id,email) values
 ('71111111-1111-4111-8111-111111111111','invite-owner@test.local'),
 ('72222222-2222-4222-8222-222222222222','invite-target@test.local'),
 ('73333333-3333-4333-8333-333333333333','invite-decline@test.local'),
 ('74444444-4444-4444-8444-444444444444','invite-revoke@test.local');
update public.profiles set username='invite_owner', profile_code='FG-OWNER00001' where id='71111111-1111-4111-8111-111111111111';
update public.profiles set username='invite_target', profile_code='FG-TARGET0001' where id='72222222-2222-4222-8222-222222222222';
update public.profiles set username='invite_decline', profile_code='FG-DECLINE001' where id='73333333-3333-4333-8333-333333333333';
update public.profiles set username='invite_revoke', profile_code='FG-REVOKE0001' where id='74444444-4444-4444-8444-444444444444';
insert into public.groups(id,name,created_by) values('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Targeted Crew','71111111-1111-4111-8111-111111111111');

set local role authenticated;
set local request.jwt.claim.sub='73333333-3333-4333-8333-333333333333';
select throws_ok($$select public.create_group_invite('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','invite_target')$$,'42501','Not a group administrator','outsider cannot create an invitation');
select throws_ok($$select * from public.get_group_pending_invites('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,'42501','Not a group administrator','outsider cannot read group pending invitations');

set local request.jwt.claim.sub='71111111-1111-4111-8111-111111111111';
select lives_ok($$select public.create_group_invite('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','@invite_target')$$,'owner can invite by username');
select results_eq($$select count(*) from public.get_group_pending_invites('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') where invited_user_id='72222222-2222-4222-8222-222222222222'$$,array[1::bigint],'username invite creates one targeted pending row');
select lives_ok($$select public.create_group_invite('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','FG-TARGET0001')$$,'stable profile invite ID resolves the same recipient');
select results_eq($$select count(*) from public.get_group_pending_invites('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') where invited_user_id='72222222-2222-4222-8222-222222222222'$$,array[1::bigint],'duplicate targeted invite is idempotent');

set local request.jwt.claim.sub='72222222-2222-4222-8222-222222222222';
select lives_ok($$select public.accept_group_invite((select id from public.get_my_pending_group_invites() where group_id='7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'))$$,'recipient can accept own pending invitation');
select results_eq($$select count(*) from public.group_members where group_id='7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and user_id='72222222-2222-4222-8222-222222222222' and status='ACTIVE' and role='MEMBER'$$,array[1::bigint],'acceptance creates active member');
select results_eq($$select count(*) from public.get_my_pending_group_invites() where group_id='7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,array[0::bigint],'accepted invite is removed from recipient inbox');

set local request.jwt.claim.sub='71111111-1111-4111-8111-111111111111';
select lives_ok($$select public.create_group_invite('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','invite_decline')$$,'owner can create another targeted invitation');
set local request.jwt.claim.sub='73333333-3333-4333-8333-333333333333';
select lives_ok($$select public.decline_group_invite((select id from public.get_my_pending_group_invites() where group_id='7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'))$$,'recipient can decline own invitation');
select results_eq($$select count(*) from public.get_my_pending_group_invites() where group_id='7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,array[0::bigint],'declined invite is removed from recipient inbox');

set local request.jwt.claim.sub='71111111-1111-4111-8111-111111111111';
select lives_ok($$select public.create_group_invite('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','FG-REVOKE0001')$$,'owner can create invitation by profile ID');
select lives_ok($$select public.revoke_group_invite((select id from public.get_group_pending_invites('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') where invited_user_id='74444444-4444-4444-8444-444444444444'))$$,'group administrator can revoke a pending invitation');
select results_eq($$select count(*) from public.get_group_pending_invites('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') where invited_user_id='74444444-4444-4444-8444-444444444444'$$,array[0::bigint],'revoked invite is removed from administrator pending list');

select * from finish();
rollback;

-- ========================================
-- 017_workout_timer_intent_sync.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_function('public', 'start_or_resume_lifting_workout_intent', array['timestamp with time zone'], 'intent-aware start RPC exists');
select has_function('public', 'pause_lifting_workout_intent', array['uuid','timestamp with time zone'], 'intent-aware pause RPC exists');
select has_function('public', 'resume_lifting_workout_intent', array['uuid','timestamp with time zone'], 'intent-aware resume RPC exists');
select is(has_function_privilege('authenticated', 'public.start_or_resume_lifting_workout_intent(timestamptz)', 'execute'), true, 'authenticated can start with action timestamp');
select is(has_function_privilege('anon', 'public.start_or_resume_lifting_workout_intent(timestamptz)', 'execute'), false, 'anon cannot start with action timestamp');
select is(has_function_privilege('authenticated', 'public.pause_lifting_workout_intent(uuid,timestamptz)', 'execute'), true, 'authenticated can pause with action timestamp');
select is(has_function_privilege('anon', 'public.pause_lifting_workout_intent(uuid,timestamptz)', 'execute'), false, 'anon cannot pause with action timestamp');
select is(has_function_privilege('authenticated', 'public.resume_lifting_workout_intent(uuid,timestamptz)', 'execute'), true, 'authenticated can resume with action timestamp');
select is(has_function_privilege('anon', 'public.resume_lifting_workout_intent(uuid,timestamptz)', 'execute'), false, 'anon cannot resume with action timestamp');

insert into auth.users (id, email) values
  ('a5111111-1111-4111-8111-111111111111', 'timer-intent@test.local');

set local role authenticated;
set local request.jwt.claim.sub = 'a5111111-1111-4111-8111-111111111111';

create temporary table phase_timer_intent(
  base_at timestamptz,
  workout_id uuid
) on commit drop;
insert into phase_timer_intent(base_at) values (clock_timestamp());

update phase_timer_intent
set workout_id = (public.start_or_resume_lifting_workout_intent(base_at - interval '8 seconds')->>'id')::uuid;

select results_eq(
  $$select round(extract(epoch from (started_at - ((select base_at from phase_timer_intent) - interval '8 seconds'))))::bigint from public.workout_sessions where id=(select workout_id from phase_timer_intent)$$,
  array[0::bigint],
  'start uses the user action timestamp instead of request completion time'
);

select is(
  (public.pause_lifting_workout_intent((select workout_id from phase_timer_intent), (select base_at from phase_timer_intent) - interval '4 seconds')->>'active_duration_seconds')::integer,
  4,
  'pause counts only active time through the user pause action'
);

select results_eq(
  $$select (paused_at is not null and last_resumed_at is null)::text from public.workout_sessions where id=(select workout_id from phase_timer_intent)$$,
  array['true'::text],
  'intent-aware pause persists stopped state'
);

select lives_ok(
  $$select public.resume_lifting_workout_intent((select workout_id from phase_timer_intent), (select base_at from phase_timer_intent) - interval '2 seconds')$$,
  'resume accepts a recent user action timestamp'
);

select lives_ok(
  $$select public.pause_lifting_workout_intent((select workout_id from phase_timer_intent), (select base_at from phase_timer_intent))$$,
  'a second pause can use a later action timestamp'
);

select results_eq(
  $$select active_duration_seconds::bigint from public.workout_sessions where id=(select workout_id from phase_timer_intent)$$,
  array[6::bigint],
  'resume-to-pause interval adds exactly the intended two seconds'
);

select results_eq(
  $$select jsonb_typeof(public.start_or_resume_lifting_workout_intent(clock_timestamp()))$$,
  array['object'::text],
  'intent-aware lifecycle RPC returns the session snapshot in one round trip'
);

reset role;
select * from finish();
rollback;

-- ========================================
-- 018_workout_set_tracking.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

select has_column('public', 'workout_sets', 'bodyweight_mode', 'workout sets persist bodyweight loading mode');
select has_function('public', 'add_lifting_workout_set', array['uuid','set_type'], 'add set RPC exists');
select has_function('public', 'copy_lifting_workout_set', array['uuid'], 'copy set RPC exists');
select has_function('public', 'save_lifting_workout_set', array['uuid','set_type','numeric','integer','text','boolean'], 'save set RPC exists');
select has_function('public', 'remove_lifting_workout_set', array['uuid'], 'remove set RPC exists');

select is(has_function_privilege('authenticated', 'public.add_lifting_workout_set(uuid,public.set_type)', 'execute'), true, 'authenticated can add sets');
select is(has_function_privilege('anon', 'public.add_lifting_workout_set(uuid,public.set_type)', 'execute'), false, 'anon cannot add sets');
select is(has_function_privilege('authenticated', 'public.copy_lifting_workout_set(uuid)', 'execute'), true, 'authenticated can copy sets');
select is(has_function_privilege('anon', 'public.copy_lifting_workout_set(uuid)', 'execute'), false, 'anon cannot copy sets');
select is(has_function_privilege('authenticated', 'public.save_lifting_workout_set(uuid,public.set_type,numeric,integer,text,boolean)', 'execute'), true, 'authenticated can save sets');
select is(has_function_privilege('anon', 'public.save_lifting_workout_set(uuid,public.set_type,numeric,integer,text,boolean)', 'execute'), false, 'anon cannot save sets');
select is(has_function_privilege('authenticated', 'public.remove_lifting_workout_set(uuid)', 'execute'), true, 'authenticated can remove sets');
select is(has_function_privilege('anon', 'public.remove_lifting_workout_set(uuid)', 'execute'), false, 'anon cannot remove sets');
select is(has_table_privilege('authenticated', 'public.workout_sets', 'insert'), false, 'authenticated cannot directly insert sets');
select is(has_table_privilege('authenticated', 'public.workout_sets', 'update'), false, 'authenticated cannot directly update sets');
select is(has_table_privilege('authenticated', 'public.workout_sets', 'delete'), false, 'authenticated cannot directly delete sets');

insert into auth.users (id, email) values
  ('c3111111-1111-4111-8111-111111111111', 'set-owner@test.local'),
  ('c3222222-2222-4222-8222-222222222222', 'set-other@test.local');

insert into public.exercise_catalog (id, canonical_name, measurement_type, active) values
  ('ce311111-1111-4111-8111-111111111111', 'Set Tracking Bench Press', 'WEIGHT_REPS', true),
  ('ce322222-2222-4222-8222-222222222222', 'Set Tracking Pull Up', 'BODYWEIGHT_REPS', true);

set local role authenticated;
set local request.jwt.claim.sub = 'c3111111-1111-4111-8111-111111111111';

create temporary table phase63_ids(
  workout_id uuid,
  weighted_exercise_id uuid,
  bodyweight_exercise_id uuid,
  warmup_id uuid,
  working_one_id uuid,
  working_two_id uuid,
  copied_id uuid,
  bodyweight_id uuid,
  added_id uuid,
  assisted_id uuid
) on commit drop;

insert into phase63_ids(workout_id) values (public.start_or_resume_lifting_workout());
update phase63_ids set weighted_exercise_id = public.add_lifting_workout_exercise(workout_id, 'ce311111-1111-4111-8111-111111111111');
update phase63_ids set bodyweight_exercise_id = public.add_lifting_workout_exercise(workout_id, 'ce322222-2222-4222-8222-222222222222');
update phase63_ids set warmup_id = public.add_lifting_workout_set(weighted_exercise_id, 'WARMUP');
update phase63_ids set working_one_id = public.add_lifting_workout_set(weighted_exercise_id, 'WORKING');
update phase63_ids set working_two_id = public.add_lifting_workout_set(weighted_exercise_id, 'WORKING');

select results_eq(
  $$select string_agg(set_number::text, ',' order by set_number) from public.workout_sets where workout_exercise_id=(select weighted_exercise_id from phase63_ids)$$,
  array['1,2,3'::text],
  'new sets append with dense one-based ordering'
);

select public.save_lifting_workout_set((select warmup_id from phase63_ids), 'WARMUP', 60, 10, null, false);
select public.save_lifting_workout_set((select working_one_id from phase63_ids), 'WORKING', 100, 5, null, true);
select public.save_lifting_workout_set((select working_two_id from phase63_ids), 'WORKING', 105, 4, null, true);

select results_eq(
  $$select string_agg(weight_kg::text || 'x' || reps::text, ',' order by set_number) from public.workout_sets where workout_exercise_id=(select weighted_exercise_id from phase63_ids)$$,
  array['60.000x10,100.000x5,105.000x4'::text],
  'different sets keep independent weight and rep values'
);
select results_eq(
  $$select string_agg(completed::text, ',' order by set_number) from public.workout_sets where workout_exercise_id=(select weighted_exercise_id from phase63_ids)$$,
  array['false,true,true'::text],
  'completion state is independent per set'
);

update phase63_ids set copied_id = public.copy_lifting_workout_set(working_two_id);
select results_eq(
  $$select set_number::text || ':' || weight_kg::text || 'x' || reps::text || ':' || completed::text from public.workout_sets where id=(select copied_id from phase63_ids)$$,
  array['4:105.000x4:false'::text],
  'copy duplicates values into a new independent incomplete set'
);

select public.remove_lifting_workout_set((select working_one_id from phase63_ids));
select results_eq(
  $$select string_agg(set_number::text, ',' order by set_number) from public.workout_sets where workout_exercise_id=(select weighted_exercise_id from phase63_ids)$$,
  array['1,2,3'::text],
  'removing a set compacts stable set ordering'
);

update phase63_ids set bodyweight_id = public.add_lifting_workout_set(bodyweight_exercise_id, 'WORKING');
select public.save_lifting_workout_set((select bodyweight_id from phase63_ids), 'WORKING', null, 8, 'BODYWEIGHT', true);
select results_eq(
  $$select bodyweight_mode || ':' || coalesce(weight_kg::text, 'none') || ':' || reps::text from public.workout_sets where id=(select bodyweight_id from phase63_ids)$$,
  array['BODYWEIGHT:none:8'::text],
  'plain bodyweight sets persist reps without artificial load'
);

update phase63_ids set added_id = public.add_lifting_workout_set(bodyweight_exercise_id, 'WORKING');
select public.save_lifting_workout_set((select added_id from phase63_ids), 'WORKING', 20, 6, 'ADDED_WEIGHT', true);
select results_eq(
  $$select bodyweight_mode || ':' || weight_kg::text || ':' || reps::text from public.workout_sets where id=(select added_id from phase63_ids)$$,
  array['ADDED_WEIGHT:20.000:6'::text],
  'added-weight bodyweight sets are a distinct persisted mode'
);

update phase63_ids set assisted_id = public.add_lifting_workout_set(bodyweight_exercise_id, 'WORKING');
select public.save_lifting_workout_set((select assisted_id from phase63_ids), 'WORKING', 30, 7, 'ASSISTED', true);
select results_eq(
  $$select bodyweight_mode || ':' || weight_kg::text || ':' || reps::text from public.workout_sets where id=(select assisted_id from phase63_ids)$$,
  array['ASSISTED:30.000:7'::text],
  'assisted bodyweight sets are a distinct persisted mode'
);

select throws_ok(
  $$select public.save_lifting_workout_set((select bodyweight_id from phase63_ids), 'WORKING', 5, 8, 'BODYWEIGHT', true)$$,
  '22023', 'Plain bodyweight sets cannot include load',
  'plain bodyweight mode rejects a weight value'
);
select throws_ok(
  $$select public.save_lifting_workout_set((select warmup_id from phase63_ids), 'WORKING', null, 8, null, true)$$,
  '22023', 'Completed weighted sets require weight and reps',
  'completed weighted sets require both weight and reps'
);
select throws_ok(
  $$select public.save_lifting_workout_set((select warmup_id from phase63_ids), 'WORKING', 60, 0, null, false)$$,
  '22023', 'Reps are out of range',
  'set reps reject zero or negative values when supplied'
);

set local request.jwt.claim.sub = 'c3222222-2222-4222-8222-222222222222';
select throws_ok(
  $$select public.add_lifting_workout_set((select weighted_exercise_id from phase63_ids), 'WORKING')$$,
  '42501', 'Active workout exercise not found',
  'another user cannot add a set'
);
select throws_ok(
  $$select public.copy_lifting_workout_set((select warmup_id from phase63_ids))$$,
  '42501', 'Active workout set not found',
  'another user cannot copy a set'
);
select throws_ok(
  $$select public.save_lifting_workout_set((select warmup_id from phase63_ids), 'WARMUP', 60, 10, null, false)$$,
  '42501', 'Active workout set not found',
  'another user cannot save a set'
);
select throws_ok(
  $$select public.remove_lifting_workout_set((select warmup_id from phase63_ids))$$,
  '42501', 'Active workout set not found',
  'another user cannot remove a set'
);

set local request.jwt.claim.sub = 'c3111111-1111-4111-8111-111111111111';
select public.finish_lifting_workout((select workout_id from phase63_ids));
select throws_ok(
  $$select public.add_lifting_workout_set((select weighted_exercise_id from phase63_ids), 'WORKING')$$,
  '42501', 'Active workout exercise not found',
  'completed workouts reject new sets'
);
select throws_ok(
  $$select public.save_lifting_workout_set((select warmup_id from phase63_ids), 'WARMUP', 60, 10, null, false)$$,
  '42501', 'Active workout set not found',
  'completed workouts reject set edits'
);
select throws_ok(
  $$select public.remove_lifting_workout_set((select warmup_id from phase63_ids))$$,
  '42501', 'Active workout set not found',
  'completed workouts reject set removal'
);

reset role;
select * from finish();
rollback;

-- ========================================
-- 019_idempotent_workout_mutations.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

select has_table('public', 'workout_mutation_receipts', 'workout mutation receipt table exists');
select has_column('public', 'workout_mutation_receipts', 'idempotency_key', 'receipt stores idempotency key');
select has_column('public', 'workout_mutation_receipts', 'request_payload', 'receipt stores the exact request payload');
select has_column('public', 'workout_mutation_receipts', 'result_payload', 'receipt stores the authoritative result');
select has_function('public', 'apply_lifting_workout_mutation', array['uuid','uuid','text','jsonb'], 'idempotent mutation RPC exists');
select is(has_function_privilege('authenticated', 'public.apply_lifting_workout_mutation(uuid,uuid,text,jsonb)', 'execute'), true, 'authenticated can apply idempotent workout mutations');
select is(has_function_privilege('anon', 'public.apply_lifting_workout_mutation(uuid,uuid,text,jsonb)', 'execute'), false, 'anon cannot apply workout mutations');
select is(has_table_privilege('authenticated', 'public.workout_mutation_receipts', 'select'), false, 'authenticated cannot directly read mutation receipts');
select is(has_table_privilege('authenticated', 'public.workout_mutation_receipts', 'insert'), false, 'authenticated cannot forge mutation receipts');

insert into auth.users (id, email) values
  ('d4111111-1111-4111-8111-111111111111', 'queue-owner@test.local'),
  ('d4222222-2222-4222-8222-222222222222', 'queue-other@test.local');

insert into public.exercise_catalog (id, canonical_name, measurement_type, active) values
  ('de411111-1111-4111-8111-111111111111', 'Queue Bench Press', 'WEIGHT_REPS', true),
  ('de422222-2222-4222-8222-222222222222', 'Queue Row', 'WEIGHT_REPS', true);

set local role authenticated;
set local request.jwt.claim.sub = 'd4111111-1111-4111-8111-111111111111';

create temporary table phase64b_ids(
  workout_id uuid,
  exercise_one_id uuid,
  exercise_two_id uuid,
  set_one_id uuid,
  copied_set_id uuid
) on commit drop;

insert into phase64b_ids(workout_id) values (public.start_or_resume_lifting_workout());

update phase64b_ids
set exercise_one_id = (public.apply_lifting_workout_mutation(
  'a4111111-1111-4111-8111-111111111111', workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'de411111-1111-4111-8111-111111111111')
) ->> 'resultId')::uuid;

select is(
  (public.apply_lifting_workout_mutation(
    'a4111111-1111-4111-8111-111111111111', (select workout_id from phase64b_ids), 'ADD_EXERCISE',
    jsonb_build_object('exerciseId', 'de411111-1111-4111-8111-111111111111')
  ) ->> 'resultId')::uuid,
  (select exercise_one_id from phase64b_ids),
  'replaying an exercise add returns the original result id'
);
select is((select count(*)::integer from public.workout_exercises where workout_id=(select workout_id from phase64b_ids)), 1, 'replaying exercise add cannot duplicate the exercise');

update phase64b_ids
set exercise_two_id = (public.apply_lifting_workout_mutation(
  'a4222222-2222-4222-8222-222222222222', workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'de422222-2222-4222-8222-222222222222')
) ->> 'resultId')::uuid;
select is((select count(*)::integer from public.workout_exercises where workout_id=(select workout_id from phase64b_ids)), 2, 'a different idempotency key can create a different exercise mutation');

select public.apply_lifting_workout_mutation(
  'a4333333-3333-4333-8333-333333333333', (select workout_id from phase64b_ids), 'MOVE_EXERCISE',
  jsonb_build_object('workoutExerciseId', (select exercise_two_id from phase64b_ids), 'newOrderIndex', 0, 'expectedRevision', 0)
);
select public.apply_lifting_workout_mutation(
  'a4333333-3333-4333-8333-333333333333', (select workout_id from phase64b_ids), 'MOVE_EXERCISE',
  jsonb_build_object('workoutExerciseId', (select exercise_two_id from phase64b_ids), 'newOrderIndex', 0, 'expectedRevision', 0)
);
select results_eq(
  $$select string_agg(order_index::text, ',' order by order_index) from public.workout_exercises where workout_id=(select workout_id from phase64b_ids)$$,
  array['0,1'::text],
  'replaying a move keeps dense exercise ordering'
);

update phase64b_ids
set set_one_id = (public.apply_lifting_workout_mutation(
  'b4111111-1111-4111-8111-111111111111', workout_id, 'ADD_SET',
  jsonb_build_object('workoutExerciseId', exercise_one_id, 'setType', 'WORKING')
) ->> 'resultId')::uuid;

select is(
  (public.apply_lifting_workout_mutation(
    'b4111111-1111-4111-8111-111111111111', (select workout_id from phase64b_ids), 'ADD_SET',
    jsonb_build_object('workoutExerciseId', (select exercise_one_id from phase64b_ids), 'setType', 'WORKING')
  ) ->> 'resultId')::uuid,
  (select set_one_id from phase64b_ids),
  'replaying set add returns the original set id'
);
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_one_id from phase64b_ids)), 1, 'replaying set add cannot duplicate a set');

select public.apply_lifting_workout_mutation(
  'b4222222-2222-4222-8222-222222222222', (select workout_id from phase64b_ids), 'SAVE_SET',
  jsonb_build_object('workoutSetId', (select set_one_id from phase64b_ids), 'setType', 'WORKING', 'weightKg', 100, 'reps', 5, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
);
select public.apply_lifting_workout_mutation(
  'b4222222-2222-4222-8222-222222222222', (select workout_id from phase64b_ids), 'SAVE_SET',
  jsonb_build_object('workoutSetId', (select set_one_id from phase64b_ids), 'setType', 'WORKING', 'weightKg', 100, 'reps', 5, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
);
select results_eq(
  $$select weight_kg::text || 'x' || reps::text || ':' || completed::text from public.workout_sets where id=(select set_one_id from phase64b_ids)$$,
  array['100.000x5:true'::text],
  'replaying set save leaves one authoritative value'
);

update phase64b_ids
set copied_set_id = (public.apply_lifting_workout_mutation(
  'b4333333-3333-4333-8333-333333333333', workout_id, 'COPY_SET',
  jsonb_build_object('workoutSetId', set_one_id, 'expectedRevision', 1)
) ->> 'resultId')::uuid;
select is(
  (public.apply_lifting_workout_mutation(
    'b4333333-3333-4333-8333-333333333333', (select workout_id from phase64b_ids), 'COPY_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64b_ids), 'expectedRevision', 1)
  ) ->> 'resultId')::uuid,
  (select copied_set_id from phase64b_ids),
  'replaying copy set returns the original copied-set id'
);
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_one_id from phase64b_ids)), 2, 'replaying copy set cannot create a second copy');

select public.apply_lifting_workout_mutation(
  'b4444444-4444-4444-8444-444444444444', (select workout_id from phase64b_ids), 'REMOVE_SET',
  jsonb_build_object('workoutSetId', (select copied_set_id from phase64b_ids), 'expectedRevision', 0)
);
select public.apply_lifting_workout_mutation(
  'b4444444-4444-4444-8444-444444444444', (select workout_id from phase64b_ids), 'REMOVE_SET',
  jsonb_build_object('workoutSetId', (select copied_set_id from phase64b_ids), 'expectedRevision', 0)
);
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_one_id from phase64b_ids)), 1, 'replaying a remove does not fail or delete another set');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'b4111111-1111-4111-8111-111111111111', (select workout_id from phase64b_ids), 'ADD_SET',
    jsonb_build_object('workoutExerciseId', (select exercise_one_id from phase64b_ids), 'setType', 'WARMUP')
  )$$,
  '22023', 'Idempotency key was already used for a different workout mutation',
  'an idempotency key cannot be reused with changed payload'
);

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'b4555555-5555-4555-8555-555555555555', (select workout_id from phase64b_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64b_ids), 'setType', 'WORKING', 'weightKg', -5, 'reps', 5, 'bodyweightMode', null, 'completed', false, 'expectedRevision', (select revision from public.workout_sets where id=(select set_one_id from phase64b_ids)))
  )$$,
  '22023', 'Weight is out of range',
  'validation failures remain terminal instead of becoming successful receipts'
);
reset role;
select is((select count(*)::integer from public.workout_mutation_receipts where idempotency_key='b4555555-5555-4555-8555-555555555555'), 0, 'failed mutation does not leave a misleading success receipt');
set local role authenticated;
set local request.jwt.claim.sub = 'd4111111-1111-4111-8111-111111111111';

set local request.jwt.claim.sub = 'd4222222-2222-4222-8222-222222222222';
select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'c4111111-1111-4111-8111-111111111111', (select workout_id from phase64b_ids), 'ADD_SET',
    jsonb_build_object('workoutExerciseId', (select exercise_one_id from phase64b_ids), 'setType', 'WORKING')
  )$$,
  '42501', 'Active lifting workout not found',
  'another user cannot attach an idempotency receipt to the owner workout'
);

set local request.jwt.claim.sub = 'd4111111-1111-4111-8111-111111111111';
reset role;
select is((select count(*)::integer from public.workout_mutation_receipts where user_id='d4111111-1111-4111-8111-111111111111'), 7, 'successful unique mutations create one receipt each');
select is((select count(*)::integer from public.workout_mutation_receipts where completed_at is not null), 7, 'successful receipts are marked complete');
select is((select count(*)::integer from public.workout_mutation_receipts where result_payload is not null), 7, 'successful receipts retain result payloads');

reset role;
select * from finish();
rollback;

-- ========================================
-- 020_workout_conflict_safety.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

select has_column('public', 'workout_exercises', 'revision', 'workout exercises expose a conflict revision');
select has_column('public', 'workout_sets', 'revision', 'workout sets expose a conflict revision');
select has_function('public', 'bump_workout_row_revision', array[]::text[], 'row revision trigger function exists');
select has_function('public', 'apply_lifting_workout_mutation', array['uuid','uuid','text','jsonb'], 'mutation gateway remains the write boundary');
select is(has_function_privilege('authenticated', 'public.apply_lifting_workout_mutation(uuid,uuid,text,jsonb)', 'execute'), true, 'authenticated keeps gateway execute access');

insert into auth.users (id, email) values
  ('e5111111-1111-4111-8111-111111111111', 'conflict-owner@test.local');

insert into public.exercise_catalog (id, canonical_name, measurement_type, active) values
  ('ee511111-1111-4111-8111-111111111111', 'Conflict Bench Press', 'WEIGHT_REPS', true),
  ('ee522222-2222-4222-8222-222222222222', 'Conflict Row', 'WEIGHT_REPS', true);

set local role authenticated;
set local request.jwt.claim.sub = 'e5111111-1111-4111-8111-111111111111';

create temporary table phase64c_ids(
  workout_id uuid,
  second_workout_id uuid,
  exercise_one_id uuid,
  exercise_two_id uuid,
  set_one_id uuid,
  copied_set_id uuid,
  second_set_id uuid,
  set_one_revision bigint
) on commit drop;

insert into phase64c_ids(workout_id) values (public.start_or_resume_lifting_workout());

update phase64c_ids
set exercise_one_id = (public.apply_lifting_workout_mutation(
  'd5111111-1111-4111-8111-111111111111', workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'ee511111-1111-4111-8111-111111111111')
) ->> 'resultId')::uuid,
exercise_two_id = (public.apply_lifting_workout_mutation(
  'd5222222-2222-4222-8222-222222222222', workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'ee522222-2222-4222-8222-222222222222')
) ->> 'resultId')::uuid;

select is((select revision from public.workout_exercises where id=(select exercise_one_id from phase64c_ids)), 0::bigint, 'new exercise starts at revision zero');
select is((select revision from public.workout_exercises where id=(select exercise_two_id from phase64c_ids)), 0::bigint, 'second new exercise starts at revision zero');

select public.apply_lifting_workout_mutation(
  'd5333333-3333-4333-8333-333333333333', (select workout_id from phase64c_ids), 'MOVE_EXERCISE',
  jsonb_build_object('workoutExerciseId', (select exercise_two_id from phase64c_ids), 'newOrderIndex', 0, 'expectedRevision', 0)
);

select results_eq(
  $$select exercise_id::text from public.workout_exercises where workout_id=(select workout_id from phase64c_ids) order by order_index$$,
  array['ee522222-2222-4222-8222-222222222222'::text, 'ee511111-1111-4111-8111-111111111111'::text],
  'revision-matched move changes authoritative order'
);
select cmp_ok((select revision from public.workout_exercises where id=(select exercise_two_id from phase64c_ids)), '>', 0::bigint, 'exercise revision advances after reorder');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'd5444444-4444-4444-8444-444444444444', (select workout_id from phase64c_ids), 'MOVE_EXERCISE',
    jsonb_build_object('workoutExerciseId', (select exercise_two_id from phase64c_ids), 'newOrderIndex', 1, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Exercise order changed on the server.',
  'stale exercise reorder is rejected as a conflict'
);
select results_eq(
  $$select exercise_id::text from public.workout_exercises where workout_id=(select workout_id from phase64c_ids) order by order_index$$,
  array['ee522222-2222-4222-8222-222222222222'::text, 'ee511111-1111-4111-8111-111111111111'::text],
  'stale move cannot overwrite newer exercise order'
);

update phase64c_ids
set set_one_id = (public.apply_lifting_workout_mutation(
  'f5111111-1111-4111-8111-111111111111', workout_id, 'ADD_SET',
  jsonb_build_object('workoutExerciseId', exercise_one_id, 'setType', 'WORKING')
) ->> 'resultId')::uuid;

select is((select revision from public.workout_sets where id=(select set_one_id from phase64c_ids)), 0::bigint, 'new set starts at revision zero');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'f5000000-0000-4000-8000-000000000000', (select workout_id from phase64c_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 90, 'reps', 8, 'bodyweightMode', null, 'completed', false)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Queued change has no safe server revision.',
  'legacy destructive writes without a revision are surfaced as conflicts'
);
select is((select revision from public.workout_sets where id=(select set_one_id from phase64c_ids)), 0::bigint, 'unsafe legacy replay leaves the server set unchanged');

select public.apply_lifting_workout_mutation(
  'f5222222-2222-4222-8222-222222222222', (select workout_id from phase64c_ids), 'SAVE_SET',
  jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 100, 'reps', 5, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
);
select is((select revision from public.workout_sets where id=(select set_one_id from phase64c_ids)), 1::bigint, 'accepted set save advances the revision');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'f5333333-3333-4333-8333-333333333333', (select workout_id from phase64c_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 80, 'reps', 10, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Set changed on the server.',
  'stale set save is rejected instead of overwriting newer data'
);
select results_eq(
  $$select weight_kg::text || 'x' || reps::text from public.workout_sets where id=(select set_one_id from phase64c_ids)$$,
  array['100.000x5'::text],
  'newer set value survives a stale save attempt'
);

select is(
  (public.apply_lifting_workout_mutation(
    'f5222222-2222-4222-8222-222222222222', (select workout_id from phase64c_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 100, 'reps', 5, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
  ) ->> 'resultId')::uuid,
  (select set_one_id from phase64c_ids),
  'exact idempotent replay returns its receipt even after revision advances'
);

update phase64c_ids
set copied_set_id = (public.apply_lifting_workout_mutation(
  'f5444444-4444-4444-8444-444444444444', workout_id, 'COPY_SET',
  jsonb_build_object('workoutSetId', set_one_id, 'expectedRevision', 1)
) ->> 'resultId')::uuid;
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_one_id from phase64c_ids)), 2, 'revision-matched copy creates one set');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'f5555555-5555-4555-8555-555555555555', (select workout_id from phase64c_ids), 'COPY_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Set changed on the server.',
  'copying from a stale source revision is rejected'
);

select public.apply_lifting_workout_mutation(
  'f5666666-6666-4666-8666-666666666666', (select workout_id from phase64c_ids), 'REMOVE_SET',
  jsonb_build_object('workoutSetId', (select copied_set_id from phase64c_ids), 'expectedRevision', 0)
);
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_one_id from phase64c_ids)), 1, 'revision-matched delete removes only the intended set');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'f5777777-7777-4777-8777-777777777777', (select workout_id from phase64c_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select copied_set_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 70, 'reps', 8, 'bodyweightMode', null, 'completed', false, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Set was removed on the server.',
  'a stale edit cannot resurrect a deleted set'
);
select is((select count(*)::integer from public.workout_sets where id=(select copied_set_id from phase64c_ids)), 0, 'deleted set remains deleted after stale replay');

update phase64c_ids
set set_one_revision = (select revision from public.workout_sets where id=set_one_id);

select public.apply_lifting_workout_mutation(
  'f5888888-8888-4888-8888-888888888888', (select workout_id from phase64c_ids), 'SAVE_SET',
  jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 102.5, 'reps', 4, 'bodyweightMode', null, 'completed', true, 'expectedRevision', (select set_one_revision from phase64c_ids))
);
select cmp_ok(
  (select revision from public.workout_sets where id=(select set_one_id from phase64c_ids)),
  '>',
  (select set_one_revision from phase64c_ids),
  'accepted later save advances from the current server revision'
);

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'f5999999-9999-4999-8999-999999999999', (select workout_id from phase64c_ids), 'REMOVE_SET',
    jsonb_build_object('workoutSetId', (select set_one_id from phase64c_ids), 'expectedRevision', (select set_one_revision from phase64c_ids))
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Set changed on the server.',
  'stale destructive delete cannot erase a newer set edit'
);
select is((select count(*)::integer from public.workout_sets where id=(select set_one_id from phase64c_ids)), 1, 'set remains after stale destructive delete');

select public.finish_lifting_workout((select workout_id from phase64c_ids));
select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'fa111111-1111-4111-8111-111111111111', (select workout_id from phase64c_ids), 'ADD_SET',
    jsonb_build_object('workoutExerciseId', (select exercise_one_id from phase64c_ids), 'setType', 'WORKING')
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Workout is no longer active on the server.',
  'completed workout rejects later queued capture mutations as conflicts'
);
select is((select status::text from public.workout_sessions where id=(select workout_id from phase64c_ids)), 'COMPLETED', 'completed workout remains immutable');

update phase64c_ids set second_workout_id = public.start_or_resume_lifting_workout();
update phase64c_ids
set exercise_one_id = (public.apply_lifting_workout_mutation(
  'fa222222-2222-4222-8222-222222222222', second_workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'ee511111-1111-4111-8111-111111111111')
) ->> 'resultId')::uuid;
update phase64c_ids
set second_set_id = (public.apply_lifting_workout_mutation(
  'fa333333-3333-4333-8333-333333333333', second_workout_id, 'ADD_SET',
  jsonb_build_object('workoutExerciseId', exercise_one_id, 'setType', 'WORKING')
) ->> 'resultId')::uuid;
select public.cancel_lifting_workout((select second_workout_id from phase64c_ids));

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'fa444444-4444-4444-8444-444444444444', (select second_workout_id from phase64c_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select second_set_id from phase64c_ids), 'setType', 'WORKING', 'weightKg', 50, 'reps', 10, 'bodyweightMode', null, 'completed', false, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Workout is no longer active on the server.',
  'cancelled workout rejects queued edits as conflicts'
);
select is((select status::text from public.workout_sessions where id=(select second_workout_id from phase64c_ids)), 'CANCELLED', 'cancelled workout remains immutable');

reset role;
select is((select count(*)::integer from public.workout_mutation_receipts where user_id='e5111111-1111-4111-8111-111111111111' and result_payload is not null), 10, 'only successful unique mutations create completed receipts');

select * from finish();
rollback;

-- ========================================
-- 021_workout_reliability_gate.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

select has_function('public', 'apply_lifting_workout_mutation', array['uuid','uuid','text','jsonb'], 'reliability gate uses the idempotent conflict-aware mutation boundary');

insert into auth.users (id, email) values
  ('e6111111-1111-4111-8111-111111111111', 'reliability-owner@test.local');

insert into public.exercise_catalog (id, canonical_name, measurement_type, active) values
  ('ee611111-1111-4111-8111-111111111111', 'Reliability Bench Press', 'WEIGHT_REPS', true);

set local role authenticated;
set local request.jwt.claim.sub = 'e6111111-1111-4111-8111-111111111111';

create temporary table phase64d_ids(
  workout_id uuid,
  exercise_id uuid,
  set_id uuid,
  copied_set_id uuid,
  second_workout_id uuid,
  second_exercise_id uuid,
  second_set_id uuid
) on commit drop;

insert into phase64d_ids(workout_id) values (public.start_or_resume_lifting_workout());

update phase64d_ids
set exercise_id = (public.apply_lifting_workout_mutation(
  'd6111111-1111-4111-8111-111111111111', workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'ee611111-1111-4111-8111-111111111111')
) ->> 'resultId')::uuid;

update phase64d_ids
set set_id = (public.apply_lifting_workout_mutation(
  'd6222222-2222-4222-8222-222222222222', workout_id, 'ADD_SET',
  jsonb_build_object('workoutExerciseId', exercise_id, 'setType', 'WORKING')
) ->> 'resultId')::uuid;

select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_id from phase64d_ids)), 1, 'baseline capture creates exactly one set');

select public.apply_lifting_workout_mutation(
  'd6333333-3333-4333-8333-333333333333', (select workout_id from phase64d_ids), 'SAVE_SET',
  jsonb_build_object('workoutSetId', (select set_id from phase64d_ids), 'setType', 'WORKING', 'weightKg', 100, 'reps', 5, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
);

select is((select revision from public.workout_sets where id=(select set_id from phase64d_ids)), 1::bigint, 'first accepted save advances the set revision');
select results_eq(
  $$select weight_kg::text || 'x' || reps::text from public.workout_sets where id=(select set_id from phase64d_ids)$$,
  array['100.000x5'::text],
  'authoritative set contains the accepted save'
);

select is(
  (public.apply_lifting_workout_mutation(
    'd6333333-3333-4333-8333-333333333333', (select workout_id from phase64d_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select set_id from phase64d_ids), 'setType', 'WORKING', 'weightKg', 100, 'reps', 5, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
  ) ->> 'resultId')::uuid,
  (select set_id from phase64d_ids),
  'ambiguous retry returns the original save receipt'
);
select is((select revision from public.workout_sets where id=(select set_id from phase64d_ids)), 1::bigint, 'idempotent replay does not apply the save twice');

select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'd6444444-4444-4444-8444-444444444444', (select workout_id from phase64d_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select set_id from phase64d_ids), 'setType', 'WORKING', 'weightKg', 80, 'reps', 8, 'bodyweightMode', null, 'completed', true, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Set changed on the server.',
  'stale replay is stopped instead of overwriting the newer save'
);
select results_eq(
  $$select weight_kg::text || 'x' || reps::text from public.workout_sets where id=(select set_id from phase64d_ids)$$,
  array['100.000x5'::text],
  'newer authoritative set survives the stale retry'
);

update phase64d_ids
set copied_set_id = (public.apply_lifting_workout_mutation(
  'd6555555-5555-4555-8555-555555555555', workout_id, 'COPY_SET',
  jsonb_build_object('workoutSetId', set_id, 'expectedRevision', 1)
) ->> 'resultId')::uuid;
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_id from phase64d_ids)), 2, 'copy creates one additional set');

select public.apply_lifting_workout_mutation(
  'd6555555-5555-4555-8555-555555555555', (select workout_id from phase64d_ids), 'COPY_SET',
  jsonb_build_object('workoutSetId', (select set_id from phase64d_ids), 'expectedRevision', 1)
);
select is((select count(*)::integer from public.workout_sets where workout_exercise_id=(select exercise_id from phase64d_ids)), 2, 'duplicate copy delivery cannot create a third set');

select public.apply_lifting_workout_mutation(
  'd6666666-6666-4666-8666-666666666666', (select workout_id from phase64d_ids), 'REMOVE_SET',
  jsonb_build_object('workoutSetId', (select copied_set_id from phase64d_ids), 'expectedRevision', 0)
);
select is((select count(*)::integer from public.workout_sets where id=(select copied_set_id from phase64d_ids)), 0, 'destructive delete removes the intended copied set');
select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'd6777777-7777-4777-8777-777777777777', (select workout_id from phase64d_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select copied_set_id from phase64d_ids), 'setType', 'WORKING', 'weightKg', 70, 'reps', 10, 'bodyweightMode', null, 'completed', false, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Set was removed on the server.',
  'reconnect cannot resurrect a deleted set'
);

select public.finish_lifting_workout((select workout_id from phase64d_ids));
select is((select status::text from public.workout_sessions where id=(select workout_id from phase64d_ids)), 'COMPLETED', 'finished workout remains completed');
select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'd6888888-8888-4888-8888-888888888888', (select workout_id from phase64d_ids), 'ADD_SET',
    jsonb_build_object('workoutExerciseId', (select exercise_id from phase64d_ids), 'setType', 'WORKING')
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Workout is no longer active on the server.',
  'queued capture cannot mutate a workout finished on another device'
);

update phase64d_ids set second_workout_id = public.start_or_resume_lifting_workout();
update phase64d_ids
set second_exercise_id = (public.apply_lifting_workout_mutation(
  'd6999999-9999-4999-8999-999999999999', second_workout_id, 'ADD_EXERCISE',
  jsonb_build_object('exerciseId', 'ee611111-1111-4111-8111-111111111111')
) ->> 'resultId')::uuid;
update phase64d_ids
set second_set_id = (public.apply_lifting_workout_mutation(
  'da111111-1111-4111-8111-111111111111', second_workout_id, 'ADD_SET',
  jsonb_build_object('workoutExerciseId', second_exercise_id, 'setType', 'WORKING')
) ->> 'resultId')::uuid;
select public.cancel_lifting_workout((select second_workout_id from phase64d_ids));
select is((select status::text from public.workout_sessions where id=(select second_workout_id from phase64d_ids)), 'CANCELLED', 'cancelled workout remains cancelled');
select throws_ok(
  $$select public.apply_lifting_workout_mutation(
    'da222222-2222-4222-8222-222222222222', (select second_workout_id from phase64d_ids), 'SAVE_SET',
    jsonb_build_object('workoutSetId', (select second_set_id from phase64d_ids), 'setType', 'WORKING', 'weightKg', 50, 'reps', 10, 'bodyweightMode', null, 'completed', false, 'expectedRevision', 0)
  )$$,
  'P0001', 'WORKOUT_CONFLICT: Workout is no longer active on the server.',
  'queued capture cannot mutate a workout cancelled on another device'
);

reset role;
select is((select count(*)::integer from public.workout_mutation_receipts where user_id='e6111111-1111-4111-8111-111111111111' and result_payload is not null), 7, 'only successful unique writes produce completed receipts across the reliability journey');

select * from finish();
rollback;

-- ========================================
-- 022_authoritative_lifting_scoring.test.sql
-- ========================================

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

-- ========================================
-- 023_exercise_progress_history.test.sql
-- ========================================

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

-- ========================================
-- 024_weekly_consistency_badges.test.sql
-- ========================================

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

-- ========================================
-- 025_group_competition_social.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

select has_table('public', 'group_activity_reactions', 'group activity reactions table exists');
select has_function('public', 'get_group_competition_leaderboard', array['uuid','text','date'], 'group competition leaderboard RPC exists');
select has_function('public', 'get_group_social_feed', array['uuid','integer','timestamp with time zone','text'], 'group social feed RPC exists');
select has_function('public', 'set_group_activity_reaction', array['uuid','text','text'], 'group reaction RPC exists');

insert into auth.users (id, email) values
  ('81111111-1111-4111-8111-111111111111', 'phase10-owner@test.local'),
  ('82222222-2222-4222-8222-222222222222', 'phase10-member@test.local'),
  ('83333333-3333-4333-8333-333333333333', 'phase10-outsider@test.local');

update public.profiles set username='phase10_owner', display_name='Phase 10 Owner', timezone='America/Toronto', onboarding_completed_at=now()
where id='81111111-1111-4111-8111-111111111111';
update public.profiles set username='phase10_member', display_name='Phase 10 Member', timezone='America/Toronto', onboarding_completed_at=now()
where id='82222222-2222-4222-8222-222222222222';
update public.profiles set username='phase10_outsider', display_name='Phase 10 Outsider', timezone='America/Toronto', onboarding_completed_at=now()
where id='83333333-3333-4333-8333-333333333333';

insert into public.groups (id, name, created_by)
values ('80000000-0000-4000-8000-000000000001', 'Phase 10 Crew', '81111111-1111-4111-8111-111111111111');
insert into public.group_members (group_id, user_id, role, status)
values ('80000000-0000-4000-8000-000000000001', '82222222-2222-4222-8222-222222222222', 'MEMBER', 'ACTIVE');

insert into public.exercise_catalog (id, canonical_name, measurement_type)
values ('80000000-0000-4000-8000-000000000010', 'Phase 10 Bench Press', 'WEIGHT_REPS');

-- One real qualifying member lift produces authoritative current-week XP and a
-- summary-feed lift without exposing its raw sets.
insert into public.workout_sessions (
  id, user_id, category, status, source, started_at,
  active_duration_seconds, timezone_at_start, scoring_date
) values (
  '82000000-0000-4000-8000-000000000001',
  '82222222-2222-4222-8222-222222222222',
  'STRENGTH', 'IN_PROGRESS', 'IN_APP',
  (date_trunc('week', now() at time zone 'America/Toronto')::date + 1)::timestamp at time zone 'America/Toronto',
  0, 'America/Toronto',
  date_trunc('week', now() at time zone 'America/Toronto')::date + 1
);
insert into public.workout_exercises (id, workout_id, exercise_id, order_index)
values ('82000000-0000-4000-8000-000000000011', '82000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000010', 0);
insert into public.workout_sets (workout_exercise_id,set_number,set_type,weight_kg,reps,completed,completed_at) values
  ('82000000-0000-4000-8000-000000000011',1,'WORKING',80,5,true,now()-interval '20 minutes'),
  ('82000000-0000-4000-8000-000000000011',2,'WORKING',80,5,true,now()-interval '18 minutes'),
  ('82000000-0000-4000-8000-000000000011',3,'WORKING',80,5,true,now()-interval '16 minutes'),
  ('82000000-0000-4000-8000-000000000011',4,'WORKING',80,5,true,now()-interval '14 minutes');
update public.workout_sessions
set status='COMPLETED',
    ended_at=started_at + interval '45 minutes',
    active_duration_seconds=2700,
    subtype='Push day',
    notes='Private test note that must never enter the social feed.'
where id='82000000-0000-4000-8000-000000000001';

-- Owner leads this week, while older events make the member the all-time leader.
insert into public.scoring_events (user_id, scoring_date, exercise_id, event_type, amount, scoring_version) values
  ('81111111-1111-4111-8111-111111111111', date_trunc('week', now() at time zone 'America/Toronto')::date + 2, null, 'LIFTING_WORKOUT', 50, 'lifting-v1'),
  ('81111111-1111-4111-8111-111111111111', date_trunc('week', now() at time zone 'America/Toronto')::date + 2, '80000000-0000-4000-8000-000000000010', 'EXERCISE_PROGRESS', 15, 'lifting-v1'),
  ('81111111-1111-4111-8111-111111111111', date_trunc('week', now() at time zone 'America/Toronto')::date - 28, null, 'LIFTING_WORKOUT', 50, 'lifting-v1'),
  ('82222222-2222-4222-8222-222222222222', date_trunc('week', now() at time zone 'America/Toronto')::date - 28, null, 'LIFTING_WORKOUT', 50, 'lifting-v1'),
  ('82222222-2222-4222-8222-222222222222', date_trunc('week', now() at time zone 'America/Toronto')::date - 28, '80000000-0000-4000-8000-000000000010', 'EXERCISE_COMPLETE', 5, 'lifting-v1'),
  ('82222222-2222-4222-8222-222222222222', date_trunc('week', now() at time zone 'America/Toronto')::date - 28, '80000000-0000-4000-8000-000000000010', 'EXERCISE_PROGRESS', 15, 'lifting-v1'),
  ('82222222-2222-4222-8222-222222222222', date_trunc('week', now() at time zone 'America/Toronto')::date - 28, null, 'CARDIO_BONUS', 15, 'lifting-v1');

-- Stable manual observation history creates one real PR feed item. Observation
-- UUIDs are intentionally not part of the public activity key.
insert into public.workout_sessions (
  id,user_id,category,status,source,started_at,ended_at,active_duration_seconds,timezone_at_start,scoring_date
) values
  ('82000000-0000-4000-8000-000000000101','82222222-2222-4222-8222-222222222222','STRENGTH','COMPLETED','MANUAL',now()-interval '4 days',now()-interval '4 days'+interval '30 minutes',1800,'America/Toronto',(now() at time zone 'America/Toronto')::date-4),
  ('82000000-0000-4000-8000-000000000102','82222222-2222-4222-8222-222222222222','STRENGTH','COMPLETED','MANUAL',now()-interval '3 days',now()-interval '3 days'+interval '30 minutes',1800,'America/Toronto',(now() at time zone 'America/Toronto')::date-3);
insert into public.exercise_progress_observations (
  user_id,workout_id,exercise_id,metric_type,metric_value,weight_kg,reps,scoring_date,valid,created_at
) values
  ('82222222-2222-4222-8222-222222222222','82000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000010','E1RM',100,85,5,(now() at time zone 'America/Toronto')::date-4,true,now()-interval '4 days'),
  ('82222222-2222-4222-8222-222222222222','82000000-0000-4000-8000-000000000102','80000000-0000-4000-8000-000000000010','E1RM',110,90,5,(now() at time zone 'America/Toronto')::date-3,true,now()-interval '3 days');

insert into public.user_badges (user_id,badge_key,earned_at,metadata)
values ('82222222-2222-4222-8222-222222222222','FIRST_PR',now()-interval '2 days','{"count":1}'::jsonb)
on conflict (user_id,badge_key) do update set earned_at=excluded.earned_at, metadata=excluded.metadata;
insert into public.weekly_lifting_snapshots (user_id,week_start,target,lifting_days,achieved,finalized_at)
values ('82222222-2222-4222-8222-222222222222',date_trunc('week', now() at time zone 'America/Toronto')::date-7,2,2,true,now()-interval '1 day')
on conflict (user_id,week_start) do update set target=excluded.target,lifting_days=excluded.lifting_days,achieved=excluded.achieved,finalized_at=excluded.finalized_at;

set local role authenticated;
select set_config('request.jwt.claim.sub', '81111111-1111-4111-8111-111111111111', true);

select lives_ok(
  $$select * from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001','WEEK',null)$$,
  'active member can load weekly group competition'
);
select is(
  (select count(*)::integer from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001','WEEK',null)),
  2,
  'leaderboard contains active group members only'
);
select is(
  (select member_user_id from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001','WEEK',null) where rank=1 limit 1),
  '81111111-1111-4111-8111-111111111111'::uuid,
  'owner leads the seeded current week'
);
select is(
  (select xp from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001','WEEK',null) where member_user_id='81111111-1111-4111-8111-111111111111'),
  65::bigint,
  'weekly competition sums authoritative lifting-v1 XP'
);
select is(
  (select lifting_days from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001','WEEK',null) where member_user_id='82222222-2222-4222-8222-222222222222'),
  1::bigint,
  'weekly competition counts distinct authoritative lifting days'
);
select is(
  (select member_user_id from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001','ALL_TIME',null) where rank=1 limit 1),
  '82222222-2222-4222-8222-222222222222'::uuid,
  'older authoritative XP can produce a different all-time leader'
);
select is(
  (select period_start from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001','ALL_TIME',null) limit 1),
  null::date,
  'all-time competition has no artificial date boundary'
);
select throws_ok(
  $$select * from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001','MONTH',null)$$,
  '22023', null, 'unsupported competition periods are rejected'
);
select throws_ok(
  $$select * from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001','WEEK',date '2026-08-18')$$,
  '22023', null, 'weekly competition requires a Monday boundary'
);

select ok(exists(select 1 from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='LIFT'), 'feed includes qualifying lift summaries');
select ok(exists(select 1 from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='PR'), 'feed includes real PR summaries');
select ok(exists(select 1 from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='BADGE'), 'feed includes earned badges');
select ok(exists(select 1 from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='GOAL'), 'feed includes completed weekly goals');
select ok(not exists(
  select 1 from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null)
  where metadata ? 'sets' or metadata ? 'notes'
), 'social metadata never exposes raw sets or workout notes');
select ok(not exists(
  select 1 from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null)
  where metadata ? 'workoutId' or metadata ? 'exerciseId'
), 'social metadata does not leak source row identifiers');
select is(
  (select count(*)::integer from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',2,null,null)),
  2,
  'server-side feed limit is respected'
);
select throws_ok(
  $$select * from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,now(),null)$$,
  '22023', null, 'feed rejects partial cursor state'
);

select lives_ok(
  $$select public.set_group_activity_reaction(
    '80000000-0000-4000-8000-000000000001',
    (select activity_key from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='LIFT' limit 1),
    'FIRE'
  )$$,
  'member can react to a current privacy-safe group activity'
);
select is(
  (select fire_count+strong_count+clap_count from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='LIFT' limit 1),
  1::bigint,
  'one member reaction produces one total reaction'
);
select is(
  (select fire_count from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='LIFT' limit 1),
  1::bigint,
  'FIRE reaction is counted'
);
select is(
  (select my_reaction from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='LIFT' limit 1),
  'FIRE'::text,
  'feed identifies the requesting member reaction'
);
select lives_ok(
  $$select public.set_group_activity_reaction(
    '80000000-0000-4000-8000-000000000001',
    (select activity_key from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='LIFT' limit 1),
    'STRONG'
  )$$,
  'switching reaction updates the same member/activity slot'
);
select is(
  (select strong_count from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='LIFT' limit 1),
  1::bigint,
  'switched STRONG reaction is counted'
);
select is(
  (select fire_count from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='LIFT' limit 1),
  0::bigint,
  'switching reactions does not stack the old reaction'
);
select lives_ok(
  $$select public.set_group_activity_reaction(
    '80000000-0000-4000-8000-000000000001',
    (select activity_key from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='LIFT' limit 1),
    null
  )$$,
  'null reaction removes the requesting member reaction'
);
select is(
  (select fire_count+strong_count+clap_count from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='LIFT' limit 1),
  0::bigint,
  'reaction removal returns the activity to zero reactions'
);
select throws_ok(
  $$select public.set_group_activity_reaction(
    '80000000-0000-4000-8000-000000000001',
    (select activity_key from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null) where activity_type='LIFT' limit 1),
    'HEART'
  )$$,
  '22023', null, 'reaction catalog is intentionally bounded'
);
select throws_ok(
  $$select public.set_group_activity_reaction('80000000-0000-4000-8000-000000000001','LIFT:' || repeat('0',64),'FIRE')$$,
  '22023', null, 'invented opaque activity keys cannot receive reactions'
);
select throws_ok(
  $$insert into public.group_activity_reactions(group_id,activity_key,user_id,reaction_type)
    values('80000000-0000-4000-8000-000000000001','LIFT:' || repeat('1',64),'81111111-1111-4111-8111-111111111111','FIRE')$$,
  '42501', null, 'authenticated clients cannot directly mutate reaction rows'
);

select set_config('request.jwt.claim.sub', '83333333-3333-4333-8333-333333333333', true);
select throws_ok(
  $$select * from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001','WEEK',null)$$,
  '42501', null, 'outsiders cannot read group competition'
);
select throws_ok(
  $$select * from public.get_group_social_feed('80000000-0000-4000-8000-000000000001',20,null,null)$$,
  '42501', null, 'outsiders cannot read the social feed'
);
select throws_ok(
  $$select public.set_group_activity_reaction('80000000-0000-4000-8000-000000000001','LIFT:' || repeat('0',64),'FIRE')$$,
  '42501', null, 'outsiders cannot react in the group'
);

reset role;
select is(has_function_privilege('authenticated','public.get_group_competition_leaderboard(uuid,text,date)','execute'), true, 'authenticated role can execute competition RPC');
select is(has_function_privilege('authenticated','public.get_group_social_feed(uuid,integer,timestamp with time zone,text)','execute'), true, 'authenticated role can execute social feed RPC');
select is(has_function_privilege('authenticated','public.set_group_activity_reaction(uuid,text,text)','execute'), true, 'authenticated role can execute reaction RPC');
select is(has_function_privilege('anon','public.get_group_competition_leaderboard(uuid,text,date)','execute'), false, 'anonymous role cannot execute competition RPC');
select is(has_function_privilege('anon','public.get_group_social_feed(uuid,integer,timestamp with time zone,text)','execute'), false, 'anonymous role cannot execute social feed RPC');
select is(has_function_privilege('anon','public.set_group_activity_reaction(uuid,text,text)','execute'), false, 'anonymous role cannot execute reaction RPC');

select * from finish();
rollback;

-- ========================================
-- 026_cardio_accessory_logging.test.sql
-- ========================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

select has_function('public','log_cardio_activity',array['workout_category','integer','text'],'cardio logger RPC exists');
select has_function('public','delete_cardio_activity',array['uuid'],'cardio delete RPC exists');
select has_function('public','get_my_cardio_history',array['integer'],'cardio history RPC exists');
select has_function('public','get_my_cardio_summary',array[]::text[],'cardio summary RPC exists');

insert into auth.users (id,email) values
 ('a1111111-1111-4111-8111-111111111111','phase11a@test.local'),
 ('a2222222-2222-4222-8222-222222222222','phase11b@test.local');
update public.profiles set username='phase11a',display_name='Phase 11 A',timezone='UTC',onboarding_completed_at=now() where id='a1111111-1111-4111-8111-111111111111';
update public.profiles set username='phase11b',display_name='Phase 11 B',timezone='UTC',onboarding_completed_at=now() where id='a2222222-2222-4222-8222-222222222222';

set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);

select lives_ok($$select public.log_cardio_activity('RUNNING',1200,'easy run')$$,'running can be logged');
select lives_ok($$select public.log_cardio_activity('WALKING_HIKING',1800,'walk')$$,'walking/hiking can be logged');
select lives_ok($$select public.log_cardio_activity('CYCLING',2400,'ride')$$,'cycling can be logged');
select lives_ok($$select public.log_cardio_activity('SWIMMING',2700,'pool')$$,'swimming can be logged');
select lives_ok($$select public.log_cardio_activity('SPORT',1200,'hockey')$$,'sport can be logged');
select lives_ok($$select public.log_cardio_activity('CARDIO',1200,'machine')$$,'generic cardio can be logged');
select lives_ok($$select public.log_cardio_activity('HIIT',720,'intervals')$$,'HIIT can be logged');
select throws_ok($$select public.log_cardio_activity('STRENGTH',1200,null)$$,'22023',null,'strength cannot enter through cardio logger');
select throws_ok($$select public.log_cardio_activity('RUNNING',59,null)$$,'22023',null,'sub-minute cardio is rejected');
select throws_ok($$select public.log_cardio_activity('RUNNING',21601,null)$$,'22023',null,'over-six-hour cardio is rejected');
select throws_ok($$select public.log_cardio_activity('RUNNING',1200,repeat('x',5001))$$,'22023',null,'oversized notes are rejected');
select is((select count(*)::integer from public.get_my_cardio_history(50)),7,'history returns all seven supported logged activities');
select is((select count(*)::integer from public.get_my_cardio_history(3)),3,'history server limit parameter is respected');
select ok((select every(category <> 'STRENGTH') from public.get_my_cardio_history(50)),'cardio history excludes lifting sessions');
select ok((select bool_or(notes='easy run') from public.get_my_cardio_history(50)),'cardio history preserves optional notes');

reset role;
-- Normalize four activities onto one deterministic scoring date so best-of-day
-- bonus reconciliation can be asserted independently of test execution time.
update public.workout_sessions set started_at=(current_date + time '12:00') at time zone 'UTC',ended_at=((current_date + time '12:00') at time zone 'UTC') + interval '20 minutes',active_duration_seconds=1200 where user_id='a1111111-1111-4111-8111-111111111111' and category='RUNNING';
update public.workout_sessions set started_at=(current_date + time '13:00') at time zone 'UTC',ended_at=((current_date + time '13:00') at time zone 'UTC') + interval '30 minutes',active_duration_seconds=1800 where user_id='a1111111-1111-4111-8111-111111111111' and category='WALKING_HIKING';
update public.workout_sessions set started_at=(current_date + time '14:00') at time zone 'UTC',ended_at=((current_date + time '14:00') at time zone 'UTC') + interval '40 minutes',active_duration_seconds=2400 where user_id='a1111111-1111-4111-8111-111111111111' and category='CYCLING';
update public.workout_sessions set started_at=(current_date + time '15:00') at time zone 'UTC',ended_at=((current_date + time '15:00') at time zone 'UTC') + interval '45 minutes',active_duration_seconds=2700 where user_id='a1111111-1111-4111-8111-111111111111' and category='SWIMMING';

select is((select count(*)::integer from public.scoring_events where user_id='a1111111-1111-4111-8111-111111111111' and scoring_date=current_date and event_type='CARDIO_BONUS' and scoring_version='lifting-v1'),1,'same-day cardio creates exactly one bonus event');
select is((select amount from public.scoring_events where user_id='a1111111-1111-4111-8111-111111111111' and scoring_date=current_date and event_type='CARDIO_BONUS' and scoring_version='lifting-v1'),15,'45-minute eligible activity owns the 15 XP daily bonus');
select is((select w.category::text from public.scoring_events se join public.workout_sessions w on w.id=se.workout_id where se.user_id='a1111111-1111-4111-8111-111111111111' and se.scoring_date=current_date and se.event_type='CARDIO_BONUS'),'SWIMMING','daily bonus points at the best cardio source activity');
select is((select count(*)::integer from public.scoring_events where user_id='a1111111-1111-4111-8111-111111111111' and event_type='LIFTING_WORKOUT'),0,'cardio never manufactures lifting-workout XP');

set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
select is((select daily_bonus_xp from public.get_my_cardio_history(50) where category='SWIMMING'),15,'history identifies the activity currently owning the daily bonus');
select is((select daily_bonus_xp from public.get_my_cardio_history(50) where category='CYCLING'),0,'eligible lower-tier same-day activity does not stack XP');
select is((select total_activities::integer from public.get_my_cardio_summary()),7,'summary counts logged cardio activities');
select cmp_ok((select total_active_minutes from public.get_my_cardio_summary()),'>=',132::bigint,'summary aggregates cardio active minutes');
select cmp_ok((select last_30_days_bonus_xp from public.get_my_cardio_summary()),'>=',15::bigint,'summary aggregates authoritative recent cardio XP');
select lives_ok($$select public.delete_cardio_activity((select workout_id from public.get_my_cardio_history(50) where category='SWIMMING' limit 1))$$,'user can delete own cardio correction');
reset role;
select is((select amount from public.scoring_events where user_id='a1111111-1111-4111-8111-111111111111' and scoring_date=current_date and event_type='CARDIO_BONUS'),10,'deleting the best activity reconciles the day to the next cardio tier');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2222222-2222-4222-8222-222222222222',true);
select throws_ok($$select public.delete_cardio_activity((select id from public.workout_sessions where user_id='a1111111-1111-4111-8111-111111111111' and category='CYCLING' limit 1))$$,'22023',null,'another user cannot delete a cardio activity they do not own');
select is((select total_activities::integer from public.get_my_cardio_summary()),0,'summary is scoped to the authenticated user');
select is((select count(*)::integer from public.get_my_cardio_history(50)),0,'history is scoped to the authenticated user');
reset role;

select ok(not exists(select 1 from public.weekly_lifting_snapshots where user_id='a1111111-1111-4111-8111-111111111111' and lifting_days>0),'cardio logging does not create lifting-day weekly consistency');

select * from finish();
rollback;

-- ========================================
-- 027_lifting_calendar_summaries.test.sql
-- ========================================

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
