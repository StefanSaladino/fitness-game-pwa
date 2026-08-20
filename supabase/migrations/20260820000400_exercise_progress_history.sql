-- Fitness Game PWA — Phase 8 exercise progression engine + history (v0.7.0)
-- Read models over authoritative lifting-v1 progression/source data.
-- This migration does not alter scoring rules or write new XP.

create or replace function public.get_my_exercise_progress_overview()
returns table (
  exercise_id uuid,
  canonical_name text,
  measurement_type text,
  metric_type text,
  best_value numeric,
  best_weight_kg numeric,
  best_reps integer,
  achieved_at timestamptz,
  previous_pr_value numeric,
  session_count bigint,
  observation_count bigint,
  first_performed_at timestamptz,
  last_performed_at timestamptz,
  average_days_between_sessions numeric,
  latest_metric_value numeric,
  latest_weight_kg numeric,
  latest_reps integer,
  latest_observed_at timestamptz
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

  return query
  with session_rows as (
    select
      we.exercise_id,
      w.id as workout_id,
      coalesce(w.ended_at, w.started_at) as performed_at
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
    group by we.exercise_id, w.id, w.ended_at, w.started_at
  ), session_stats as (
    select
      sr.exercise_id,
      count(*)::bigint as session_count,
      min(sr.performed_at) as first_performed_at,
      max(sr.performed_at) as last_performed_at,
      case
        when count(*) > 1 then round(
          (
            extract(epoch from (max(sr.performed_at) - min(sr.performed_at))) / 86400.0
          ) / (count(*) - 1),
          2
        )
        else null::numeric
      end as average_days_between_sessions
    from session_rows sr
    group by sr.exercise_id
  ), observation_context as (
    select
      o.*,
      max(o.metric_value) over (
        partition by o.exercise_id, o.metric_type
        order by o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as previous_pr_value,
      row_number() over (
        partition by o.exercise_id, o.metric_type
        order by o.created_at desc, o.workout_id desc
      ) as latest_rank
    from public.exercise_progress_observations o
    where o.user_id = v_user_id
      and o.valid
  ), observation_stats as (
    select
      o.exercise_id,
      count(*)::bigint as observation_count
    from public.exercise_progress_observations o
    where o.user_id = v_user_id
      and o.valid
    group by o.exercise_id
  )
  select
    e.id as exercise_id,
    e.canonical_name,
    e.measurement_type,
    p.metric_type,
    p.best_value,
    p.best_weight_kg,
    p.best_reps,
    p.achieved_at,
    current_observation.previous_pr_value,
    ss.session_count,
    coalesce(os.observation_count, 0)::bigint as observation_count,
    ss.first_performed_at,
    ss.last_performed_at,
    ss.average_days_between_sessions,
    latest_observation.metric_value as latest_metric_value,
    latest_observation.weight_kg as latest_weight_kg,
    latest_observation.reps as latest_reps,
    latest_observation.created_at as latest_observed_at
  from session_stats ss
  join public.exercise_catalog e on e.id = ss.exercise_id
  left join public.exercise_progress p
    on p.user_id = v_user_id
   and p.exercise_id = ss.exercise_id
  left join observation_context current_observation
    on current_observation.exercise_id = p.exercise_id
   and current_observation.metric_type = p.metric_type
   and current_observation.workout_id = p.source_workout_id
  left join observation_context latest_observation
    on latest_observation.exercise_id = p.exercise_id
   and latest_observation.metric_type = p.metric_type
   and latest_observation.latest_rank = 1
  left join observation_stats os on os.exercise_id = ss.exercise_id
  order by ss.last_performed_at desc, lower(e.canonical_name), e.id;
end;
$$;

create or replace function public.get_my_exercise_progress_history(p_exercise_id uuid)
returns table (
  workout_id uuid,
  scoring_date date,
  observed_at timestamptz,
  metric_type text,
  metric_value numeric,
  weight_kg numeric,
  reps integer,
  previous_pr_value numeric,
  is_baseline boolean,
  is_pr boolean,
  is_current_pr boolean,
  completed_working_sets integer,
  session_volume_kg_reps numeric,
  heaviest_weight_kg numeric,
  max_completed_reps integer,
  plain_bodyweight_sets integer,
  added_weight_sets integer,
  assisted_sets integer
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

  if p_exercise_id is null then
    raise exception 'Exercise id is required' using errcode = '22023';
  end if;

  return query
  with sessions as (
    select
      w.id as workout_id,
      w.scoring_date,
      coalesce(w.ended_at, w.started_at) as observed_at,
      count(*) filter (
        where ws.set_type = 'WORKING'
          and ws.completed
          and coalesce(ws.reps, 0) >= 1
      )::integer as completed_working_sets,
      coalesce(sum(
        case
          when ws.set_type = 'WORKING'
            and ws.completed
            and coalesce(ws.reps, 0) >= 1
            and ws.weight_kg is not null
          then ws.weight_kg * ws.reps
          else 0
        end
      ), 0)::numeric as session_volume_kg_reps,
      max(ws.weight_kg) filter (
        where ws.set_type = 'WORKING'
          and ws.completed
          and coalesce(ws.reps, 0) >= 1
      ) as heaviest_weight_kg,
      max(ws.reps) filter (
        where ws.set_type = 'WORKING'
          and ws.completed
          and coalesce(ws.reps, 0) >= 1
      )::integer as max_completed_reps,
      count(*) filter (
        where ws.set_type = 'WORKING'
          and ws.completed
          and coalesce(ws.reps, 0) >= 1
          and coalesce(ws.bodyweight_mode, 'BODYWEIGHT') = 'BODYWEIGHT'
          and ws.weight_kg is null
      )::integer as plain_bodyweight_sets,
      count(*) filter (
        where ws.set_type = 'WORKING'
          and ws.completed
          and coalesce(ws.reps, 0) >= 1
          and ws.bodyweight_mode = 'ADDED_WEIGHT'
      )::integer as added_weight_sets,
      count(*) filter (
        where ws.set_type = 'WORKING'
          and ws.completed
          and coalesce(ws.reps, 0) >= 1
          and ws.bodyweight_mode = 'ASSISTED'
      )::integer as assisted_sets
    from public.workout_sessions w
    join public.workout_exercises we on we.workout_id = w.id
    join public.workout_sets ws on ws.workout_exercise_id = we.id
    where w.user_id = v_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and we.exercise_id = p_exercise_id
    group by w.id, w.scoring_date, w.ended_at, w.started_at
    having count(*) filter (
      where ws.set_type = 'WORKING'
        and ws.completed
        and coalesce(ws.reps, 0) >= 1
    ) > 0
  ), observations as (
    select
      o.*,
      max(o.metric_value) over (
        partition by o.exercise_id, o.metric_type
        order by o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as previous_pr_value
    from public.exercise_progress_observations o
    where o.user_id = v_user_id
      and o.exercise_id = p_exercise_id
      and o.valid
  )
  select
    s.workout_id,
    s.scoring_date,
    s.observed_at,
    o.metric_type,
    o.metric_value,
    o.weight_kg,
    o.reps,
    o.previous_pr_value,
    (o.workout_id is not null and o.previous_pr_value is null) as is_baseline,
    (
      o.workout_id is not null
      and o.previous_pr_value is not null
      and o.metric_value > o.previous_pr_value
    ) as is_pr,
    coalesce((
      p.source_workout_id = s.workout_id
      and p.metric_type = o.metric_type
    ), false) as is_current_pr,
    s.completed_working_sets,
    s.session_volume_kg_reps,
    s.heaviest_weight_kg,
    s.max_completed_reps,
    s.plain_bodyweight_sets,
    s.added_weight_sets,
    s.assisted_sets
  from sessions s
  left join observations o on o.workout_id = s.workout_id
  left join public.exercise_progress p
    on p.user_id = v_user_id
   and p.exercise_id = p_exercise_id
   and p.metric_type = o.metric_type
  order by s.observed_at desc, s.workout_id desc;
end;
$$;

revoke all on function public.get_my_exercise_progress_overview() from public, anon, authenticated;
grant execute on function public.get_my_exercise_progress_overview() to authenticated;

revoke all on function public.get_my_exercise_progress_history(uuid) from public, anon, authenticated;
grant execute on function public.get_my_exercise_progress_history(uuid) to authenticated;

comment on function public.get_my_exercise_progress_overview() is
  'Returns the authenticated user exercise-level lifting progression summary, including PB context and frequency data.';

comment on function public.get_my_exercise_progress_history(uuid) is
  'Returns the authenticated user session-by-session history for one exercise. Volume is analytics-only; added/assisted bodyweight work is not normalized into plain-bodyweight progression.';

notify pgrst, 'reload schema';
