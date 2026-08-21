-- Fitness Game PWA — Phase 11 cardio accessory logging (v0.10.0)
-- Cardio remains secondary: completed IN_APP history plus best-of-day lifting-v1 bonus only.

create or replace function public.log_cardio_activity(
  p_category public.workout_category,
  p_active_duration_seconds integer,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_ended_at timestamptz := clock_timestamp();
  v_started_at timestamptz;
  v_workout_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_category not in ('RUNNING','WALKING_HIKING','CYCLING','SWIMMING','SPORT','CARDIO','HIIT') then
    raise exception 'Unsupported cardio category' using errcode = '22023';
  end if;
  if p_active_duration_seconds is null or p_active_duration_seconds < 60 or p_active_duration_seconds > 21600 then
    raise exception 'Cardio duration must be between 1 minute and 6 hours' using errcode = '22023';
  end if;
  if p_notes is not null and char_length(p_notes) > 5000 then
    raise exception 'Cardio notes are too long' using errcode = '22023';
  end if;

  select timezone into v_timezone from public.profiles where id = v_user_id;
  if not found then raise exception 'Profile not found' using errcode = '42501'; end if;
  v_started_at := v_ended_at - make_interval(secs => p_active_duration_seconds);

  insert into public.workout_sessions (
    user_id, category, status, source, started_at, ended_at,
    active_duration_seconds, timezone_at_start, scoring_date, notes
  ) values (
    v_user_id, p_category, 'COMPLETED', 'IN_APP', v_started_at, v_ended_at,
    p_active_duration_seconds, v_timezone, (v_started_at at time zone v_timezone)::date,
    nullif(trim(coalesce(p_notes,'')), '')
  ) returning id into v_workout_id;

  return v_workout_id;
end;
$$;

create or replace function public.delete_cardio_activity(p_workout_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted uuid;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from public.workout_sessions w
  where w.id = p_workout_id
    and w.user_id = v_user_id
    and w.source = 'IN_APP'
    and w.status = 'COMPLETED'
    and w.category in ('RUNNING','WALKING_HIKING','CYCLING','SWIMMING','SPORT','CARDIO','HIIT')
  returning w.id into v_deleted;
  if v_deleted is null then raise exception 'Cardio activity not found' using errcode = '22023'; end if;
  return v_deleted;
end;
$$;

create or replace function public.get_my_cardio_history(p_limit integer default 50)
returns table (
  workout_id uuid,
  category public.workout_category,
  scoring_date date,
  started_at timestamptz,
  ended_at timestamptz,
  active_duration_seconds integer,
  qualifies_cardio_bonus boolean,
  daily_bonus_xp integer,
  notes text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    w.id, w.category, w.scoring_date, w.started_at, w.ended_at,
    w.active_duration_seconds, w.qualifies_cardio_bonus,
    coalesce(se.amount,0)::integer as daily_bonus_xp,
    w.notes
  from public.workout_sessions w
  left join public.scoring_events se
    on se.workout_id = w.id
   and se.user_id = w.user_id
   and se.event_type = 'CARDIO_BONUS'
   and se.scoring_version = 'lifting-v1'
  where w.user_id = auth.uid()
    and w.source = 'IN_APP'
    and w.status = 'COMPLETED'
    and w.category in ('RUNNING','WALKING_HIKING','CYCLING','SWIMMING','SPORT','CARDIO','HIIT')
  order by w.started_at desc, w.id desc
  limit least(greatest(coalesce(p_limit,50),1),100);
$$;

create or replace function public.get_my_cardio_summary()
returns table (
  total_activities bigint,
  total_active_minutes bigint,
  last_30_days_activities bigint,
  last_30_days_active_minutes bigint,
  last_30_days_bonus_xp bigint,
  last_activity_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with cardio as (
    select * from public.workout_sessions w
    where w.user_id = auth.uid()
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category in ('RUNNING','WALKING_HIKING','CYCLING','SWIMMING','SPORT','CARDIO','HIIT')
  )
  select
    count(*)::bigint,
    coalesce(sum(active_duration_seconds)/60,0)::bigint,
    count(*) filter (where started_at >= now() - interval '30 days')::bigint,
    coalesce(sum(active_duration_seconds) filter (where started_at >= now() - interval '30 days')/60,0)::bigint,
    coalesce((select sum(se.amount) from public.scoring_events se where se.user_id=auth.uid() and se.scoring_version='lifting-v1' and se.event_type='CARDIO_BONUS' and se.scoring_date >= (current_date - 29)),0)::bigint,
    max(started_at)
  from cardio;
$$;

revoke all on function public.log_cardio_activity(public.workout_category,integer,text) from public, anon, authenticated;
revoke all on function public.delete_cardio_activity(uuid) from public, anon, authenticated;
revoke all on function public.get_my_cardio_history(integer) from public, anon, authenticated;
revoke all on function public.get_my_cardio_summary() from public, anon, authenticated;
grant execute on function public.log_cardio_activity(public.workout_category,integer,text) to authenticated;
grant execute on function public.delete_cardio_activity(uuid) to authenticated;
grant execute on function public.get_my_cardio_history(integer) to authenticated;
grant execute on function public.get_my_cardio_summary() to authenticated;

notify pgrst, 'reload schema';
