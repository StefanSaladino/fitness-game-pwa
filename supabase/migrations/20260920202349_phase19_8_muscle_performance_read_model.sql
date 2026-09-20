create or replace function public.get_my_muscle_performance_observations(
  p_anchor_date date default null,
  p_lookback_days integer default 56
)
returns table (
  muscle_group text,
  exercise_id uuid,
  canonical_name text,
  contribution_role text,
  contribution_weight numeric,
  scoring_date date,
  observed_at timestamptz,
  metric_type text,
  metric_value numeric,
  reference_metric_value numeric,
  relative_performance_index numeric
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_anchor_date date;
  v_methodology_version text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_lookback_days is null or p_lookback_days < 28 or p_lookback_days > 180 then
    raise exception 'Lookback days must be between 28 and 180'
      using errcode = '22023';
  end if;

  select coalesce(nullif(trim(p.timezone), ''), 'UTC')
  into v_timezone
  from public.profiles p
  where p.id = v_user_id;

  v_timezone := coalesce(v_timezone, 'UTC');
  v_anchor_date := coalesce(
    p_anchor_date,
    (now() at time zone v_timezone)::date
  );

  select m.version
  into v_methodology_version
  from public.muscle_volume_methodologies m
  where m.is_active
  order by m.version
  limit 1;

  if v_methodology_version is null then
    raise exception 'No active muscle-volume methodology is configured'
      using errcode = '55000';
  end if;

  return query
  with source_observations as (
    select
      o.exercise_id,
      e.canonical_name,
      o.scoring_date,
      o.created_at as observed_at,
      o.metric_type,
      o.metric_value,
      first_value(o.metric_value) over (
        partition by o.exercise_id, o.metric_type
        order by o.scoring_date, o.created_at, o.workout_id
        rows between unbounded preceding and unbounded following
      ) as reference_metric_value
    from public.exercise_progress_observations o
    join public.exercise_catalog e
      on e.id = o.exercise_id
    join public.muscle_volume_exercise_rules r
      on r.methodology_version = v_methodology_version
     and r.exercise_id = o.exercise_id
     and r.volume_eligible
    where o.user_id = v_user_id
      and o.valid
      and o.metric_value > 0
      and o.scoring_date between
        (v_anchor_date - (p_lookback_days - 1))
        and v_anchor_date
  )
  select
    c.muscle_group,
    s.exercise_id,
    s.canonical_name,
    c.contribution_role,
    c.contribution_weight,
    s.scoring_date,
    s.observed_at,
    s.metric_type,
    s.metric_value,
    s.reference_metric_value,
    case
      when s.reference_metric_value > 0
        then s.metric_value / s.reference_metric_value
      else null::numeric
    end as relative_performance_index
  from source_observations s
  join public.muscle_volume_exercise_contributions c
    on c.methodology_version = v_methodology_version
   and c.exercise_id = s.exercise_id
  where s.reference_metric_value > 0
  order by c.muscle_group, s.scoring_date, s.observed_at, s.exercise_id;
end;
$$;

revoke all on function public.get_my_muscle_performance_observations(date, integer)
from public, anon, authenticated;

grant execute on function public.get_my_muscle_performance_observations(date, integer)
to authenticated;

comment on function public.get_my_muscle_performance_observations(date, integer) is
  'Phase 19.8 authenticated performance-context read model. Normalizes each eligible exercise metric to its first valid observation in the requested lookback, then maps the observation through the active muscle-volume contribution matrix for muscle-level trend analysis.';

notify pgrst, 'reload schema';
