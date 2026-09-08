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

revoke all on function public.get_global_all_time_leaderboard() from public, anon, authenticated;
grant execute on function public.get_global_all_time_leaderboard() to authenticated;

comment on function public.get_global_all_time_leaderboard() is
  'Phase 17.2C compatibility rollout: read-only global lifetime leaderboard. Returns the exact Top 10 plus a detached CURRENT_USER row even when that user is already in the Top 10.';

notify pgrst, 'reload schema';
