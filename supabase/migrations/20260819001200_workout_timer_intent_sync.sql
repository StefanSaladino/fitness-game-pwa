-- Fitness Game PWA — Phase 6.1A timer intent sync (v0.4.5)
-- Removes network round-trip time from visible/persisted pause/resume timing.
-- The client sends the timestamp of the user's button action. The server accepts
-- it only inside a narrow clock-skew window and otherwise falls back to server time.

create or replace function public.start_or_resume_lifting_workout_intent(p_action_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_workout_id uuid;
  v_server_now timestamptz := clock_timestamp();
  v_effective_at timestamptz;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_effective_at := case
    when p_action_at is not null
      and p_action_at >= v_server_now - interval '15 seconds'
      and p_action_at <= v_server_now + interval '2 seconds'
      then p_action_at
    else v_server_now
  end;

  select p.timezone
  into v_timezone
  from public.profiles p
  where p.id = v_user_id;

  if v_timezone is null then
    raise exception 'Profile timezone unavailable' using errcode = '22023';
  end if;

  select w.id
  into v_workout_id
  from public.workout_sessions w
  where w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS'
  order by w.started_at desc
  limit 1;

  if v_workout_id is null then
    begin
      insert into public.workout_sessions (
        user_id,
        category,
        status,
        source,
        started_at,
        timezone_at_start,
        last_resumed_at
      ) values (
        v_user_id,
        'STRENGTH',
        'IN_PROGRESS',
        'IN_APP',
        v_effective_at,
        v_timezone,
        v_effective_at
      )
      returning id into v_workout_id;
    exception
      when unique_violation then
        select w.id
        into v_workout_id
        from public.workout_sessions w
        where w.user_id = v_user_id
          and w.category = 'STRENGTH'
          and w.source = 'IN_APP'
          and w.status = 'IN_PROGRESS'
        order by w.started_at desc
        limit 1;
    end;
  end if;

  if v_workout_id is null then
    raise exception 'Unable to start lifting workout' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'id', w.id,
    'user_id', w.user_id,
    'status', w.status,
    'started_at', w.started_at,
    'ended_at', w.ended_at,
    'active_duration_seconds', w.active_duration_seconds,
    'timezone_at_start', w.timezone_at_start,
    'scoring_date', w.scoring_date,
    'paused_at', w.paused_at,
    'last_resumed_at', w.last_resumed_at
  )
  into v_result
  from public.workout_sessions w
  where w.id = v_workout_id;

  return v_result;
end;
$$;

create or replace function public.pause_lifting_workout_intent(p_workout_id uuid, p_action_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_server_now timestamptz := clock_timestamp();
  v_effective_at timestamptz;
  v_workout_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_effective_at := case
    when p_action_at is not null
      and p_action_at >= v_server_now - interval '15 seconds'
      and p_action_at <= v_server_now + interval '2 seconds'
      then p_action_at
    else v_server_now
  end;

  update public.workout_sessions w
  set
    active_duration_seconds = least(
      86400,
      w.active_duration_seconds + greatest(
        0,
        floor(extract(epoch from (greatest(v_effective_at, w.last_resumed_at) - w.last_resumed_at)))::integer
      )
    ),
    paused_at = greatest(v_effective_at, w.last_resumed_at),
    last_resumed_at = null
  where w.id = p_workout_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS'
    and w.paused_at is null
    and w.last_resumed_at is not null
  returning w.id into v_workout_id;

  if v_workout_id is null then
    raise exception 'Active lifting workout not found or already paused' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', w.id,
    'user_id', w.user_id,
    'status', w.status,
    'started_at', w.started_at,
    'ended_at', w.ended_at,
    'active_duration_seconds', w.active_duration_seconds,
    'timezone_at_start', w.timezone_at_start,
    'scoring_date', w.scoring_date,
    'paused_at', w.paused_at,
    'last_resumed_at', w.last_resumed_at
  )
  into v_result
  from public.workout_sessions w
  where w.id = v_workout_id;

  return v_result;
end;
$$;

create or replace function public.resume_lifting_workout_intent(p_workout_id uuid, p_action_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_server_now timestamptz := clock_timestamp();
  v_effective_at timestamptz;
  v_workout_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_effective_at := case
    when p_action_at is not null
      and p_action_at >= v_server_now - interval '15 seconds'
      and p_action_at <= v_server_now + interval '2 seconds'
      then p_action_at
    else v_server_now
  end;

  update public.workout_sessions w
  set
    last_resumed_at = greatest(v_effective_at, w.paused_at),
    paused_at = null
  where w.id = p_workout_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS'
    and w.paused_at is not null
    and w.last_resumed_at is null
  returning w.id into v_workout_id;

  if v_workout_id is null then
    raise exception 'Paused lifting workout not found' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', w.id,
    'user_id', w.user_id,
    'status', w.status,
    'started_at', w.started_at,
    'ended_at', w.ended_at,
    'active_duration_seconds', w.active_duration_seconds,
    'timezone_at_start', w.timezone_at_start,
    'scoring_date', w.scoring_date,
    'paused_at', w.paused_at,
    'last_resumed_at', w.last_resumed_at
  )
  into v_result
  from public.workout_sessions w
  where w.id = v_workout_id;

  return v_result;
end;
$$;

revoke all on function public.start_or_resume_lifting_workout_intent(timestamptz) from public, anon, authenticated;
revoke all on function public.pause_lifting_workout_intent(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.resume_lifting_workout_intent(uuid, timestamptz) from public, anon, authenticated;

grant execute on function public.start_or_resume_lifting_workout_intent(timestamptz) to authenticated;
grant execute on function public.pause_lifting_workout_intent(uuid, timestamptz) to authenticated;
grant execute on function public.resume_lifting_workout_intent(uuid, timestamptz) to authenticated;

notify pgrst, 'reload schema';
