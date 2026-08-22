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
select has_function('public', 'accept_group_invite', array['uuid'], 'targeted invite acceptance RPC exists');
select has_function('public', 'remove_group_member', array['uuid','uuid'], 'remove member RPC exists');
select has_function('public', 'transfer_group_ownership', array['uuid','uuid'], 'ownership transfer RPC exists');
select has_function('public', 'leave_group', array['uuid'], 'leave group RPC exists');
select has_function('public', 'prepare_workout_session', array[]::text[], 'qualification trigger function exists');

select * from finish();
rollback;
