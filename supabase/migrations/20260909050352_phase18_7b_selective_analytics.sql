create table if not exists public.user_tracked_exercises (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercise_catalog(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.user_tracked_exercises enable row level security;

revoke all on table public.user_tracked_exercises from public, anon, authenticated;
grant select on table public.user_tracked_exercises to authenticated;

drop policy if exists user_tracked_exercises_select on public.user_tracked_exercises;
create policy user_tracked_exercises_select
on public.user_tracked_exercises
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Preserve the exact population that the pre-18.7B exercise overview exposed.
insert into public.user_tracked_exercises (user_id, exercise_id)
select w.user_id, we.exercise_id
from public.workout_sessions w
join public.workout_exercises we on we.workout_id = w.id
join public.workout_sets ws on ws.workout_exercise_id = we.id
where w.source = 'IN_APP'
  and w.status = 'COMPLETED'
  and w.category = 'STRENGTH'
  and ws.set_type = 'WORKING'
  and ws.completed
  and coalesce(ws.reps, 0) >= 1
group by w.user_id, we.exercise_id
on conflict (user_id, exercise_id) do nothing;

create or replace function public.set_my_exercise_analytics_tracking(
  p_exercise_id uuid,
  p_tracked boolean
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_exercise_id is null or not exists (
    select 1 from public.exercise_catalog e where e.id = p_exercise_id
  ) then
    raise exception 'Exercise not found' using errcode = '22023';
  end if;

  if p_tracked then
    insert into public.user_tracked_exercises (user_id, exercise_id)
    values (v_user_id, p_exercise_id)
    on conflict (user_id, exercise_id) do nothing;
  else
    delete from public.user_tracked_exercises
    where user_id = v_user_id
      and exercise_id = p_exercise_id;
  end if;

  return p_tracked;
end;
$$;

revoke all on function public.set_my_exercise_analytics_tracking(uuid, boolean) from public, anon;
grant execute on function public.set_my_exercise_analytics_tracking(uuid, boolean) to authenticated;

create or replace function public.get_my_exercise_progress_overview()
returns table(
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
set search_path to 'public', 'pg_temp'
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
          (extract(epoch from (max(sr.performed_at) - min(sr.performed_at))) / 86400.0) / (count(*) - 1),
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
  join public.user_tracked_exercises tracked
    on tracked.user_id = v_user_id
   and tracked.exercise_id = ss.exercise_id
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

revoke all on function public.get_my_exercise_progress_overview() from public, anon;
grant execute on function public.get_my_exercise_progress_overview() to authenticated;

notify pgrst, 'reload schema';
