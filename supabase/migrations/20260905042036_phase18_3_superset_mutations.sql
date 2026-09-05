-- Phase 18.3: guarded Superset mutation contract.
-- Superset structure is changed only through the existing idempotent workout
-- mutation queue. These helpers are private and preserve per-row revision
-- conflict checks before applying an atomic group membership update.

create or replace function private.enforce_lifting_superset_shape()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
declare
  v_workout_id uuid := case when tg_op = 'DELETE' then old.workout_id else new.workout_id end;
begin
  if exists (
    select 1
    from public.workout_exercises we
    where we.workout_id = v_workout_id
      and we.superset_group_id is not null
    group by we.superset_group_id
    having count(*) < 2
      or min(we.superset_order) <> 0
      or max(we.superset_order) <> count(*) - 1
  ) then
    raise exception 'Superset membership must contain at least two exercises with contiguous order' using errcode = '23514';
  end if;
  return null;
end;
$$;

drop trigger if exists workout_exercises_superset_shape on public.workout_exercises;
create constraint trigger workout_exercises_superset_shape
after insert or update or delete on public.workout_exercises
deferrable initially deferred
for each row execute function private.enforce_lifting_superset_shape();

revoke all on function private.enforce_lifting_superset_shape() from public, anon, authenticated;

create or replace function private.assert_lifting_superset_snapshot(
  p_workout_id uuid,
  p_superset_group_id uuid,
  p_expected_members jsonb
)
returns void
language plpgsql
set search_path = public, private, pg_temp
as $$
declare
  v_expected jsonb := coalesce(p_expected_members, '[]'::jsonb);
  v_member jsonb;
  v_member_id uuid;
  v_expected_revision bigint;
  v_current_revision bigint;
  v_current_group_id uuid;
  v_current_count integer;
begin
  if p_workout_id is null or p_superset_group_id is null then
    raise exception 'Superset workout and group ids are required' using errcode = '22023';
  end if;
  if jsonb_typeof(v_expected) <> 'array' then
    raise exception 'Superset expected members must be an array' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_expected) item
    group by item ->> 'workoutExerciseId'
    having count(*) > 1
  ) then
    raise exception 'Superset expected members contain duplicates' using errcode = '22023';
  end if;

  perform 1
  from public.workout_exercises we
  where we.workout_id = p_workout_id
    and we.superset_group_id = p_superset_group_id
  for update of we;

  select count(*)::integer
  into v_current_count
  from public.workout_exercises we
  where we.workout_id = p_workout_id
    and we.superset_group_id = p_superset_group_id;

  if v_current_count <> jsonb_array_length(v_expected) then
    raise exception 'WORKOUT_CONFLICT: Superset membership changed on the server.' using errcode = 'P0001';
  end if;

  for v_member in select value from jsonb_array_elements(v_expected)
  loop
    begin
      v_member_id := (v_member ->> 'workoutExerciseId')::uuid;
      v_expected_revision := (v_member ->> 'expectedRevision')::bigint;
    exception when others then
      raise exception 'Superset expected member payload is invalid' using errcode = '22023';
    end;

    if v_member_id is null or v_expected_revision is null or v_expected_revision < 0 then
      raise exception 'Superset expected member payload is invalid' using errcode = '22023';
    end if;

    select we.revision, we.superset_group_id
    into v_current_revision, v_current_group_id
    from public.workout_exercises we
    where we.id = v_member_id
      and we.workout_id = p_workout_id
    for update of we;

    if not found then
      raise exception 'WORKOUT_CONFLICT: Superset exercise was removed on the server.' using errcode = 'P0001';
    end if;
    if v_current_group_id is distinct from p_superset_group_id then
      raise exception 'WORKOUT_CONFLICT: Superset membership changed on the server.' using errcode = 'P0001';
    end if;
    if v_current_revision <> v_expected_revision then
      raise exception 'WORKOUT_CONFLICT: Superset exercise changed on the server.' using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

