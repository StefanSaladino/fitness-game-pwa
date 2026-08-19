-- Workout Game PWA — Phase 6.1 workout session lifecycle (v0.4)
-- Start/resume/finish/cancel in-app lifting sessions through guarded RPCs.

alter table public.workout_sessions
  add column paused_at timestamptz,
  add column last_resumed_at timestamptz;

update public.workout_sessions
set last_resumed_at = started_at
where status = 'IN_PROGRESS'
  and last_resumed_at is null;

alter table public.workout_sessions
  add constraint workout_sessions_pause_state_check check (
    (status = 'IN_PROGRESS' and not (paused_at is not null and last_resumed_at is not null))
    or
    (status <> 'IN_PROGRESS' and paused_at is null and last_resumed_at is null)
  );

create unique index if not exists workout_sessions_one_active_in_app_lift
  on public.workout_sessions(user_id)
  where category = 'STRENGTH'
    and source = 'IN_APP'
    and status = 'IN_PROGRESS';

create or replace function public.start_or_resume_lifting_workout()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_workout_id uuid;
  v_now timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

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

  if v_workout_id is not null then
    return v_workout_id;
  end if;

  v_now := clock_timestamp();

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
      v_now,
      v_timezone,
      v_now
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

  if v_workout_id is null then
    raise exception 'Unable to start lifting workout' using errcode = 'P0001';
  end if;

  return v_workout_id;
end;
$$;

create or replace function public.finish_lifting_workout(p_workout_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_workout_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.workout_sessions w
  set
    status = 'COMPLETED',
    ended_at = v_now,
    active_duration_seconds = least(
      86400,
      w.active_duration_seconds + case
        when w.last_resumed_at is null then 0
        else greatest(0, floor(extract(epoch from (v_now - w.last_resumed_at)))::integer)
      end
    ),
    paused_at = null,
    last_resumed_at = null
  where w.id = p_workout_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS'
  returning w.id into v_workout_id;

  if v_workout_id is null then
    raise exception 'Active lifting workout not found' using errcode = '42501';
  end if;

  return v_workout_id;
end;
$$;

create or replace function public.cancel_lifting_workout(p_workout_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_workout_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.workout_sessions w
  set
    status = 'CANCELLED',
    ended_at = v_now,
    active_duration_seconds = least(
      86400,
      w.active_duration_seconds + case
        when w.last_resumed_at is null then 0
        else greatest(0, floor(extract(epoch from (v_now - w.last_resumed_at)))::integer)
      end
    ),
    paused_at = null,
    last_resumed_at = null
  where w.id = p_workout_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS'
  returning w.id into v_workout_id;

  if v_workout_id is null then
    raise exception 'Active lifting workout not found' using errcode = '42501';
  end if;

  return v_workout_id;
end;
$$;

create or replace function public.pause_lifting_workout(p_workout_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_workout_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.workout_sessions w
  set
    active_duration_seconds = least(
      86400,
      w.active_duration_seconds + greatest(0, floor(extract(epoch from (v_now - w.last_resumed_at)))::integer)
    ),
    paused_at = v_now,
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

  return v_workout_id;
end;
$$;

create or replace function public.resume_lifting_workout(p_workout_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_workout_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.workout_sessions w
  set
    paused_at = null,
    last_resumed_at = v_now
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

  return v_workout_id;
end;
$$;

-- Session lifecycle is authoritative from Phase 6 onward. Clients may read their
-- RLS-filtered sessions but must use the lifecycle RPCs for session mutation.
revoke insert, update, delete on public.workout_sessions from authenticated;
grant select on public.workout_sessions to authenticated;

revoke all on function public.start_or_resume_lifting_workout() from public, anon, authenticated;
revoke all on function public.finish_lifting_workout(uuid) from public, anon, authenticated;
revoke all on function public.cancel_lifting_workout(uuid) from public, anon, authenticated;
revoke all on function public.pause_lifting_workout(uuid) from public, anon, authenticated;
revoke all on function public.resume_lifting_workout(uuid) from public, anon, authenticated;

grant execute on function public.start_or_resume_lifting_workout() to authenticated;
grant execute on function public.finish_lifting_workout(uuid) to authenticated;
grant execute on function public.cancel_lifting_workout(uuid) to authenticated;
grant execute on function public.pause_lifting_workout(uuid) to authenticated;
grant execute on function public.resume_lifting_workout(uuid) to authenticated;
