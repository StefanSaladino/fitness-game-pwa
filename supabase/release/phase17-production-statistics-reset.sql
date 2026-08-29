-- Top Set Phase 17 production statistics reset.
--
-- SAFETY CONTRACT
-- 1. This file is intentionally NOT a migration and must never be run by db push.
-- 2. Phase 17.3 only builds/tests this file. Do not execute it against hosted production.
-- 3. In Phase 17.8, take the required manual backup/export and freeze the release commit first.
-- 4. The checked-in file fails closed because the confirmation value below is a placeholder.
-- 5. Even after the confirmation is deliberately replaced, the checked-in file still ends in ROLLBACK.
-- 6. Production execution requires two deliberate operator edits in Phase 17.8:
--      a) replace the placeholder with RESET_TOP_SET_PRODUCTION_STATISTICS_2026
--      b) replace the final ROLLBACK with COMMIT only after reviewing the dry-run output

begin isolation level repeatable read;
set local lock_timeout = '10s';
set local statement_timeout = '5min';

select set_config(
  'app.phase17_reset_confirmation',
  'REPLACE_ME_DO_NOT_RUN_IN_PHASE17_3',
  true
);

do $$
begin
  if current_setting('app.phase17_reset_confirmation', true) <> 'RESET_TOP_SET_PRODUCTION_STATISTICS_2026' then
    raise exception 'Phase 17 production statistics reset confirmation is missing';
  end if;
end;
$$;

-- Block concurrent training/statistics writes while the reset transaction is active.
lock table
  public.group_activity_reactions,
  public.workout_sets,
  public.workout_mutation_receipts,
  public.exercise_progress_observations,
  public.performance_observations,
  public.performance_benchmarks,
  public.workout_exercises,
  public.exercise_progress,
  public.scoring_events,
  public.xp_events,
  public.weekly_lifting_snapshots,
  public.lifting_consistency_state,
  public.user_badges,
  public.weekly_goals,
  public.workout_sessions
in access exclusive mode;

create temporary table phase17_reset_before_counts (
  table_name text primary key,
  row_count bigint not null
) on commit drop;

insert into phase17_reset_before_counts(table_name, row_count)
select 'group_activity_reactions', count(*) from public.group_activity_reactions union all
select 'workout_sets', count(*) from public.workout_sets union all
select 'workout_mutation_receipts', count(*) from public.workout_mutation_receipts union all
select 'exercise_progress_observations', count(*) from public.exercise_progress_observations union all
select 'performance_observations', count(*) from public.performance_observations union all
select 'performance_benchmarks', count(*) from public.performance_benchmarks union all
select 'workout_exercises', count(*) from public.workout_exercises union all
select 'exercise_progress', count(*) from public.exercise_progress union all
select 'scoring_events', count(*) from public.scoring_events union all
select 'xp_events', count(*) from public.xp_events union all
select 'weekly_lifting_snapshots', count(*) from public.weekly_lifting_snapshots union all
select 'lifting_consistency_state', count(*) from public.lifting_consistency_state union all
select 'user_badges', count(*) from public.user_badges union all
select 'weekly_goals', count(*) from public.weekly_goals union all
select 'workout_sessions', count(*) from public.workout_sessions;

create temporary table phase17_preserved_before_counts (
  table_name text primary key,
  row_count bigint not null
) on commit drop;

insert into phase17_preserved_before_counts(table_name, row_count)
select 'auth.users', count(*) from auth.users union all
select 'public.profiles', count(*) from public.profiles union all
select 'public.notification_preferences', count(*) from public.notification_preferences union all
select 'public.exercise_catalog', count(*) from public.exercise_catalog union all
select 'public.groups', count(*) from public.groups union all
select 'public.group_members', count(*) from public.group_members union all
select 'public.group_invites', count(*) from public.group_invites union all
select 'public.group_chat_messages', count(*) from public.group_chat_messages union all
select 'public.group_chat_reactions', count(*) from public.group_chat_reactions union all
select 'private.platform_account_state', count(*) from private.platform_account_state union all
select 'private.platform_admins', count(*) from private.platform_admins union all
select 'private.platform_admin_audit_log', count(*) from private.platform_admin_audit_log union all
select 'private.platform_messages', count(*) from private.platform_messages union all
select 'private.moderation_cases', count(*) from private.moderation_cases union all
select 'private.user_reports', count(*) from private.user_reports union all
select 'private.platform_capacity_allowances', count(*) from private.platform_capacity_allowances union all
select 'private.push_subscriptions', count(*) from private.push_subscriptions;