create or replace function private.set_lifting_workout_superset(
  p_workout_id uuid,
  p_superset_group_id uuid,
  p_expected_members jsonb,
  p_members jsonb
)
returns uuid
language plpgsql
set search_path = public, private, pg_temp
as $$
declare
  v_members jsonb := coalesce(p_members, '[]'::jsonb);
  v_member jsonb;
  v_member_id uuid;
  v_superset_order integer;
  v_expected_revision bigint;
  v_expected_group_id uuid;
  v_current_revision bigint;
  v_current_group_id uuid;
  v_count integer;
  v_distinct_ids integer;
  v_distinct_orders integer;
  v_min_order integer;
  v_max_order integer;
begin
  if jsonb_typeof(v_members) <> 'array' or jsonb_array_length(v_members) < 2 then
    raise exception 'A Superset requires at least two exercises' using errcode = '22023';
  end if;

  select
    count(*)::integer,
    count(distinct item ->> 'workoutExerciseId')::integer,
    count(distinct (item ->> 'supersetOrder')::integer)::integer,
    min((item ->> 'supersetOrder')::integer),
    max((item ->> 'supersetOrder')::integer)
  into v_count, v_distinct_ids, v_distinct_orders, v_min_order, v_max_order
  from jsonb_array_elements(v_members) item;

  if v_count <> v_distinct_ids
    or v_count <> v_distinct_orders
    or v_min_order <> 0
    or v_max_order <> v_count - 1 then
    raise exception 'Superset members and order must be unique and contiguous' using errcode = '22023';
  end if;

  perform private.assert_lifting_superset_snapshot(p_workout_id, p_superset_group_id, p_expected_members);

  for v_member in select value from jsonb_array_elements(v_members)
  loop
    begin
      v_member_id := (v_member ->> 'workoutExerciseId')::uuid;
      v_superset_order := (v_member ->> 'supersetOrder')::integer;
      v_expected_revision := (v_member ->> 'expectedRevision')::bigint;
      v_expected_group_id := (v_member ->> 'expectedSupersetGroupId')::uuid;
    exception when others then
      raise exception 'Superset member payload is invalid' using errcode = '22023';
    end;

    if v_member_id is null or v_expected_revision is null or v_expected_revision < 0 or v_superset_order < 0 then
      raise exception 'Superset member payload is invalid' using errcode = '22023';
    end if;
    if v_expected_group_id is not null and v_expected_group_id <> p_superset_group_id then
      raise exception 'An exercise can only belong to one Superset at a time' using errcode = '22023';
    end if;

    select we.revision, we.superset_group_id
    into v_current_revision, v_current_group_id
    from public.workout_exercises we
    where we.id = v_member_id
      and we.workout_id = p_workout_id
    for update of we;

    if not found then
      raise exception 'WORKOUT_CONFLICT: Superset exercise was removed on the server.' using errcode = 'P0001';
    end if;
    if v_current_revision <> v_expected_revision then
      raise exception 'WORKOUT_CONFLICT: Superset exercise changed on the server.' using errcode = 'P0001';
    end if;
    if v_current_group_id is distinct from v_expected_group_id then
      raise exception 'WORKOUT_CONFLICT: Superset membership changed on the server.' using errcode = 'P0001';
    end if;
    if v_current_group_id is not null and v_current_group_id <> p_superset_group_id then
      raise exception 'WORKOUT_CONFLICT: Exercise already belongs to another Superset.' using errcode = 'P0001';
    end if;
  end loop;

  -- Clear the old group first so a member reorder cannot transiently violate
  -- the unique (workout, group, order) index. Retained rows may advance their
  -- revision twice; callers always reload the authoritative rows after apply.
  update public.workout_exercises
  set superset_group_id = null,
      superset_order = null
  where workout_id = p_workout_id
    and superset_group_id = p_superset_group_id;

  for v_member in select value from jsonb_array_elements(v_members) order by (value ->> 'supersetOrder')::integer
  loop
    v_member_id := (v_member ->> 'workoutExerciseId')::uuid;
    v_superset_order := (v_member ->> 'supersetOrder')::integer;

    update public.workout_exercises
    set superset_group_id = p_superset_group_id,
        superset_order = v_superset_order
    where id = v_member_id
      and workout_id = p_workout_id;
  end loop;

  return p_superset_group_id;
end;
$$;

