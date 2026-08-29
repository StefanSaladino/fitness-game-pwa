begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email)
values ('93000000-0000-4000-8000-000000000001', 'phase17-reset@test.local');

update public.profiles
set username='phase17_reset',
    display_name='Phase 17 Reset',
    timezone='America/Toronto',
    weekly_workout_target=4,
    onboarding_completed_at=now()
where id='93000000-0000-4000-8000-000000000001';

insert into public.notification_preferences(user_id, notifications_enabled, workout_reminders)
values ('93000000-0000-4000-8000-000000000001', true, true)
on conflict (user_id) do update set notifications_enabled=excluded.notifications_enabled, workout_reminders=excluded.workout_reminders;

insert into public.groups(id, name, created_by)
values ('93000000-0000-4000-8000-000000000010', 'Phase 17 Preserved Crew', '93000000-0000-4000-8000-000000000001');

insert into public.group_chat_messages(id, group_id, author_user_id, body)
values (
  '93000000-0000-4000-8000-000000000011',
  '93000000-0000-4000-8000-000000000010',
  '93000000-0000-4000-8000-000000000001',
  'This group chat survives the statistics reset.'
);

insert into public.group_chat_reactions(group_id, message_id, user_id, reaction_type)
values (
  '93000000-0000-4000-8000-000000000010',
  '93000000-0000-4000-8000-000000000011',
  '93000000-0000-4000-8000-000000000001',
  'FIRE'
);

insert into public.workout_sessions(
  id,user_id,category,status,source,started_at,ended_at,active_duration_seconds,timezone_at_start,scoring_date,qualifies_lifting
) values (
  '93000000-0000-4000-8000-000000000020',
  '93000000-0000-4000-8000-000000000001',
  'STRENGTH','COMPLETED','IN_APP',now()-interval '1 hour',now(),3600,'America/Toronto',date '2026-08-24',true
);

insert into public.workout_exercises(id, workout_id, exercise_id, order_index)
select
  '93000000-0000-4000-8000-000000000021',
  '93000000-0000-4000-8000-000000000020',
  id,
  0
from public.exercise_catalog
order by canonical_name
limit 1;

insert into public.workout_sets(id, workout_exercise_id, set_number, set_type, weight_kg, reps, completed, completed_at)
values (
  '93000000-0000-4000-8000-000000000022',
  '93000000-0000-4000-8000-000000000021',
  1,'WORKING',100,5,true,now()
);

insert into public.workout_mutation_receipts(user_id,idempotency_key,workout_id,mutation_kind,request_payload,result_payload,completed_at)
values (
  '93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000023',
  '93000000-0000-4000-8000-000000000020',
  'ADD_SET','{}'::jsonb,'{}'::jsonb,now()
);

insert into public.xp_events(user_id,scoring_date,workout_id,event_type,amount)
values (
  '93000000-0000-4000-8000-000000000001',date '2026-08-24',
  '93000000-0000-4000-8000-000000000020','DAILY_WORKOUT',100
);

insert into public.scoring_events(user_id,scoring_date,workout_id,event_type,amount,scoring_version)
values (
  '93000000-0000-4000-8000-000000000001',date '2026-08-24',
  '93000000-0000-4000-8000-000000000020','LIFTING_WORKOUT',50,'lifting-v1'
);

insert into public.performance_benchmarks(user_id,benchmark_key)
values ('93000000-0000-4000-8000-000000000001','phase17-reset-benchmark');

insert into public.performance_observations(
  user_id,workout_id,benchmark_key,metric_type,metric_value,higher_is_better,scoring_date
) values (
  '93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000020',
  'phase17-reset-benchmark','TIME_SECONDS',100,false,date '2026-08-24'
);

insert into public.exercise_progress(user_id,exercise_id,metric_type,best_value,best_weight_kg,best_reps,source_workout_id,achieved_at)
select
  '93000000-0000-4000-8000-000000000001',id,'E1RM',100,90,5,
  '93000000-0000-4000-8000-000000000020',now()
from public.exercise_catalog
order by canonical_name
limit 1;

insert into public.exercise_progress_observations(
  user_id,workout_id,exercise_id,metric_type,metric_value,weight_kg,reps,scoring_date,valid
)
select
  '93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000020',id,'E1RM',100,90,5,date '2026-08-24',true
from public.exercise_catalog
order by canonical_name
limit 1;

insert into public.weekly_goals(user_id,week_start,target)
values ('93000000-0000-4000-8000-000000000001',date '2026-08-24',4);

