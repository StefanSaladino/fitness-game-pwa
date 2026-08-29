-- Fitness Game PWA — Phase 17.2C global all-time leaderboard
-- Group competition is weekly-only. Lifetime competition is app-global, read-only,
-- and intentionally independent of group membership/social surfaces.

-- Retire the historical Phase 10 period-overloaded group contract before
-- exposing the one-argument weekly-only replacement.
drop function if exists public.get_group_competition_leaderboard(uuid, text, date);

create or replace function public.get_group_competition_leaderboard(
  p_group_id uuid
)
returns table (
  rank bigint,
  member_user_id uuid,
  username text,
  display_name text,
  profile_picture_path text,
  xp bigint,
  lifting_days bigint,
  pr_count bigint,
  badge_count bigint,
  is_current_user boolean,
  period_start date,
  period_end date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_start date;
  v_end date;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_group_id is null then
    raise exception 'Group id is required' using errcode = '22023';
  end if;
  if not public.is_active_group_member(p_group_id) then
    raise exception 'Active group membership required' using errcode = '42501';
  end if;

  select p.timezone into v_timezone from public.profiles p where p.id = v_user_id;
  v_start := (
    (now() at time zone coalesce(v_timezone, 'UTC'))::date
      - (extract(isodow from (now() at time zone coalesce(v_timezone, 'UTC'))::date)::integer - 1)
  );
  v_end := v_start + 6;

  return query
  with members as (
    select gm.user_id
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.status = 'ACTIVE'
  ), scoring as (
    select
      m.user_id,
      coalesce(sum(se.amount) filter (
        where se.scoring_version = 'lifting-v1'
          and se.scoring_date between v_start and v_end
      ), 0)::bigint as xp,
      count(distinct se.scoring_date) filter (
        where se.scoring_version = 'lifting-v1'
          and se.event_type = 'LIFTING_WORKOUT'
          and se.scoring_date between v_start and v_end
      )::bigint as lifting_days
    from members m
    left join public.scoring_events se on se.user_id = m.user_id
    group by m.user_id
  ), observations as (
    select
      o.user_id,
      o.scoring_date,
      o.created_at,
      o.workout_id,
      o.exercise_id,
      o.metric_type,
      o.metric_value,
      max(o.metric_value) over (
        partition by o.user_id, o.exercise_id, o.metric_type
        order by o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as previous_best
    from public.exercise_progress_observations o
    join members m on m.user_id = o.user_id
    where o.valid
  ), prs as (
    select
      m.user_id,
      count(o.workout_id) filter (
        where o.previous_best is not null
          and o.metric_value > o.previous_best
          and o.scoring_date between v_start and v_end
      )::bigint as pr_count
    from members m
    left join observations o on o.user_id = m.user_id
    group by m.user_id
  ), badges as (
    select
      m.user_id,
      count(ub.badge_key) filter (
        where (ub.earned_at at time zone coalesce(bp.timezone, 'UTC'))::date between v_start and v_end
      )::bigint as badge_count
    from members m
    left join public.user_badges ub on ub.user_id = m.user_id
    left join public.profiles bp on bp.id = m.user_id
    group by m.user_id
  ), ranked as (
    select
      p.id as member_user_id,
      p.username,
      p.display_name,
      p.profile_picture_path,
      s.xp,
      s.lifting_days,
      coalesce(pr.pr_count, 0)::bigint as pr_count,
      coalesce(b.badge_count, 0)::bigint as badge_count,
      p.id = v_user_id as is_current_user,
      dense_rank() over (
        order by s.xp desc, s.lifting_days desc, coalesce(pr.pr_count, 0) desc
      ) as competition_rank
    from members m
    join public.profiles p on p.id = m.user_id
    join scoring s on s.user_id = m.user_id
    left join prs pr on pr.user_id = m.user_id
    left join badges b on b.user_id = m.user_id
  )
  select
    r.competition_rank,
    r.member_user_id,
    r.username,
    r.display_name,
    r.profile_picture_path,
    r.xp,
    r.lifting_days,
    r.pr_count,
    r.badge_count,
    r.is_current_user,
    v_start,
    v_end
  from ranked r
  order by r.competition_rank, lower(r.display_name), r.member_user_id;
end;
$$;

create or replace function public.get_global_all_time_leaderboard()
returns table (
  row_kind text,
  rank bigint,
  member_user_id uuid,
  username text,
  display_name text,
  profile_picture_path text,
  xp bigint,
  lifting_days bigint,
  pr_count bigint,
  badge_count bigint,
  is_current_user boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from private.platform_account_state pas
    where pas.user_id = v_user_id
      and pas.status = 'ACTIVE'::public.platform_account_status
  ) then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  return query
  with eligible_users as (
    select p.id, p.username, p.display_name, p.profile_picture_path
    from public.profiles p
    join private.platform_account_state pas on pas.user_id = p.id
    where p.onboarding_completed_at is not null
      and pas.status = 'ACTIVE'::public.platform_account_status
  ), scoring as (
    select
      u.id as user_id,
      coalesce(sum(se.amount) filter (where se.scoring_version = 'lifting-v1'), 0)::bigint as xp,
      count(distinct se.scoring_date) filter (
        where se.scoring_version = 'lifting-v1'
          and se.event_type = 'LIFTING_WORKOUT'
      )::bigint as lifting_days
    from eligible_users u
    left join public.scoring_events se on se.user_id = u.id
    group by u.id
  ), observation_context as (
    select
      o.user_id,
      o.workout_id,
      o.exercise_id,
      o.metric_type,
      o.metric_value,
      max(o.metric_value) over (
        partition by o.user_id, o.exercise_id, o.metric_type
        order by o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as previous_best
    from public.exercise_progress_observations o
    join eligible_users u on u.id = o.user_id
    where o.valid
  ), prs as (
    select
      u.id as user_id,
      count(o.workout_id) filter (
        where o.previous_best is not null
          and o.metric_value > o.previous_best
      )::bigint as pr_count
    from eligible_users u
    left join observation_context o on o.user_id = u.id
    group by u.id
  ), badges as (
    select
      u.id as user_id,
      count(ub.badge_key)::bigint as badge_count
    from eligible_users u
    left join public.user_badges ub on ub.user_id = u.id
    group by u.id
  ), ranked as (
    select
      u.id as member_user_id,
      u.username,
      u.display_name,
      u.profile_picture_path,
      s.xp,
      s.lifting_days,
      coalesce(pr.pr_count, 0)::bigint as pr_count,
      coalesce(b.badge_count, 0)::bigint as badge_count,
      u.id = v_user_id as is_current_user,
      row_number() over (
        order by
          s.xp desc,
          s.lifting_days desc,
          coalesce(pr.pr_count, 0) desc,
          coalesce(b.badge_count, 0) desc,
          lower(u.display_name),
          u.id
      )::bigint as global_rank
    from eligible_users u
    join scoring s on s.user_id = u.id
    left join prs pr on pr.user_id = u.id
    left join badges b on b.user_id = u.id
  ), output as (
    select
      'TOP'::text as row_kind,
      r.global_rank,
      r.member_user_id,
      r.username,
      r.display_name,
      r.profile_picture_path,
      r.xp,
      r.lifting_days,
      r.pr_count,
      r.badge_count,
      r.is_current_user
    from ranked r
    where r.global_rank <= 10

    union all

    select
      'CURRENT_USER'::text as row_kind,
      r.global_rank,
      r.member_user_id,
      r.username,
      r.display_name,
      r.profile_picture_path,
      r.xp,
      r.lifting_days,
      r.pr_count,
      r.badge_count,
      true as is_current_user
    from ranked r
    where r.member_user_id = v_user_id
  )
  select
    o.row_kind,
    o.global_rank,
    o.member_user_id,
    o.username,
    o.display_name,
    o.profile_picture_path,
    o.xp,
    o.lifting_days,
    o.pr_count,
    o.badge_count,
    o.is_current_user
  from output o
  order by case when o.row_kind = 'TOP' then 0 else 1 end, o.global_rank, o.member_user_id;
end;
$$;

revoke all on function public.get_group_competition_leaderboard(uuid) from public, anon, authenticated;
grant execute on function public.get_group_competition_leaderboard(uuid) to authenticated;
revoke all on function public.get_global_all_time_leaderboard() from public, anon, authenticated;
grant execute on function public.get_global_all_time_leaderboard() to authenticated;

comment on function public.get_group_competition_leaderboard(uuid) is
  'Phase 17.2C weekly-only leaderboard for active members of one group.';
comment on function public.get_global_all_time_leaderboard() is
  'Phase 17.2C read-only global lifetime leaderboard. Returns the exact Top 10 plus a detached CURRENT_USER row even when that user is already in the Top 10.';

notify pgrst, 'reload schema';
