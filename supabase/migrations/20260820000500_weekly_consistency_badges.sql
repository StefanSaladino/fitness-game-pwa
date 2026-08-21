-- Fitness Game PWA — Phase 9 weekly lifting consistency + badges (v0.8.0)
-- Persists completed-week lifting-goal snapshots and non-XP badge milestones.
-- Source of truth remains docs/DOMAIN-RULES.md; badges never write scoring_events.

alter table public.profiles
  add column if not exists pending_weekly_workout_target_week_start date;

update public.profiles p
set pending_weekly_workout_target_week_start = (
  (now() at time zone p.timezone)::date
  - (extract(isodow from (now() at time zone p.timezone)::date)::integer - 1)
  + 7
)
where p.pending_weekly_workout_target is not null
  and p.pending_weekly_workout_target_week_start is null;

alter table public.profiles
  drop constraint if exists profiles_pending_weekly_target_pair_check;
alter table public.profiles
  add constraint profiles_pending_weekly_target_pair_check check (
    (pending_weekly_workout_target is null and pending_weekly_workout_target_week_start is null)
    or
    (pending_weekly_workout_target is not null and pending_weekly_workout_target_week_start is not null)
  );

alter table public.profiles
  drop constraint if exists profiles_pending_weekly_target_monday_check;
alter table public.profiles
  add constraint profiles_pending_weekly_target_monday_check check (
    pending_weekly_workout_target_week_start is null
    or extract(isodow from pending_weekly_workout_target_week_start) = 1
  );

comment on column public.profiles.pending_weekly_workout_target_week_start is
  'Monday on which pending_weekly_workout_target becomes the active lifting-day target.';

create or replace function public.normalize_pending_weekly_target_boundary()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_today date;
  v_current_week_start date;
begin
  if new.pending_weekly_workout_target is null then
    new.pending_weekly_workout_target_week_start := null;
    return new;
  end if;

  if new.pending_weekly_workout_target_week_start is null then
    v_today := (now() at time zone new.timezone)::date;
    v_current_week_start := v_today - (extract(isodow from v_today)::integer - 1);
    new.pending_weekly_workout_target_week_start := v_current_week_start + 7;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_normalize_pending_weekly_target_boundary on public.profiles;
create trigger profiles_normalize_pending_weekly_target_boundary
before insert or update of pending_weekly_workout_target, pending_weekly_workout_target_week_start, timezone
on public.profiles
for each row execute function public.normalize_pending_weekly_target_boundary();

create table if not exists public.weekly_lifting_snapshots (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  target smallint not null check (target between 1 and 7),
  lifting_days smallint not null check (lifting_days between 0 and 7),
  achieved boolean not null,
  finalized_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start),
  check (extract(isodow from week_start) = 1),
  check (achieved = (lifting_days >= target))
);

create table if not exists public.lifting_consistency_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_completed_week_streak integer not null default 0 check (current_completed_week_streak >= 0),
  best_completed_week_streak integer not null default 0 check (best_completed_week_streak >= 0),
  completed_weeks integer not null default 0 check (completed_weeks >= 0),
  goals_hit integer not null default 0 check (goals_hit >= 0 and goals_hit <= completed_weeks),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, badge_key),
  constraint user_badges_key_check check (badge_key in (
    'FIRST_PR',
    'PR_5',
    'PR_10',
    'PR_25',
    'LIFT_DAYS_5',
    'LIFT_DAYS_10',
    'LIFT_DAYS_25',
    'LIFT_DAYS_50',
    'GOAL_WEEK_1',
    'GOAL_STREAK_2',
    'GOAL_STREAK_4',
    'GOAL_STREAK_8',
    'CARDIO_BONUS_DAYS_5',
    'CARDIO_BONUS_DAYS_10'
  ))
);

comment on table public.weekly_lifting_snapshots is
  'Authoritative completed Monday-Sunday lifting-goal snapshots derived from lifting-v1 scoring events.';
comment on table public.lifting_consistency_state is
  'Derived completed-week streak state. Current in-progress week never increments this streak.';
