begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

select has_table('public', 'group_activity_reactions', 'group activity reactions table exists');
select has_function('public', 'get_group_competition_leaderboard', array['uuid'], 'weekly-only group competition leaderboard RPC exists');
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

-- Owner leads this week; older events must not affect the weekly group board.
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
  $$select * from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001')$$,
  'active member can load weekly group competition'
);
select is(
  (select count(*)::integer from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001')),
  2,
  'leaderboard contains active group members only'
);
select is(
  (select member_user_id from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001') where rank=1 limit 1),
  '81111111-1111-4111-8111-111111111111'::uuid,
  'owner leads the seeded current week'
);
select is(
  (select xp from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001') where member_user_id='81111111-1111-4111-8111-111111111111'),
  65::bigint,
  'weekly competition sums authoritative lifting-v1 XP'
);
select is(
  (select lifting_days from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001') where member_user_id='82222222-2222-4222-8222-222222222222'),
  1::bigint,
  'weekly competition counts distinct authoritative lifting days'
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
  $$select * from public.get_group_competition_leaderboard('80000000-0000-4000-8000-000000000001')$$,
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
select is(has_function_privilege('authenticated','public.get_group_competition_leaderboard(uuid)','execute'), true, 'authenticated role can execute competition RPC');
select is(has_function_privilege('authenticated','public.get_group_social_feed(uuid,integer,timestamp with time zone,text)','execute'), true, 'authenticated role can execute social feed RPC');
select is(has_function_privilege('authenticated','public.set_group_activity_reaction(uuid,text,text)','execute'), true, 'authenticated role can execute reaction RPC');
select is(has_function_privilege('anon','public.get_group_competition_leaderboard(uuid)','execute'), false, 'anonymous role cannot execute competition RPC');
select is(has_function_privilege('anon','public.get_group_social_feed(uuid,integer,timestamp with time zone,text)','execute'), false, 'anonymous role cannot execute social feed RPC');
select is(has_function_privilege('anon','public.set_group_activity_reaction(uuid,text,text)','execute'), false, 'anonymous role cannot execute reaction RPC');

select * from finish();
rollback;
