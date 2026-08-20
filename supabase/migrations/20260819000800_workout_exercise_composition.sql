-- Workout Game PWA — Phase 6.1B workout exercise composition (v0.4.1)
-- Canonical exercise attachment, removal, and ordering for active in-app lifts.

create unique index if not exists workout_exercises_one_canonical_per_workout
  on public.workout_exercises(workout_id, exercise_id);

create or replace function public.add_lifting_workout_exercise(
  p_workout_id uuid,
  p_exercise_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_id uuid;
  v_workout_exercise_id uuid;
  v_next_order integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform 1
  from public.workout_sessions w
  where w.id = p_workout_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS'
  for update;

  if not found then
    raise exception 'Active lifting workout not found' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.exercise_catalog e
    where e.id = p_exercise_id
      and e.active = true
  ) then
    raise exception 'Active exercise not found' using errcode = '22023';
  end if;

  select we.id
  into v_existing_id
  from public.workout_exercises we
  where we.workout_id = p_workout_id
    and we.exercise_id = p_exercise_id;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  select coalesce(max(we.order_index), -1) + 1
  into v_next_order
  from public.workout_exercises we
  where we.workout_id = p_workout_id;

  begin
    insert into public.workout_exercises (workout_id, exercise_id, order_index)
    values (p_workout_id, p_exercise_id, v_next_order)
    returning id into v_workout_exercise_id;
  exception
    when unique_violation then
      select we.id
      into v_workout_exercise_id
      from public.workout_exercises we
      where we.workout_id = p_workout_id
        and we.exercise_id = p_exercise_id;
  end;

  if v_workout_exercise_id is null then
    raise exception 'Unable to add exercise' using errcode = 'P0001';
  end if;

  return v_workout_exercise_id;
end;
$$;

create or replace function public.remove_lifting_workout_exercise(
  p_workout_exercise_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_workout_id uuid;
  v_removed_order integer;
  v_count integer;
  v_offset integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select we.workout_id, we.order_index
  into v_workout_id, v_removed_order
  from public.workout_exercises we
  join public.workout_sessions w on w.id = we.workout_id
  where we.id = p_workout_exercise_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS'
  for update of w;

  if v_workout_id is null then
    raise exception 'Active workout exercise not found' using errcode = '42501';
  end if;

  perform 1
  from public.workout_exercises we
  where we.workout_id = v_workout_id
  for update;

  delete from public.workout_exercises
  where id = p_workout_exercise_id;

  select count(*), coalesce(max(order_index), -1)
  into v_count, v_offset
  from public.workout_exercises
  where workout_id = v_workout_id;

  if v_count > 0 then
    v_offset := v_offset + v_count + 10;

    update public.workout_exercises
    set order_index = order_index + v_offset
    where workout_id = v_workout_id;

    update public.workout_exercises
    set order_index = order_index - v_offset - case
      when order_index - v_offset > v_removed_order then 1
      else 0
    end
    where workout_id = v_workout_id;
  end if;

  return p_workout_exercise_id;
end;
$$;

create or replace function public.move_lifting_workout_exercise(
  p_workout_exercise_id uuid,
  p_new_order_index integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_workout_id uuid;
  v_old_order integer;
  v_count integer;
  v_max_order integer;
  v_offset integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_new_order_index is null or p_new_order_index < 0 then
    raise exception 'Exercise order is out of range' using errcode = '22023';
  end if;

  select we.workout_id, we.order_index
  into v_workout_id, v_old_order
  from public.workout_exercises we
  join public.workout_sessions w on w.id = we.workout_id
  where we.id = p_workout_exercise_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS'
  for update of w;

  if v_workout_id is null then
    raise exception 'Active workout exercise not found' using errcode = '42501';
  end if;

  perform 1
  from public.workout_exercises we
  where we.workout_id = v_workout_id
  for update;

  select count(*), coalesce(max(order_index), -1)
  into v_count, v_max_order
  from public.workout_exercises
  where workout_id = v_workout_id;

  if p_new_order_index >= v_count then
    raise exception 'Exercise order is out of range' using errcode = '22023';
  end if;

  if p_new_order_index = v_old_order then
    return p_workout_exercise_id;
  end if;

  -- Move the whole set out of the live order range first. This avoids transient
  -- collisions with the existing unique(workout_id, order_index) constraint.
  v_offset := v_max_order + v_count + 10;

  update public.workout_exercises
  set order_index = order_index + v_offset
  where workout_id = v_workout_id;

  update public.workout_exercises
  set order_index = case
    when id = p_workout_exercise_id then p_new_order_index
    when v_old_order < p_new_order_index
      and order_index - v_offset > v_old_order
      and order_index - v_offset <= p_new_order_index
      then order_index - v_offset - 1
    when v_old_order > p_new_order_index
      and order_index - v_offset >= p_new_order_index
      and order_index - v_offset < v_old_order
      then order_index - v_offset + 1
    else order_index - v_offset
  end
  where workout_id = v_workout_id;

  return p_workout_exercise_id;
end;
$$;

-- From this phase onward, exercise composition is mutated only through the
-- guarded RPCs. Owners may still read their exercise rows through RLS.
revoke insert, update, delete on public.workout_exercises from authenticated;
grant select on public.workout_exercises to authenticated;

revoke all on function public.add_lifting_workout_exercise(uuid, uuid) from public, anon, authenticated;
revoke all on function public.remove_lifting_workout_exercise(uuid) from public, anon, authenticated;
revoke all on function public.move_lifting_workout_exercise(uuid, integer) from public, anon, authenticated;

grant execute on function public.add_lifting_workout_exercise(uuid, uuid) to authenticated;
grant execute on function public.remove_lifting_workout_exercise(uuid) to authenticated;
grant execute on function public.move_lifting_workout_exercise(uuid, integer) to authenticated;