comment on table public.user_badges is
  'Non-XP recognition milestones derived from authoritative lifting/progression history.';

alter table public.weekly_lifting_snapshots enable row level security;
alter table public.lifting_consistency_state enable row level security;
alter table public.user_badges enable row level security;

revoke all on public.weekly_lifting_snapshots from public, anon, authenticated;
revoke all on public.lifting_consistency_state from public, anon, authenticated;
revoke all on public.user_badges from public, anon, authenticated;

grant select on public.weekly_lifting_snapshots to authenticated;
grant select on public.lifting_consistency_state to authenticated;
grant select on public.user_badges to authenticated;

drop policy if exists weekly_lifting_snapshots_select_own on public.weekly_lifting_snapshots;
create policy weekly_lifting_snapshots_select_own
on public.weekly_lifting_snapshots
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists lifting_consistency_state_select_own on public.lifting_consistency_state;
create policy lifting_consistency_state_select_own
on public.lifting_consistency_state
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists user_badges_select_own on public.user_badges;
create policy user_badges_select_own
on public.user_badges
for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.sync_lifting_badge(
  p_user_id uuid,
  p_badge_key text,
  p_qualified boolean,
  p_earned_at timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_qualified then
    insert into public.user_badges (user_id, badge_key, earned_at, metadata)
    values (p_user_id, p_badge_key, coalesce(p_earned_at, now()), coalesce(p_metadata, '{}'::jsonb))
    on conflict (user_id, badge_key) do update
      set earned_at = excluded.earned_at,
          metadata = excluded.metadata;
  else
    delete from public.user_badges
    where user_id = p_user_id
      and badge_key = p_badge_key;
  end if;
end;
$$;

revoke all on function public.sync_lifting_badge(uuid, text, boolean, timestamptz, jsonb) from public, anon, authenticated;

create or replace function public.reconcile_weekly_lifting_consistency_for_user(
  p_user_id uuid,
  p_as_of_date date default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_today date;
  v_current_week_start date;
  v_first_week date;
  v_week date;
  v_carry_target smallint;
  v_existing_target smallint;
  v_lifting_days integer;
  v_current_streak integer := 0;
  v_best_streak integer := 0;
  v_running_streak integer := 0;
  v_completed_weeks integer := 0;
  v_goals_hit integer := 0;
  v_pr_count integer := 0;
  v_lifting_day_count integer := 0;
  v_cardio_bonus_day_count integer := 0;
  v_pr_times timestamptz[] := '{}'::timestamptz[];
  v_lifting_day_times timestamptz[] := '{}'::timestamptz[];
  v_cardio_day_times timestamptz[] := '{}'::timestamptz[];
  v_first_goal_at timestamptz;
  v_streak_2_at timestamptz;
  v_streak_4_at timestamptz;
  v_streak_8_at timestamptz;
  v_snapshot record;
begin
  if p_user_id is null then
    raise exception 'User id is required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('weekly-lifting-consistency:' || p_user_id::text, 0));

  select p.*
  into v_profile
  from public.profiles p
  where p.id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = '22023';
  end if;

  v_today := coalesce(p_as_of_date, (now() at time zone v_profile.timezone)::date);
  v_current_week_start := v_today - (extract(isodow from v_today)::integer - 1);

  if v_profile.pending_weekly_workout_target is not null
    and v_profile.pending_weekly_workout_target_week_start is null then
    v_profile.pending_weekly_workout_target_week_start := v_current_week_start + 7;
    update public.profiles
    set pending_weekly_workout_target_week_start = v_profile.pending_weekly_workout_target_week_start
    where id = p_user_id;
  end if;

  select min(wg.week_start)
  into v_first_week
  from public.weekly_goals wg
  where wg.user_id = p_user_id;

  v_first_week := coalesce(v_first_week, v_current_week_start);
  v_carry_target := v_profile.weekly_workout_target;

  select wg.target
  into v_existing_target
  from public.weekly_goals wg
  where wg.user_id = p_user_id
    and wg.week_start <= v_first_week
  order by wg.week_start desc
  limit 1;

  if found then
    v_carry_target := v_existing_target;
  end if;

  v_week := v_first_week;
  while v_week <= v_current_week_start loop
    select wg.target
    into v_existing_target
    from public.weekly_goals wg
    where wg.user_id = p_user_id
      and wg.week_start = v_week;

    if found then
      v_carry_target := v_existing_target;
    else
      if v_profile.pending_weekly_workout_target is not null
        and v_profile.pending_weekly_workout_target_week_start is not null
        and v_week >= v_profile.pending_weekly_workout_target_week_start then
        v_carry_target := v_profile.pending_weekly_workout_target;
      end if;

      insert into public.weekly_goals (user_id, week_start, target)
      values (p_user_id, v_week, v_carry_target)
      on conflict (user_id, week_start) do nothing;
    end if;

    if v_week < v_current_week_start then
      select count(*)::integer
      into v_lifting_days
      from public.scoring_events se
      where se.user_id = p_user_id
        and se.scoring_version = 'lifting-v1'
        and se.event_type = 'LIFTING_WORKOUT'
        and se.scoring_date between v_week and (v_week + 6);

      insert into public.weekly_lifting_snapshots (
        user_id,
        week_start,
        target,
        lifting_days,
        achieved,
        finalized_at
      ) values (
        p_user_id,
        v_week,
        v_carry_target,
        v_lifting_days,
        v_lifting_days >= v_carry_target,
        ((v_week + 7)::timestamp at time zone v_profile.timezone)
      )
      on conflict (user_id, week_start) do update
        set target = excluded.target,
            lifting_days = excluded.lifting_days,
            achieved = excluded.achieved,
            updated_at = now();
    end if;

    v_week := v_week + 7;
  end loop;

  if v_profile.pending_weekly_workout_target is not null
    and v_profile.pending_weekly_workout_target_week_start is not null
    and v_profile.pending_weekly_workout_target_week_start <= v_current_week_start then
    update public.profiles
    set weekly_workout_target = v_profile.pending_weekly_workout_target,
        pending_weekly_workout_target = null,
        pending_weekly_workout_target_week_start = null
    where id = p_user_id;
  end if;

  select count(*)::integer,
         count(*) filter (where wls.achieved)::integer
  into v_completed_weeks, v_goals_hit
  from public.weekly_lifting_snapshots wls
  where wls.user_id = p_user_id
    and wls.week_start < v_current_week_start;

  for v_snapshot in
    select wls.achieved
    from public.weekly_lifting_snapshots wls
    where wls.user_id = p_user_id
      and wls.week_start < v_current_week_start
    order by wls.week_start desc
  loop
    exit when not v_snapshot.achieved;
    v_current_streak := v_current_streak + 1;
  end loop;

  for v_snapshot in
    select wls.week_start, wls.achieved
    from public.weekly_lifting_snapshots wls
    where wls.user_id = p_user_id
      and wls.week_start < v_current_week_start
    order by wls.week_start
  loop
    if v_snapshot.achieved then
      v_running_streak := v_running_streak + 1;
      v_best_streak := greatest(v_best_streak, v_running_streak);
      if v_first_goal_at is null then
        v_first_goal_at := ((v_snapshot.week_start + 7)::timestamp at time zone v_profile.timezone);
      end if;
      if v_running_streak = 2 and v_streak_2_at is null then
        v_streak_2_at := ((v_snapshot.week_start + 7)::timestamp at time zone v_profile.timezone);
      end if;
      if v_running_streak = 4 and v_streak_4_at is null then
        v_streak_4_at := ((v_snapshot.week_start + 7)::timestamp at time zone v_profile.timezone);
      end if;
      if v_running_streak = 8 and v_streak_8_at is null then
        v_streak_8_at := ((v_snapshot.week_start + 7)::timestamp at time zone v_profile.timezone);
      end if;
    else
      v_running_streak := 0;
    end if;
  end loop;

  insert into public.lifting_consistency_state (
    user_id,
    current_completed_week_streak,
    best_completed_week_streak,
    completed_weeks,
    goals_hit,
    updated_at
  ) values (
    p_user_id,
    v_current_streak,
    v_best_streak,
    v_completed_weeks,
    v_goals_hit,
    now()
  )
  on conflict (user_id) do update
    set current_completed_week_streak = excluded.current_completed_week_streak,
        best_completed_week_streak = excluded.best_completed_week_streak,
        completed_weeks = excluded.completed_weeks,
        goals_hit = excluded.goals_hit,
        updated_at = excluded.updated_at;

  select coalesce(
    array_agg((se.scoring_date::timestamp at time zone v_profile.timezone) order by se.scoring_date),
    '{}'::timestamptz[]
  )
  into v_lifting_day_times
  from public.scoring_events se
  where se.user_id = p_user_id
    and se.scoring_version = 'lifting-v1'
    and se.event_type = 'LIFTING_WORKOUT';
  v_lifting_day_count := cardinality(v_lifting_day_times);

  select coalesce(
    array_agg((se.scoring_date::timestamp at time zone v_profile.timezone) order by se.scoring_date),
    '{}'::timestamptz[]
  )
  into v_cardio_day_times
  from public.scoring_events se
  where se.user_id = p_user_id
    and se.scoring_version = 'lifting-v1'
    and se.event_type = 'CARDIO_BONUS';
  v_cardio_bonus_day_count := cardinality(v_cardio_day_times);

  select coalesce(
    array_agg(ordered_observations.created_at order by ordered_observations.created_at, ordered_observations.workout_id),
    '{}'::timestamptz[]
  )
  into v_pr_times
  from (
    select
      o.created_at,
      o.workout_id,
      o.metric_value,
      max(o.metric_value) over (
        partition by o.exercise_id, o.metric_type
        order by o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as prior_best
    from public.exercise_progress_observations o
    where o.user_id = p_user_id
      and o.valid
  ) ordered_observations
  where ordered_observations.prior_best is not null
    and ordered_observations.metric_value > ordered_observations.prior_best;
  v_pr_count := cardinality(v_pr_times);

  perform public.sync_lifting_badge(p_user_id, 'FIRST_PR', v_pr_count >= 1, v_pr_times[1], jsonb_build_object('count', v_pr_count));
  perform public.sync_lifting_badge(p_user_id, 'PR_5', v_pr_count >= 5, v_pr_times[5], jsonb_build_object('count', v_pr_count));
  perform public.sync_lifting_badge(p_user_id, 'PR_10', v_pr_count >= 10, v_pr_times[10], jsonb_build_object('count', v_pr_count));
  perform public.sync_lifting_badge(p_user_id, 'PR_25', v_pr_count >= 25, v_pr_times[25], jsonb_build_object('count', v_pr_count));

  perform public.sync_lifting_badge(p_user_id, 'LIFT_DAYS_5', v_lifting_day_count >= 5, v_lifting_day_times[5], jsonb_build_object('count', v_lifting_day_count));
  perform public.sync_lifting_badge(p_user_id, 'LIFT_DAYS_10', v_lifting_day_count >= 10, v_lifting_day_times[10], jsonb_build_object('count', v_lifting_day_count));
  perform public.sync_lifting_badge(p_user_id, 'LIFT_DAYS_25', v_lifting_day_count >= 25, v_lifting_day_times[25], jsonb_build_object('count', v_lifting_day_count));
  perform public.sync_lifting_badge(p_user_id, 'LIFT_DAYS_50', v_lifting_day_count >= 50, v_lifting_day_times[50], jsonb_build_object('count', v_lifting_day_count));

  perform public.sync_lifting_badge(p_user_id, 'GOAL_WEEK_1', v_goals_hit >= 1, v_first_goal_at, jsonb_build_object('count', v_goals_hit));
  perform public.sync_lifting_badge(p_user_id, 'GOAL_STREAK_2', v_best_streak >= 2, v_streak_2_at, jsonb_build_object('bestStreak', v_best_streak));
  perform public.sync_lifting_badge(p_user_id, 'GOAL_STREAK_4', v_best_streak >= 4, v_streak_4_at, jsonb_build_object('bestStreak', v_best_streak));
  perform public.sync_lifting_badge(p_user_id, 'GOAL_STREAK_8', v_best_streak >= 8, v_streak_8_at, jsonb_build_object('bestStreak', v_best_streak));

  perform public.sync_lifting_badge(p_user_id, 'CARDIO_BONUS_DAYS_5', v_cardio_bonus_day_count >= 5, v_cardio_day_times[5], jsonb_build_object('count', v_cardio_bonus_day_count));
  perform public.sync_lifting_badge(p_user_id, 'CARDIO_BONUS_DAYS_10', v_cardio_bonus_day_count >= 10, v_cardio_day_times[10], jsonb_build_object('count', v_cardio_bonus_day_count));
end;
$$;

revoke all on function public.reconcile_weekly_lifting_consistency_for_user(uuid, date) from public, anon, authenticated;

create or replace function public.schedule_weekly_target(p_target smallint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_today date;
  v_current_week_start date;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_target not between 1 and 7 then
    raise exception 'Weekly target must be 1-7' using errcode = '22023';
  end if;

  select p.timezone
  into v_timezone
  from public.profiles p
  where p.id = v_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = '22023';
  end if;

  v_today := (now() at time zone v_timezone)::date;
  v_current_week_start := v_today - (extract(isodow from v_today)::integer - 1);

  update public.profiles
  set pending_weekly_workout_target = p_target,
      pending_weekly_workout_target_week_start = v_current_week_start + 7
  where id = v_user_id;
end;
$$;

revoke all on function public.schedule_weekly_target(smallint) from public, anon, authenticated;
grant execute on function public.schedule_weekly_target(smallint) to authenticated;

create or replace function public.get_my_lifting_consistency_summary()
returns table (
  current_week_start date,
  current_week_target smallint,
  current_week_lifting_days integer,
  current_completed_week_streak integer,
  best_completed_week_streak integer,
  completed_weeks integer,
  goals_hit integer,
  recent_weeks jsonb,
  badges jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_today date;
  v_week_start date;
  v_target smallint;
  v_current_days integer;
  v_state public.lifting_consistency_state%rowtype;
  v_recent_weeks jsonb;
  v_badges jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select p.timezone
  into v_timezone
  from public.profiles p
  where p.id = v_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = '22023';
  end if;

  v_today := (now() at time zone v_timezone)::date;
  v_week_start := v_today - (extract(isodow from v_today)::integer - 1);

  perform public.reconcile_weekly_lifting_consistency_for_user(v_user_id, v_today);

  select wg.target
  into v_target
  from public.weekly_goals wg
  where wg.user_id = v_user_id
    and wg.week_start = v_week_start;

  select count(*)::integer
  into v_current_days
  from public.scoring_events se
  where se.user_id = v_user_id
    and se.scoring_version = 'lifting-v1'
    and se.event_type = 'LIFTING_WORKOUT'
    and se.scoring_date between v_week_start and (v_week_start + 6);

  select s.*
  into v_state
  from public.lifting_consistency_state s
  where s.user_id = v_user_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'weekStart', recent.week_start,
        'target', recent.target,
        'liftingDays', recent.lifting_days,
        'achieved', recent.achieved
      )
      order by recent.week_start desc
    ),
    '[]'::jsonb
  )
  into v_recent_weeks
  from (
    select wls.week_start, wls.target, wls.lifting_days, wls.achieved
    from public.weekly_lifting_snapshots wls
    where wls.user_id = v_user_id
      and wls.week_start < v_week_start
    order by wls.week_start desc
    limit 6
  ) recent;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'badgeKey', ub.badge_key,
        'earnedAt', ub.earned_at
      )
      order by ub.earned_at desc, ub.badge_key
    ),
    '[]'::jsonb
  )
  into v_badges
  from public.user_badges ub
  where ub.user_id = v_user_id;

  return query
  select
    v_week_start,
    coalesce(v_target, 1::smallint),
    coalesce(v_current_days, 0),
    coalesce(v_state.current_completed_week_streak, 0),
    coalesce(v_state.best_completed_week_streak, 0),
    coalesce(v_state.completed_weeks, 0),
    coalesce(v_state.goals_hit, 0),
    coalesce(v_recent_weeks, '[]'::jsonb),
    coalesce(v_badges, '[]'::jsonb);