create or replace function private.clear_lifting_workout_superset(
  p_workout_id uuid,
  p_superset_group_id uuid,
  p_expected_members jsonb
)
returns uuid
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  if jsonb_typeof(coalesce(p_expected_members, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_expected_members, '[]'::jsonb)) < 2 then
    raise exception 'Superset expected members are required' using errcode = '22023';
  end if;

  perform private.assert_lifting_superset_snapshot(p_workout_id, p_superset_group_id, p_expected_members);

  update public.workout_exercises
  set superset_group_id = null,
      superset_order = null
  where workout_id = p_workout_id
    and superset_group_id = p_superset_group_id;

  return p_superset_group_id;
end;
$$;

revoke all on function private.assert_lifting_superset_snapshot(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.set_lifting_workout_superset(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function private.clear_lifting_workout_superset(uuid, uuid, jsonb) from public, anon, authenticated;

create or replace function public.apply_lifting_workout_mutation(
  p_idempotency_key uuid,
  p_workout_id uuid,
  p_mutation_kind text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_existing public.workout_mutation_receipts%rowtype;
  v_result_id uuid;
  v_result jsonb;
  v_inserted boolean := false;
  v_workout_status text;
  v_expected_revision bigint;
  v_current_revision bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_idempotency_key is null then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  if p_workout_id is null then
    raise exception 'Workout id is required' using errcode = '22023';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'Workout mutation payload must be an object' using errcode = '22023';
  end if;

  -- Exact duplicate delivery remains authoritative even if the row revision has
  -- advanced since the original request. The first successful receipt wins.
  select r.*
  into v_existing
  from public.workout_mutation_receipts r
  where r.user_id = v_user_id
    and r.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.workout_id <> p_workout_id
      or v_existing.mutation_kind <> p_mutation_kind
      or v_existing.request_payload <> v_payload then
      raise exception 'Idempotency key was already used for a different workout mutation' using errcode = '22023';
    end if;
    if v_existing.result_payload is null or v_existing.completed_at is null then
      raise exception 'Workout mutation receipt is incomplete' using errcode = '40001';
    end if;
    return v_existing.result_payload;
  end if;

  select w.status::text
  into v_workout_status
  from public.workout_sessions w
  where w.id = p_workout_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
  for update;

  if not found then
    raise exception 'Active lifting workout not found' using errcode = '42501';
  end if;

  if v_workout_status <> 'IN_PROGRESS' then
    raise exception 'WORKOUT_CONFLICT: Workout is no longer active on the server.' using errcode = 'P0001';
  end if;

  -- Destructive/overwrite operations must state the exact row revision they
  -- were based on. A missing revision (including a legacy v0.5.2 queued item)
  -- is intentionally unsafe and requires explicit recovery instead of replay.
  if p_mutation_kind in ('REMOVE_EXERCISE', 'MOVE_EXERCISE', 'COPY_SET', 'SAVE_SET', 'REMOVE_SET') then
    if not (v_payload ? 'expectedRevision')
      or v_payload -> 'expectedRevision' = 'null'::jsonb
      or jsonb_typeof(v_payload -> 'expectedRevision') <> 'number' then
      raise exception 'WORKOUT_CONFLICT: Queued change has no safe server revision.' using errcode = 'P0001';
    end if;

    begin
      v_expected_revision := (v_payload ->> 'expectedRevision')::bigint;
    exception when others then
      raise exception 'Expected revision is invalid' using errcode = '22023';
    end;

    if v_expected_revision < 0 then
      raise exception 'Expected revision is invalid' using errcode = '22023';
    end if;
  end if;

  if p_mutation_kind in ('REMOVE_EXERCISE', 'MOVE_EXERCISE') then
    select we.revision
    into v_current_revision
    from public.workout_exercises we
    where we.id = (v_payload ->> 'workoutExerciseId')::uuid
      and we.workout_id = p_workout_id
    for update of we;

    if not found then
      raise exception 'WORKOUT_CONFLICT: Exercise was removed on the server.' using errcode = 'P0001';
    end if;

    if v_current_revision <> v_expected_revision then
      raise exception 'WORKOUT_CONFLICT: Exercise order changed on the server.' using errcode = 'P0001';
    end if;
  elsif p_mutation_kind in ('COPY_SET', 'SAVE_SET', 'REMOVE_SET') then
    select ws.revision
    into v_current_revision
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    where ws.id = (v_payload ->> 'workoutSetId')::uuid
      and we.workout_id = p_workout_id
    for update of ws;

    if not found then
      raise exception 'WORKOUT_CONFLICT: Set was removed on the server.' using errcode = 'P0001';
    end if;

    if v_current_revision <> v_expected_revision then
      raise exception 'WORKOUT_CONFLICT: Set changed on the server.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.workout_mutation_receipts (
    user_id,
    idempotency_key,
    workout_id,
    mutation_kind,
    request_payload
  ) values (
    v_user_id,
    p_idempotency_key,
    p_workout_id,
    p_mutation_kind,
    v_payload
  )
  on conflict (user_id, idempotency_key) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    select r.*
    into v_existing
    from public.workout_mutation_receipts r
    where r.user_id = v_user_id
      and r.idempotency_key = p_idempotency_key;

    if not found then
      raise exception 'Unable to resolve workout mutation receipt' using errcode = '40001';
    end if;
    if v_existing.workout_id <> p_workout_id
      or v_existing.mutation_kind <> p_mutation_kind
      or v_existing.request_payload <> v_payload then
      raise exception 'Idempotency key was already used for a different workout mutation' using errcode = '22023';
    end if;
    if v_existing.result_payload is null or v_existing.completed_at is null then
      raise exception 'Workout mutation receipt is incomplete' using errcode = '40001';
    end if;
    return v_existing.result_payload;
  end if;

  case p_mutation_kind
    when 'ADD_EXERCISE' then
      v_result_id := public.add_lifting_workout_exercise(
        p_workout_id,
        (v_payload ->> 'exerciseId')::uuid
      );

    when 'REMOVE_EXERCISE' then
      v_result_id := public.remove_lifting_workout_exercise(
        (v_payload ->> 'workoutExerciseId')::uuid
      );

    when 'MOVE_EXERCISE' then
      v_result_id := public.move_lifting_workout_exercise(
        (v_payload ->> 'workoutExerciseId')::uuid,
        (v_payload ->> 'newOrderIndex')::integer
      );

    when 'SET_SUPERSET' then
      v_result_id := private.set_lifting_workout_superset(
        p_workout_id,
        (v_payload ->> 'supersetGroupId')::uuid,
        v_payload -> 'expectedMembers',
        v_payload -> 'members'
      );

    when 'CLEAR_SUPERSET' then
      v_result_id := private.clear_lifting_workout_superset(
        p_workout_id,
        (v_payload ->> 'supersetGroupId')::uuid,
        v_payload -> 'expectedMembers'
      );

    when 'ADD_SET' then
      v_result_id := public.add_lifting_workout_set(
        (v_payload ->> 'workoutExerciseId')::uuid,
        (v_payload ->> 'setType')::public.set_type
      );

    when 'COPY_SET' then
      v_result_id := public.copy_lifting_workout_set(
        (v_payload ->> 'workoutSetId')::uuid
      );

    when 'SAVE_SET' then
      v_result_id := public.save_lifting_workout_set(
        (v_payload ->> 'workoutSetId')::uuid,
        (v_payload ->> 'setType')::public.set_type,
        (v_payload ->> 'weightKg')::numeric,
        (v_payload ->> 'reps')::integer,
        v_payload ->> 'bodyweightMode',
        (v_payload ->> 'completed')::boolean
      );

    when 'REMOVE_SET' then
      v_result_id := public.remove_lifting_workout_set(
        (v_payload ->> 'workoutSetId')::uuid
      );

    else
      raise exception 'Unsupported workout mutation kind' using errcode = '22023';
  end case;

  v_result := jsonb_build_object(
    'idempotencyKey', p_idempotency_key,
    'mutationKind', p_mutation_kind,
    'resultId', v_result_id
  );

  update public.workout_mutation_receipts
  set result_payload = v_result,
      completed_at = clock_timestamp()
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

revoke all on function public.apply_lifting_workout_mutation(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_lifting_workout_mutation(uuid, uuid, text, jsonb) to authenticated;


notify pgrst, 'reload schema';