insert into public.weekly_lifting_snapshots(user_id,week_start,target,lifting_days,achieved)
values ('93000000-0000-4000-8000-000000000001',date '2026-08-24',4,4,true);

insert into public.lifting_consistency_state(user_id,current_completed_week_streak,best_completed_week_streak,completed_weeks,goals_hit)
values ('93000000-0000-4000-8000-000000000001',3,3,3,3);

insert into public.user_badges(user_id,badge_key,metadata)
values ('93000000-0000-4000-8000-000000000001','FIRST_PR','{"phase17":true}'::jsonb);

insert into public.group_activity_reactions(group_id,activity_key,user_id,reaction_type)
values (
  '93000000-0000-4000-8000-000000000010',
  'LIFT:phase17-reset-activity',
  '93000000-0000-4000-8000-000000000001',
  'FIRE'
);

select set_config('test.phase17_exercise_catalog_count', (select count(*)::text from public.exercise_catalog), true);

-- This block intentionally mirrors the checked-in operator reset. The structural
-- Phase 17.3 validator enforces the same exact DELETE target set in both files.
delete from public.group_activity_reactions;
delete from public.workout_sets;
delete from public.workout_mutation_receipts;
delete from public.exercise_progress_observations;
delete from public.performance_observations;
delete from public.performance_benchmarks;
delete from public.workout_exercises;
delete from public.exercise_progress;
delete from public.scoring_events;
delete from public.xp_events;
delete from public.weekly_lifting_snapshots;
delete from public.lifting_consistency_state;
delete from public.user_badges;
delete from public.weekly_goals;
delete from public.workout_sessions;

select is((select count(*)::bigint from public.group_activity_reactions),0::bigint,'release reset clears derived group activity reactions');
select is((select count(*)::bigint from public.workout_sets),0::bigint,'release reset clears workout sets');
select is((select count(*)::bigint from public.workout_mutation_receipts),0::bigint,'release reset clears workout mutation receipts');
select is((select count(*)::bigint from public.exercise_progress_observations),0::bigint,'release reset clears exercise progress observations');
select is((select count(*)::bigint from public.performance_observations),0::bigint,'release reset clears performance observations');
select is((select count(*)::bigint from public.performance_benchmarks),0::bigint,'release reset clears per-user performance benchmark state');
select is((select count(*)::bigint from public.workout_exercises),0::bigint,'release reset clears workout exercises');
select is((select count(*)::bigint from public.exercise_progress),0::bigint,'release reset clears exercise progress summaries');
select is((select count(*)::bigint from public.scoring_events),0::bigint,'release reset clears authoritative scoring events');
select is((select count(*)::bigint from public.xp_events),0::bigint,'release reset clears legacy XP events');
select is((select count(*)::bigint from public.weekly_lifting_snapshots),0::bigint,'release reset clears weekly lifting snapshots');
select is((select count(*)::bigint from public.lifting_consistency_state),0::bigint,'release reset clears consistency state');
select is((select count(*)::bigint from public.user_badges),0::bigint,'release reset clears earned badges');
select is((select count(*)::bigint from public.weekly_goals),0::bigint,'release reset clears historical weekly goal rows');
select is((select count(*)::bigint from public.workout_sessions),0::bigint,'release reset clears workout sessions');

select is((select count(*)::bigint from auth.users where id='93000000-0000-4000-8000-000000000001'),1::bigint,'release reset preserves the auth account');
select is((select weekly_workout_target::integer from public.profiles where id='93000000-0000-4000-8000-000000000001'),4,'release reset preserves profile training preferences');
select is((select notifications_enabled from public.notification_preferences where user_id='93000000-0000-4000-8000-000000000001'),true,'release reset preserves notification preferences');
select is((select count(*)::bigint from public.groups where id='93000000-0000-4000-8000-000000000010'),1::bigint,'release reset preserves groups');
select is((select count(*)::bigint from public.group_members where group_id='93000000-0000-4000-8000-000000000010'),1::bigint,'release reset preserves group membership');
select is((select body from public.group_chat_messages where id='93000000-0000-4000-8000-000000000011'),'This group chat survives the statistics reset.','release reset preserves group chat');
select is((select reaction_type from public.group_chat_reactions where message_id='93000000-0000-4000-8000-000000000011'),'FIRE','release reset preserves group chat reactions');
select is((select count(*)::bigint from public.exercise_catalog), current_setting('test.phase17_exercise_catalog_count')::bigint, 'release reset preserves the exercise catalogue');
select is((select status::text from private.platform_account_state where user_id='93000000-0000-4000-8000-000000000001'),'ACTIVE','release reset preserves platform account state');

select * from finish();
rollback;