end;
$$;

revoke all on function public.get_my_lifting_consistency_summary() from public, anon, authenticated;
grant execute on function public.get_my_lifting_consistency_summary() to authenticated;

create or replace function public.reconcile_weekly_consistency_source_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_user_id uuid;
  v_new_user_id uuid;
begin
  if tg_table_name = 'workout_sessions' then
    if tg_op <> 'INSERT'
      and old.source = 'IN_APP'
      and old.status = 'COMPLETED' then
      v_old_user_id := old.user_id;
    end if;
    if tg_op <> 'DELETE'
      and new.source = 'IN_APP'
      and new.status = 'COMPLETED' then
      v_new_user_id := new.user_id;
    end if;

  elsif tg_table_name = 'workout_exercises' then
    if tg_op <> 'INSERT' then
      select w.user_id into v_old_user_id
      from public.workout_sessions w
      where w.id = old.workout_id
        and w.source = 'IN_APP'
        and w.status = 'COMPLETED';
    end if;
    if tg_op <> 'DELETE' then
      select w.user_id into v_new_user_id
      from public.workout_sessions w
      where w.id = new.workout_id
        and w.source = 'IN_APP'
        and w.status = 'COMPLETED';
    end if;

  elsif tg_table_name = 'workout_sets' then
    if tg_op <> 'INSERT' then
      select w.user_id into v_old_user_id
      from public.workout_exercises we
      join public.workout_sessions w on w.id = we.workout_id
      where we.id = old.workout_exercise_id
        and w.source = 'IN_APP'
        and w.status = 'COMPLETED';
    end if;
    if tg_op <> 'DELETE' then
      select w.user_id into v_new_user_id
      from public.workout_exercises we
      join public.workout_sessions w on w.id = we.workout_id
      where we.id = new.workout_exercise_id
        and w.source = 'IN_APP'
        and w.status = 'COMPLETED';
    end if;
  end if;

  if v_old_user_id is not null then
    perform public.reconcile_weekly_lifting_consistency_for_user(v_old_user_id, null);
  end if;
  if v_new_user_id is not null and v_new_user_id is distinct from v_old_user_id then
    perform public.reconcile_weekly_lifting_consistency_for_user(v_new_user_id, null);
  end if;

  return null;