-- PHASE17_RESET_DELETE_BLOCK_START
-- Derived social reactions are tied to activity that is being wiped.
delete from public.group_activity_reactions;

-- Workout children and mutation receipts first.
delete from public.workout_sets;
delete from public.workout_mutation_receipts;
delete from public.exercise_progress_observations;
delete from public.performance_observations;
delete from public.performance_benchmarks;
delete from public.workout_exercises;

-- User-level training/scoring derivations.
delete from public.exercise_progress;
delete from public.scoring_events;
delete from public.xp_events;
delete from public.weekly_lifting_snapshots;
delete from public.lifting_consistency_state;
delete from public.user_badges;

-- Weekly goal rows are historical derived state. Profile target preferences are preserved.
delete from public.weekly_goals;

-- Parent workout rows last.
delete from public.workout_sessions;
-- PHASE17_RESET_DELETE_BLOCK_END

do $$
begin
  if exists(select 1 from public.group_activity_reactions) or
     exists(select 1 from public.workout_sets) or
     exists(select 1 from public.workout_mutation_receipts) or
     exists(select 1 from public.exercise_progress_observations) or
     exists(select 1 from public.performance_observations) or
     exists(select 1 from public.performance_benchmarks) or
     exists(select 1 from public.workout_exercises) or
     exists(select 1 from public.exercise_progress) or
     exists(select 1 from public.scoring_events) or
     exists(select 1 from public.xp_events) or
     exists(select 1 from public.weekly_lifting_snapshots) or
     exists(select 1 from public.lifting_consistency_state) or
     exists(select 1 from public.user_badges) or
     exists(select 1 from public.weekly_goals) or
     exists(select 1 from public.workout_sessions) then
    raise exception 'Phase 17 reset verification failed: statistical rows remain';
  end if;
end;
$$;

-- Verify representative preserved identity/configuration/social/admin rows were not changed by the reset.
do $$
declare
  v_mismatch text;
begin
  with after_counts(table_name, row_count) as (
    select 'auth.users', count(*) from auth.users union all
    select 'public.profiles', count(*) from public.profiles union all
    select 'public.notification_preferences', count(*) from public.notification_preferences union all
    select 'public.exercise_catalog', count(*) from public.exercise_catalog union all
        select 'public.groups', count(*) from public.groups union all
    select 'public.group_members', count(*) from public.group_members union all
    select 'public.group_invites', count(*) from public.group_invites union all
    select 'public.group_chat_messages', count(*) from public.group_chat_messages union all
    select 'public.group_chat_reactions', count(*) from public.group_chat_reactions union all
    select 'private.platform_account_state', count(*) from private.platform_account_state union all
    select 'private.platform_admins', count(*) from private.platform_admins union all
    select 'private.platform_admin_audit_log', count(*) from private.platform_admin_audit_log union all
    select 'private.platform_messages', count(*) from private.platform_messages union all
    select 'private.moderation_cases', count(*) from private.moderation_cases union all
    select 'private.user_reports', count(*) from private.user_reports union all
    select 'private.platform_capacity_allowances', count(*) from private.platform_capacity_allowances union all
    select 'private.push_subscriptions', count(*) from private.push_subscriptions
  )
  select b.table_name into v_mismatch
  from phase17_preserved_before_counts b
  join after_counts a using (table_name)
  where a.row_count <> b.row_count
  limit 1;

  if v_mismatch is not null then
    raise exception 'Phase 17 preservation verification failed for %', v_mismatch;
  end if;
end;
$$;

select table_name, row_count as rows_that_would_be_removed
from phase17_reset_before_counts
order by table_name;

-- SAFE DEFAULT. Keep this ROLLBACK during Phase 17.3 and the Phase 17.8 dry run.
rollback;
