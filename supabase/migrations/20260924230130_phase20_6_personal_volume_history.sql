-- Phase 20.6: historical weekly effective-volume read model for learned personal baselines.
create or replace function public.get_my_weekly_muscle_volume_history(
  p_anchor_date date default null,
  p_lookback_days integer default 126
)
returns table(
  muscle_group text,
  week_start date,
  effective_sets numeric,
  direct_effective_sets numeric,
  indirect_effective_sets numeric,
  eligible_logical_sets bigint
)
language plpgsql
stable
set search_path = 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_anchor_date date;
  v_methodology_version text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if p_lookback_days is null or p_lookback_days < 42 or p_lookback_days > 180 then
    raise exception 'Lookback days must be between 42 and 180' using errcode='22023';
  end if;

  select coalesce(nullif(trim(p.timezone), ''), 'UTC')
  into v_timezone from public.profiles p where p.id=v_user_id;
  v_timezone := coalesce(v_timezone, 'UTC');
  v_anchor_date := coalesce(p_anchor_date,(now() at time zone v_timezone)::date);

  select m.version into v_methodology_version
  from public.muscle_volume_methodologies m
  where m.is_active order by m.version limit 1;

  if v_methodology_version is null then
    raise exception 'No active muscle-volume methodology is configured'
      using errcode='55000';
  end if;

  return query
  select
    c.muscle_group,
    date_trunc('week', s.scoring_date::timestamp)::date,
    coalesce(sum(s.stimulus_equivalents*c.contribution_weight),0)::numeric,
    coalesce(sum(s.stimulus_equivalents*c.contribution_weight)
      filter (where c.contribution_role='DIRECT'),0)::numeric,
    coalesce(sum(s.stimulus_equivalents*c.contribution_weight)
      filter (where c.contribution_role='INDIRECT'),0)::numeric,
    count(distinct s.workout_set_id)::bigint
  from public.muscle_volume_set_stimulus s
  join public.muscle_volume_exercise_contributions c
    on c.methodology_version=s.methodology_version
   and c.exercise_id=s.exercise_id
  where s.user_id=v_user_id
    and s.methodology_version=v_methodology_version
    and s.scoring_date between (v_anchor_date-(p_lookback_days-1)) and v_anchor_date
  group by c.muscle_group,date_trunc('week',s.scoring_date::timestamp)::date
  order by c.muscle_group,date_trunc('week',s.scoring_date::timestamp)::date;
end;
$$;

revoke all on function public.get_my_weekly_muscle_volume_history(date,integer)
from public, anon;
grant execute on function public.get_my_weekly_muscle_volume_history(date,integer)
to authenticated;
notify pgrst, 'reload schema';
