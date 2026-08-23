create or replace function public.start_lifting_workout_from_preset(
  p_exercise_ids uuid[],
  p_action_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_exercise_count integer := coalesce(cardinality(p_exercise_ids), 0);
  v_distinct_count integer;
  v_active_count integer;
  v_workout_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_exercise_count < 1 or v_exercise_count > 8 then
    raise exception 'Preset workout must contain between 1 and 8 exercises' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_exercise_ids) as requested(exercise_id)
    where requested.exercise_id is null
  ) then
    raise exception 'Preset workout contains an invalid exercise' using errcode = '22023';
  end if;

  select count(distinct requested.exercise_id)::integer
  into v_distinct_count
  from unnest(p_exercise_ids) as requested(exercise_id);

  if v_distinct_count <> v_exercise_count then
    raise exception 'Preset workout cannot contain duplicate exercises' using errcode = '22023';
  end if;

  select count(*)::integer
  into v_active_count
  from public.exercise_catalog e
  where e.active = true
    and e.id = any(p_exercise_ids);

  if v_active_count <> v_exercise_count then
    raise exception 'Preset workout contains an unavailable exercise' using errcode = '22023';
  end if;

  v_result := public.start_or_resume_lifting_workout_intent(p_action_at);
  v_workout_id := nullif(v_result ->> 'id', '')::uuid;

  if v_workout_id is null then
    raise exception 'Unable to start preset workout' using errcode = 'P0001';
  end if;

  perform 1
  from public.workout_sessions w
  where w.id = v_workout_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS'
  for update;

  if not found then
    raise exception 'Active lifting workout not found' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.workout_exercises we
    where we.workout_id = v_workout_id
  ) then
    raise exception 'Preset workout requires an empty active lift' using errcode = '22023';
  end if;

  insert into public.workout_exercises (workout_id, exercise_id, order_index)
  select
    v_workout_id,
    requested.exercise_id,
    requested.ordinality::integer - 1
  from unnest(p_exercise_ids) with ordinality as requested(exercise_id, ordinality)
  order by requested.ordinality;

  return v_result;
end;
$$;

revoke all on function public.start_lifting_workout_from_preset(uuid[], timestamptz) from public;
revoke all on function public.start_lifting_workout_from_preset(uuid[], timestamptz) from anon;
grant execute on function public.start_lifting_workout_from_preset(uuid[], timestamptz) to authenticated;

comment on function public.start_lifting_workout_from_preset(uuid[], timestamptz)
is 'Atomically starts an empty in-app lifting session and applies an ordered, validated preset exercise list for the authenticated user.';