end;
$$;

revoke all on function public.reconcile_weekly_consistency_source_change() from public, anon, authenticated;

-- PostgreSQL fires same-event triggers alphabetically. The zz_ prefix ensures the
-- Phase 7 scoring reconciliation trigger updates scoring_events before this
-- consistency reconciliation reads the authoritative ledger.
drop trigger if exists zz_weekly_consistency_workout_sessions on public.workout_sessions;
create trigger zz_weekly_consistency_workout_sessions
after insert or update or delete on public.workout_sessions
for each row execute function public.reconcile_weekly_consistency_source_change();

drop trigger if exists zz_weekly_consistency_workout_exercises on public.workout_exercises;
create trigger zz_weekly_consistency_workout_exercises
after insert or update or delete on public.workout_exercises
for each row execute function public.reconcile_weekly_consistency_source_change();

drop trigger if exists zz_weekly_consistency_workout_sets on public.workout_sets;
create trigger zz_weekly_consistency_workout_sets
after insert or update or delete on public.workout_sets
for each row execute function public.reconcile_weekly_consistency_source_change();

-- Backfill completed-week snapshots and badge state from the already-authoritative
-- Phase 7 lifting-v1 ledger. This is deterministic and safe to rerun.
do $$
declare
  v_profile record;
begin
  for v_profile in select id from public.profiles order by id loop
    perform public.reconcile_weekly_lifting_consistency_for_user(v_profile.id, null);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
