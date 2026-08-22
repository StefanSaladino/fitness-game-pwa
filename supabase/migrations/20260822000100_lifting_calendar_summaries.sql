-- Phase 13B: authenticated weekly/monthly lifting calendar summaries.
-- This is the only v0.12.1 schema migration. Internal aliases are deliberately
-- distinct from RETURNS TABLE output names to avoid PL/pgSQL name ambiguity.

create or replace function public.get_my_lifting_calendar_summaries(
  p_week_count integer default 12,
  p_month_count integer default 6
)
returns table (
  period_kind text,
  period_start date,
  period_end date,
  completed_lifting_sessions bigint,
  exercise_count bigint,
  completed_working_sets bigint,
  volume_kg_reps numeric,
  pr_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text := 'UTC';
  v_today date;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_week_count is null or p_week_count < 1 or p_week_count > 52 then
    raise exception 'Week count must be between 1 and 52' using errcode = '22023';
  end if;

  if p_month_count is null or p_month_count < 1 or p_month_count > 24 then
    raise exception 'Month count must be between 1 and 24' using errcode = '22023';
  end if;

  select coalesce(nullif(trim(p.timezone), ''), 'UTC')
    into v_timezone
  from public.profiles p
  where p.id = v_user_id;

  v_timezone := coalesce(v_timezone, 'UTC');
  v_today := (now() at time zone v_timezone)::date;

  return query
  with eligible_sets as (
    select
      w.id as workout_id,
      w.scoring_date,
      we.exercise_id,
      ws.id as set_id,
      coalesce(ws.weight_kg, 0::numeric) * ws.reps as set_volume_kg_reps
    from public.workout_sessions w
    join public.workout_exercises we on we.workout_id = w.id
    join public.workout_sets ws on ws.workout_exercise_id = we.id
    where w.user_id = v_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and ws.set_type = 'WORKING'
      and ws.completed
      and coalesce(ws.reps, 0) >= 1
  ), observation_context as (
    select
      o.workout_id,
      o.metric_value,
      max(o.metric_value) over (
        partition by o.exercise_id, o.metric_type
        order by o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as previous_pr_value
    from public.exercise_progress_observations o
    where o.user_id = v_user_id
      and o.valid
  ), pr_events as (
    select
      w.scoring_date,
      count(*)::bigint as event_count
    from observation_context o
    join public.workout_sessions w on w.id = o.workout_id
    where w.user_id = v_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and o.previous_pr_value is not null
      and o.metric_value > o.previous_pr_value
    group by w.scoring_date
  ), weekly_periods as (
    select
      gs.bucket_start::date as bucket_start,
      (gs.bucket_start + interval '6 days')::date as bucket_end
    from generate_series(
      date_trunc('week', v_today::timestamp) - make_interval(weeks => p_week_count - 1),
      date_trunc('week', v_today::timestamp),
      interval '1 week'
    ) as gs(bucket_start)
  ), monthly_periods as (
    select
      gs.bucket_start::date as bucket_start,
      (gs.bucket_start + interval '1 month' - interval '1 day')::date as bucket_end
    from generate_series(
      date_trunc('month', v_today::timestamp) - make_interval(months => p_month_count - 1),
      date_trunc('month', v_today::timestamp),
      interval '1 month'
    ) as gs(bucket_start)
  ), weekly_aggregates as (
    select
      wp.bucket_start,
      wp.bucket_end,
      count(distinct es.workout_id)::bigint as session_total,
      count(distinct es.exercise_id)::bigint as exercise_total,
      count(es.set_id)::bigint as working_set_total,
      coalesce(sum(es.set_volume_kg_reps), 0)::numeric as volume_total,
      coalesce((
        select sum(pe.event_count)
        from pr_events pe
        where pe.scoring_date between wp.bucket_start and wp.bucket_end
      ), 0)::bigint as pr_total
    from weekly_periods wp
    left join eligible_sets es
      on es.scoring_date between wp.bucket_start and wp.bucket_end
    group by wp.bucket_start, wp.bucket_end
  ), monthly_aggregates as (
    select
      mp.bucket_start,
      mp.bucket_end,
      count(distinct es.workout_id)::bigint as session_total,
      count(distinct es.exercise_id)::bigint as exercise_total,
      count(es.set_id)::bigint as working_set_total,
      coalesce(sum(es.set_volume_kg_reps), 0)::numeric as volume_total,
      coalesce((
        select sum(pe.event_count)
        from pr_events pe
        where pe.scoring_date between mp.bucket_start and mp.bucket_end
      ), 0)::bigint as pr_total
    from monthly_periods mp
    left join eligible_sets es
      on es.scoring_date between mp.bucket_start and mp.bucket_end
    group by mp.bucket_start, mp.bucket_end
  )
  select
    'WEEK'::text,
    wa.bucket_start,
    wa.bucket_end,
    wa.session_total,
    wa.exercise_total,
    wa.working_set_total,
    wa.volume_total,
    wa.pr_total
  from weekly_aggregates wa

  union all

  select
    'MONTH'::text,
    ma.bucket_start,
    ma.bucket_end,
    ma.session_total,
    ma.exercise_total,
    ma.working_set_total,
    ma.volume_total,
    ma.pr_total
  from monthly_aggregates ma

  order by 1, 2;
end;
$$;

revoke all on function public.get_my_lifting_calendar_summaries(integer, integer) from public, anon, authenticated;
grant execute on function public.get_my_lifting_calendar_summaries(integer, integer) to authenticated;

comment on function public.get_my_lifting_calendar_summaries(integer, integer) is
  'Returns authenticated-user weekly/monthly completed lifting aggregates. Volume is analytics-only; PR counts exclude baseline observations.';
