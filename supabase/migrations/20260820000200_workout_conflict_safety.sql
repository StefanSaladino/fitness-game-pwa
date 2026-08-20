-- Fitness Game PWA — Phase 6.4C conflict/destructive-edit safety (v0.5.3)
-- Optimistic concurrency for queued workout edits without introducing a merge engine.

alter table public.workout_exercises
  add column if not exists revision bigint not null default 0;

alter table public.workout_sets
  add column if not exists revision bigint not null default 0;

alter table public.workout_exercises
  drop constraint if exists workout_exercises_revision_nonnegative;
alter table public.workout_exercises
  add constraint workout_exercises_revision_nonnegative check (revision >= 0);

alter table public.workout_sets
  drop constraint if exists workout_sets_revision_nonnegative;
alter table public.workout_sets
  add constraint workout_sets_revision_nonnegative check (revision >= 0);

create or replace function public.bump_workout_row_revision()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.revision := old.revision + 1;
  return new;
end;
$$;

drop trigger if exists workout_exercises_bump_revision on public.workout_exercises;
create trigger workout_exercises_bump_revision
before update on public.workout_exercises
for each row execute function public.bump_workout_row_revision();

drop trigger if exists workout_sets_bump_revision on public.workout_sets;
create trigger workout_sets_bump_revision
before update on public.workout_sets
for each row execute function public.bump_workout_row_revision();

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
