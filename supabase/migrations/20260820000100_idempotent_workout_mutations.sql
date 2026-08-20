-- Fitness Game PWA — Phase 6.4B idempotent workout mutation boundary (v0.5.2)
-- Every queued workout-capture write receives a durable per-user idempotency key.

create table if not exists public.workout_mutation_receipts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  idempotency_key uuid not null,
  workout_id uuid not null references public.workout_sessions(id) on delete cascade,
  mutation_kind text not null,
  request_payload jsonb not null,
  result_payload jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, idempotency_key),
  constraint workout_mutation_receipts_kind_check check (
    mutation_kind in (
      'ADD_EXERCISE', 'REMOVE_EXERCISE', 'MOVE_EXERCISE',
      'ADD_SET', 'COPY_SET', 'SAVE_SET', 'REMOVE_SET'
    )
  )
);

create index if not exists workout_mutation_receipts_workout_created_idx
  on public.workout_mutation_receipts(workout_id, created_at);

alter table public.workout_mutation_receipts enable row level security;
revoke all on public.workout_mutation_receipts from public, anon, authenticated;

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

  perform 1
  from public.workout_sessions w
  where w.id = p_workout_id
    and w.user_id = v_user_id
    and w.category = 'STRENGTH'
    and w.source = 'IN_APP'
    and w.status = 'IN_PROGRESS';

  if not found then
    raise exception 'Active lifting workout not found' using errcode = '42501';
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
