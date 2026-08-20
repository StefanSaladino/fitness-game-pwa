-- Workout Game PWA — Phase 6.3 set tracking (v0.5.0)
-- Independent per-set logging for active in-app lifting workouts.

alter table public.workout_sets
  add column if not exists bodyweight_mode text;

alter table public.workout_sets
  drop constraint if exists workout_sets_bodyweight_mode_check;

alter table public.workout_sets
  add constraint workout_sets_bodyweight_mode_check check (
    bodyweight_mode is null
    or bodyweight_mode in ('BODYWEIGHT', 'ADDED_WEIGHT', 'ASSISTED')
  );

create or replace function public.add_lifting_workout_set(
  p_workout_exercise_id uuid,
  p_set_type public.set_type default 'WORKING'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_measurement_type text;
  v_set_id uuid;
  v_next_set_number integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_set_type not in ('WARMUP', 'WORKING') then
    raise exception 'Set type is not supported' using errcode = '22023';
  end if;

  select e.measurement_type
  into v_measurement_type
  from public.workout_exercises we
  join public.workout_sessions w on w.id = we.workout_id
  join public.exercise_catalog e on e.id = we.exercise_id
  where we.id = p_workout_exercise_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS'
  for update of w;

  if v_measurement_type is null then
    raise exception 'Active workout exercise not found' using errcode = '42501';
  end if;

  perform 1
  from public.workout_sets ws
  where ws.workout_exercise_id = p_workout_exercise_id
  for update;

  select coalesce(max(ws.set_number), 0) + 1
  into v_next_set_number
  from public.workout_sets ws
  where ws.workout_exercise_id = p_workout_exercise_id;

  insert into public.workout_sets (
    workout_exercise_id,
    set_number,
    set_type,
    bodyweight_mode
  )
  values (
    p_workout_exercise_id,
    v_next_set_number,
    p_set_type,
    case when v_measurement_type = 'BODYWEIGHT_REPS' then 'BODYWEIGHT' else null end
  )
  returning id into v_set_id;

  return v_set_id;
end;
$$;

create or replace function public.copy_lifting_workout_set(
  p_workout_set_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_source public.workout_sets%rowtype;
  v_set_id uuid;
  v_next_set_number integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select ws.*
  into v_source
  from public.workout_sets ws
  join public.workout_exercises we on we.id = ws.workout_exercise_id
  join public.workout_sessions w on w.id = we.workout_id
  where ws.id = p_workout_set_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS'
  for update of ws, w;

  if v_source.id is null then
    raise exception 'Active workout set not found' using errcode = '42501';
  end if;

  perform 1
  from public.workout_sets ws
  where ws.workout_exercise_id = v_source.workout_exercise_id
  for update;

  select coalesce(max(ws.set_number), 0) + 1
  into v_next_set_number
  from public.workout_sets ws
  where ws.workout_exercise_id = v_source.workout_exercise_id;

  insert into public.workout_sets (
    workout_exercise_id,
    set_number,
    set_type,
    weight_kg,
    reps,
    bodyweight_mode,
    completed,
    completed_at
  )
  values (
    v_source.workout_exercise_id,
    v_next_set_number,
    v_source.set_type,
    v_source.weight_kg,
    v_source.reps,
    v_source.bodyweight_mode,
    false,
    null
  )
  returning id into v_set_id;

  return v_set_id;
end;
$$;

create or replace function public.save_lifting_workout_set(
  p_workout_set_id uuid,
  p_set_type public.set_type,
  p_weight_kg numeric,
  p_reps integer,
  p_bodyweight_mode text,
  p_completed boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_measurement_type text;
  v_existing_completed_at timestamptz;
  v_mode text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_set_type not in ('WARMUP', 'WORKING') then
    raise exception 'Set type is not supported' using errcode = '22023';
  end if;

  select e.measurement_type, ws.completed_at
  into v_measurement_type, v_existing_completed_at
  from public.workout_sets ws
  join public.workout_exercises we on we.id = ws.workout_exercise_id
  join public.workout_sessions w on w.id = we.workout_id
  join public.exercise_catalog e on e.id = we.exercise_id
  where ws.id = p_workout_set_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS'
  for update of ws, w;

  if v_measurement_type is null then
    raise exception 'Active workout set not found' using errcode = '42501';
  end if;

  if p_weight_kg is not null and (p_weight_kg < 0 or p_weight_kg > 5000) then
    raise exception 'Weight is out of range' using errcode = '22023';
  end if;

  if p_reps is not null and (p_reps < 1 or p_reps > 999) then
    raise exception 'Reps are out of range' using errcode = '22023';
  end if;


  if v_measurement_type = 'WEIGHT_REPS' then
    if p_bodyweight_mode is not null then
      raise exception 'Bodyweight mode is invalid for this exercise' using errcode = '22023';
    end if;
    if p_completed and (p_weight_kg is null or p_weight_kg <= 0 or p_reps is null) then
      raise exception 'Completed weighted sets require weight and reps' using errcode = '22023';
    end if;
    v_mode := null;
  elsif v_measurement_type = 'BODYWEIGHT_REPS' then
    v_mode := coalesce(p_bodyweight_mode, 'BODYWEIGHT');
    if v_mode not in ('BODYWEIGHT', 'ADDED_WEIGHT', 'ASSISTED') then
      raise exception 'Bodyweight mode is invalid' using errcode = '22023';
    end if;
    if v_mode = 'BODYWEIGHT' and p_weight_kg is not null then
      raise exception 'Plain bodyweight sets cannot include load' using errcode = '22023';
    end if;
    if v_mode in ('ADDED_WEIGHT', 'ASSISTED') and p_weight_kg is not null and p_weight_kg <= 0 then
      raise exception 'Bodyweight load must be positive' using errcode = '22023';
    end if;
    if p_completed and p_reps is null then
      raise exception 'Completed bodyweight sets require reps' using errcode = '22023';
    end if;
    if p_completed and v_mode in ('ADDED_WEIGHT', 'ASSISTED') and (p_weight_kg is null or p_weight_kg <= 0) then
      raise exception 'Loaded bodyweight sets require a positive load' using errcode = '22023';
    end if;
  else
    if p_completed then
      raise exception 'Set completion is not supported for this exercise measurement yet' using errcode = '22023';
    end if;
    v_mode := null;
  end if;

  update public.workout_sets
  set set_type = p_set_type,
      weight_kg = case when v_measurement_type = 'BODYWEIGHT_REPS' and v_mode = 'BODYWEIGHT' then null else p_weight_kg end,
      reps = p_reps,
      bodyweight_mode = v_mode,
      completed = p_completed,
      completed_at = case
        when p_completed then coalesce(v_existing_completed_at, clock_timestamp())
        else null
      end
  where id = p_workout_set_id;

  return p_workout_set_id;
end;
$$;

create or replace function public.remove_lifting_workout_set(
  p_workout_set_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_workout_exercise_id uuid;
  v_removed_set_number integer;
  v_count integer;
  v_max_set integer;
  v_offset integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select ws.workout_exercise_id, ws.set_number
  into v_workout_exercise_id, v_removed_set_number
  from public.workout_sets ws
  join public.workout_exercises we on we.id = ws.workout_exercise_id
  join public.workout_sessions w on w.id = we.workout_id
  where ws.id = p_workout_set_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS'
  for update of ws, w;

  if v_workout_exercise_id is null then
    raise exception 'Active workout set not found' using errcode = '42501';
  end if;

  perform 1
  from public.workout_sets ws
  where ws.workout_exercise_id = v_workout_exercise_id
  for update;

  delete from public.workout_sets
  where id = p_workout_set_id;

  select count(*), coalesce(max(set_number), 0)
  into v_count, v_max_set
  from public.workout_sets
  where workout_exercise_id = v_workout_exercise_id;

  if v_count > 0 then
    v_offset := v_max_set + v_count + 10;

    update public.workout_sets
    set set_number = set_number + v_offset
    where workout_exercise_id = v_workout_exercise_id;

    update public.workout_sets
    set set_number = set_number - v_offset - case
      when set_number - v_offset > v_removed_set_number then 1
      else 0
    end
    where workout_exercise_id = v_workout_exercise_id;
  end if;

  return p_workout_set_id;
end;
$$;

-- Set composition writes are authoritative from this phase onward.
revoke insert, update, delete on public.workout_sets from authenticated;
grant select on public.workout_sets to authenticated;

revoke all on function public.add_lifting_workout_set(uuid, public.set_type) from public, anon, authenticated;
revoke all on function public.copy_lifting_workout_set(uuid) from public, anon, authenticated;
revoke all on function public.save_lifting_workout_set(uuid, public.set_type, numeric, integer, text, boolean) from public, anon, authenticated;
revoke all on function public.remove_lifting_workout_set(uuid) from public, anon, authenticated;

grant execute on function public.add_lifting_workout_set(uuid, public.set_type) to authenticated;
grant execute on function public.copy_lifting_workout_set(uuid) to authenticated;
grant execute on function public.save_lifting_workout_set(uuid, public.set_type, numeric, integer, text, boolean) to authenticated;
grant execute on function public.remove_lifting_workout_set(uuid) to authenticated;
