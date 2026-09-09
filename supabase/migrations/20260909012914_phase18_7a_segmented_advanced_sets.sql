-- Top Set — Phase 18.7A corrective segmented advanced-set model
-- A Drop/Pyramid is one logical workout_set with ordered child load/rep segments.
-- Existing ordinary sets remain unchanged. The already-applied 18.7A migration stays in history.

alter table public.workout_sets
  add column if not exists set_variant text not null default 'STANDARD';

alter table public.workout_sets
  drop constraint if exists workout_sets_set_variant_check;

alter table public.workout_sets
  add constraint workout_sets_set_variant_check check (
    set_variant = any (array[
      'STANDARD'::text,
      'DROP'::text,
      'ASCENDING_PYRAMID'::text,
      'FULL_PYRAMID'::text
    ])
  );

-- Preserve compatibility with any DROP rows that may have been created after the first 18.7A migration.
update public.workout_sets
set set_variant = 'DROP'
where set_type = 'DROP'
  and set_variant = 'STANDARD';

create table if not exists public.workout_set_segments (
  id uuid primary key default gen_random_uuid(),
  workout_set_id uuid not null references public.workout_sets(id) on delete cascade,
  segment_index integer not null check (segment_index >= 0),
  weight_kg numeric check (weight_kg is null or (weight_kg >= 0 and weight_kg <= 5000)),
  reps integer check (reps is null or (reps >= 1 and reps <= 999)),
  created_at timestamptz not null default now(),
  unique (workout_set_id, segment_index)
);

alter table public.workout_set_segments enable row level security;

revoke all on table public.workout_set_segments from public, anon, authenticated;
grant select on table public.workout_set_segments to authenticated;
grant all on table public.workout_set_segments to service_role;

drop policy if exists workout_set_segments_select on public.workout_set_segments;
create policy workout_set_segments_select
on public.workout_set_segments
for select
to authenticated
using (
  exists (
    select 1
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    join public.workout_sessions w on w.id = we.workout_id
    where ws.id = workout_set_segments.workout_set_id
      and w.user_id = (select auth.uid())
  )
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
    set_variant,
    bodyweight_mode
  )
  values (
    p_workout_exercise_id,
    v_next_set_number,
    p_set_type,
    'STANDARD',
    case when v_measurement_type = 'BODYWEIGHT_REPS' then 'BODYWEIGHT' else null end
  )
  returning id into v_set_id;

  return v_set_id;
end;
$$;

create or replace function public.add_lifting_workout_advanced_set(
  p_workout_exercise_id uuid,
  p_variant text
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
  v_set_type public.set_type;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_variant not in ('DROP', 'ASCENDING_PYRAMID', 'FULL_PYRAMID') then
    raise exception 'Advanced set variant is not supported' using errcode = '22023';
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

  if v_measurement_type <> 'WEIGHT_REPS' then
    raise exception 'Advanced load segments require a weighted exercise' using errcode = '22023';
  end if;

  v_set_type := case when p_variant = 'DROP' then 'DROP'::public.set_type else 'WORKING'::public.set_type end;
  v_set_id := public.add_lifting_workout_set(p_workout_exercise_id, 'WORKING'::public.set_type);

  update public.workout_sets
  set set_type = v_set_type,
      set_variant = p_variant
  where id = v_set_id;

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
  v_set_variant text;
  v_existing_completed_at timestamptz;
  v_mode text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_set_type not in ('WARMUP', 'WORKING') then
    raise exception 'Set type is not supported' using errcode = '22023';
  end if;

  select e.measurement_type, ws.set_variant, ws.completed_at
  into v_measurement_type, v_set_variant, v_existing_completed_at
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

  if v_set_variant <> 'STANDARD' then
    raise exception 'Advanced sets must be saved through the advanced-set boundary' using errcode = '22023';
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
      set_variant = 'STANDARD',
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

create or replace function public.save_lifting_workout_advanced_set(
  p_workout_set_id uuid,
  p_variant text,
  p_segments jsonb,
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
  v_existing_variant text;
  v_existing_completed_at timestamptz;
  v_segment_count integer;
  v_min_segments integer;
  v_item jsonb;
  v_index integer;
  v_weight numeric;
  v_reps integer;
  v_mirror_weight numeric;
  v_mirror_reps integer;
  v_set_type public.set_type;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_variant not in ('DROP', 'ASCENDING_PYRAMID', 'FULL_PYRAMID') then
    raise exception 'Advanced set variant is not supported' using errcode = '22023';
  end if;

  if jsonb_typeof(p_segments) <> 'array' then
    raise exception 'Advanced set segments must be an array' using errcode = '22023';
  end if;

  v_segment_count := jsonb_array_length(p_segments);
  v_min_segments := case when p_variant = 'FULL_PYRAMID' then 3 else 2 end;
  if v_segment_count < v_min_segments or v_segment_count > 8 then
    raise exception 'Advanced set segment count is invalid' using errcode = '22023';
  end if;

  select e.measurement_type, ws.set_variant, ws.completed_at
  into v_measurement_type, v_existing_variant, v_existing_completed_at
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

  if v_measurement_type <> 'WEIGHT_REPS' then
    raise exception 'Advanced load segments require a weighted exercise' using errcode = '22023';
  end if;

  if v_existing_variant = 'STANDARD' then
    raise exception 'Standard sets cannot be rewritten through the advanced-set boundary' using errcode = '22023';
  end if;

  v_index := 0;
  for v_item in select value from jsonb_array_elements(p_segments)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Advanced set segment is invalid' using errcode = '22023';
    end if;

    begin
      v_weight := case
        when v_item -> 'weightKg' is null or v_item -> 'weightKg' = 'null'::jsonb then null
        else (v_item ->> 'weightKg')::numeric
      end;
      v_reps := case
        when v_item -> 'reps' is null or v_item -> 'reps' = 'null'::jsonb then null
        else (v_item ->> 'reps')::integer
      end;
    exception when others then
      raise exception 'Advanced set segment values are invalid' using errcode = '22023';
    end;

    if v_weight is not null and (v_weight <= 0 or v_weight > 5000) then
      raise exception 'Advanced set segment weight is out of range' using errcode = '22023';
    end if;
    if v_reps is not null and (v_reps < 1 or v_reps > 999) then
      raise exception 'Advanced set segment reps are out of range' using errcode = '22023';
    end if;
    if p_completed and (v_weight is null or v_reps is null) then
      raise exception 'Completed advanced sets require weight and reps for every segment' using errcode = '22023';
    end if;

    v_index := v_index + 1;
  end loop;

  delete from public.workout_set_segments
  where workout_set_id = p_workout_set_id;

  insert into public.workout_set_segments (workout_set_id, segment_index, weight_kg, reps)
  select
    p_workout_set_id,
    (entry.ordinality - 1)::integer,
    case
      when entry.value -> 'weightKg' is null or entry.value -> 'weightKg' = 'null'::jsonb then null
      else (entry.value ->> 'weightKg')::numeric
    end,
    case
      when entry.value -> 'reps' is null or entry.value -> 'reps' = 'null'::jsonb then null
      else (entry.value ->> 'reps')::integer
    end
  from jsonb_array_elements(p_segments) with ordinality as entry(value, ordinality);

  -- Compatibility mirror: for Pyramids, keep the parent WORKING row aligned to the
  -- best normal Epley candidate so the existing progression engine sees the same
  -- best stage without a new PR formula. DROP remains excluded by its DROP set_type.
  select s.weight_kg, s.reps
  into v_mirror_weight, v_mirror_reps
  from public.workout_set_segments s
  where s.workout_set_id = p_workout_set_id
    and s.weight_kg is not null
    and s.reps between 1 and 12
  order by (s.weight_kg * (1 + s.reps::numeric / 30)) desc, s.segment_index
  limit 1;

  if v_mirror_weight is null then
    select s.weight_kg, s.reps
    into v_mirror_weight, v_mirror_reps
    from public.workout_set_segments s
    where s.workout_set_id = p_workout_set_id
      and s.weight_kg is not null
      and s.reps is not null
    order by s.segment_index
    limit 1;
  end if;

  v_set_type := case when p_variant = 'DROP' then 'DROP'::public.set_type else 'WORKING'::public.set_type end;

  update public.workout_sets
  set set_type = v_set_type,
      set_variant = p_variant,
      weight_kg = v_mirror_weight,
      reps = v_mirror_reps,
      bodyweight_mode = null,
      completed = p_completed,
      completed_at = case
        when p_completed then coalesce(v_existing_completed_at, clock_timestamp())
        else null
      end
  where id = p_workout_set_id;

  return p_workout_set_id;
end;
$$;

create or replace function public.copy_lifting_workout_set(p_workout_set_id uuid)
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
    set_variant,
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
    v_source.set_variant,
    v_source.weight_kg,
    v_source.reps,
    v_source.bodyweight_mode,
    false,
    null
  )
  returning id into v_set_id;

  insert into public.workout_set_segments (workout_set_id, segment_index, weight_kg, reps)
  select v_set_id, s.segment_index, s.weight_kg, s.reps
  from public.workout_set_segments s
  where s.workout_set_id = v_source.id
  order by s.segment_index;

  return v_set_id;
end;
$$;

-- Keep ADD_SET_SEQUENCE in the receipt-kind constraint for historical idempotency
-- receipts created by the short-lived initial 18.7A sequence path. The executable
-- mutation branch and helper RPC are retired below, so new sequence writes remain unsupported.

alter table public.workout_mutation_receipts
  drop constraint if exists workout_mutation_receipts_kind_check;

alter table public.workout_mutation_receipts
  add constraint workout_mutation_receipts_kind_check check (
    mutation_kind = any (array[
      'ADD_EXERCISE'::text,
      'REMOVE_EXERCISE'::text,
      'MOVE_EXERCISE'::text,
      'SET_SUPERSET'::text,
      'CLEAR_SUPERSET'::text,
      'ADD_SET'::text,
      'ADD_SET_SEQUENCE'::text,
      'ADD_ADVANCED_SET'::text,
      'COPY_SET'::text,
      'SAVE_SET'::text,
      'SAVE_ADVANCED_SET'::text,
      'REMOVE_SET'::text
    ])
  );

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

  if p_mutation_kind in ('REMOVE_EXERCISE', 'MOVE_EXERCISE', 'COPY_SET', 'SAVE_SET', 'SAVE_ADVANCED_SET', 'REMOVE_SET') then
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
  elsif p_mutation_kind in ('COPY_SET', 'SAVE_SET', 'SAVE_ADVANCED_SET', 'REMOVE_SET') then
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

    when 'ADD_ADVANCED_SET' then
      v_result_id := public.add_lifting_workout_advanced_set(
        (v_payload ->> 'workoutExerciseId')::uuid,
        v_payload ->> 'variant'
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

    when 'SAVE_ADVANCED_SET' then
      v_result_id := public.save_lifting_workout_advanced_set(
        (v_payload ->> 'workoutSetId')::uuid,
        v_payload ->> 'variant',
        v_payload -> 'segments',
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

-- Calendar volume: ordinary sets use parent values; segmented advanced sets sum all child stages.
create or replace function public.get_my_lifting_calendar_summaries(
  p_week_count integer default 12,
  p_month_count integer default 6
)
returns table (
  period_kind text,
  period_start date,
  period_end date,
  completed_lifting_sessions bigint,
  exercise_count bigint,
  completed_working_sets bigint,
  volume_kg_reps numeric,
  pr_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text := 'UTC';
  v_today date;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_week_count is null or p_week_count < 1 or p_week_count > 52 then
    raise exception 'Week count must be between 1 and 52' using errcode = '22023';
  end if;

  if p_month_count is null or p_month_count < 1 or p_month_count > 24 then
    raise exception 'Month count must be between 1 and 24' using errcode = '22023';
  end if;

  select coalesce(nullif(trim(p.timezone), ''), 'UTC')
  into v_timezone
  from public.profiles p
  where p.id = v_user_id;

  v_timezone := coalesce(v_timezone, 'UTC');
  v_today := (now() at time zone v_timezone)::date;

  return query
  with eligible_sets as (
    select
      w.id as workout_id,
      w.scoring_date,
      we.exercise_id,
      ws.id as set_id,
      (ws.set_type = 'WORKING') as is_working
    from public.workout_sessions w
    join public.workout_exercises we on we.workout_id = w.id
    join public.workout_sets ws on ws.workout_exercise_id = we.id
    where w.user_id = v_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and ws.set_type in ('WORKING', 'DROP')
      and ws.completed
      and coalesce(ws.reps, 0) >= 1
  ), volume_sets as (
    select
      w.scoring_date,
      case
        when ws.set_variant <> 'STANDARD' and exists (
          select 1 from public.workout_set_segments sx where sx.workout_set_id = ws.id
        ) then coalesce((
          select sum(s.weight_kg * s.reps)
          from public.workout_set_segments s
          where s.workout_set_id = ws.id
            and s.weight_kg is not null
            and s.reps is not null
        ), 0::numeric)
        else coalesce(ws.weight_kg, 0::numeric) * coalesce(ws.reps, 0)
      end as set_volume_kg_reps
    from public.workout_sessions w
    join public.workout_exercises we on we.workout_id = w.id
    join public.workout_sets ws on ws.workout_exercise_id = we.id
    where w.user_id = v_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and ws.set_type in ('WORKING', 'DROP')
      and ws.completed
  ), observation_context as (
    select
      o.workout_id,
      o.metric_value,
      max(o.metric_value) over (
        partition by o.exercise_id, o.metric_type
        order by o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as previous_pr_value
    from public.exercise_progress_observations o
    where o.user_id = v_user_id
      and o.valid
  ), pr_events as (
    select w.scoring_date, count(*)::bigint as event_count
    from observation_context o
    join public.workout_sessions w on w.id = o.workout_id
    where w.user_id = v_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and o.previous_pr_value is not null
      and o.metric_value > o.previous_pr_value
    group by w.scoring_date
  ), weekly_periods as (
    select gs.bucket_start::date as bucket_start,
           (gs.bucket_start + interval '6 days')::date as bucket_end
    from generate_series(
      date_trunc('week', v_today::timestamp) - make_interval(weeks => p_week_count - 1),
      date_trunc('week', v_today::timestamp),
      interval '1 week'
    ) as gs(bucket_start)
  ), monthly_periods as (
    select gs.bucket_start::date as bucket_start,
           (gs.bucket_start + interval '1 month' - interval '1 day')::date as bucket_end
    from generate_series(
      date_trunc('month', v_today::timestamp) - make_interval(months => p_month_count - 1),
      date_trunc('month', v_today::timestamp),
      interval '1 month'
    ) as gs(bucket_start)
  ), weekly_aggregates as (
    select
      wp.bucket_start,
      wp.bucket_end,
      count(distinct es.workout_id)::bigint as session_total,
      count(distinct es.exercise_id)::bigint as exercise_total,
      count(es.set_id) filter (where es.is_working)::bigint as working_set_total,
      coalesce((select sum(vs.set_volume_kg_reps) from volume_sets vs where vs.scoring_date between wp.bucket_start and wp.bucket_end), 0)::numeric as volume_total,
      coalesce((select sum(pe.event_count) from pr_events pe where pe.scoring_date between wp.bucket_start and wp.bucket_end), 0)::bigint as pr_total
    from weekly_periods wp
    left join eligible_sets es on es.scoring_date between wp.bucket_start and wp.bucket_end
    group by wp.bucket_start, wp.bucket_end
  ), monthly_aggregates as (
    select
      mp.bucket_start,
      mp.bucket_end,
      count(distinct es.workout_id)::bigint as session_total,
      count(distinct es.exercise_id)::bigint as exercise_total,
      count(es.set_id) filter (where es.is_working)::bigint as working_set_total,
      coalesce((select sum(vs.set_volume_kg_reps) from volume_sets vs where vs.scoring_date between mp.bucket_start and mp.bucket_end), 0)::numeric as volume_total,
      coalesce((select sum(pe.event_count) from pr_events pe where pe.scoring_date between mp.bucket_start and mp.bucket_end), 0)::bigint as pr_total
    from monthly_periods mp
    left join eligible_sets es on es.scoring_date between mp.bucket_start and mp.bucket_end
    group by mp.bucket_start, mp.bucket_end
  )
  select 'WEEK'::text, wa.bucket_start, wa.bucket_end, wa.session_total, wa.exercise_total, wa.working_set_total, wa.volume_total, wa.pr_total
  from weekly_aggregates wa
  union all
  select 'MONTH'::text, ma.bucket_start, ma.bucket_end, ma.session_total, ma.exercise_total, ma.working_set_total, ma.volume_total, ma.pr_total
  from monthly_aggregates ma
  order by 1, 2;
end;
$$;

create or replace function public.get_my_exercise_progress_history(p_exercise_id uuid)
returns table (
  workout_id uuid,
  scoring_date date,
  observed_at timestamptz,
  metric_type text,
  metric_value numeric,
  weight_kg numeric,
  reps integer,
  previous_pr_value numeric,
  is_baseline boolean,
  is_pr boolean,
  is_current_pr boolean,
  completed_working_sets integer,
  session_volume_kg_reps numeric,
  heaviest_weight_kg numeric,
  max_completed_reps integer,
  plain_bodyweight_sets integer,
  added_weight_sets integer,
  assisted_sets integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_exercise_id is null then
    raise exception 'Exercise id is required' using errcode = '22023';
  end if;

  return query
  with set_metrics as (
    select
      w.id as workout_id,
      w.scoring_date,
      coalesce(w.ended_at, w.started_at) as observed_at,
      ws.id as workout_set_id,
      ws.set_type,
      ws.set_variant,
      ws.bodyweight_mode,
      case
        when ws.set_variant <> 'STANDARD' and exists (
          select 1 from public.workout_set_segments sx where sx.workout_set_id = ws.id
        ) then coalesce((
          select sum(s.weight_kg * s.reps)
          from public.workout_set_segments s
          where s.workout_set_id = ws.id
            and s.weight_kg is not null
            and s.reps is not null
        ), 0::numeric)
        when ws.weight_kg is not null and ws.reps is not null then ws.weight_kg * ws.reps
        else 0::numeric
      end as set_volume_kg_reps,
      case
        when ws.set_variant <> 'STANDARD' and exists (
          select 1 from public.workout_set_segments sx where sx.workout_set_id = ws.id
        ) then (
          select max(s.weight_kg)
          from public.workout_set_segments s
          where s.workout_set_id = ws.id and s.weight_kg is not null
        )
        else ws.weight_kg
      end as heaviest_weight_kg,
      case
        when ws.set_variant <> 'STANDARD' and exists (
          select 1 from public.workout_set_segments sx where sx.workout_set_id = ws.id
        ) then (
          select max(s.reps)
          from public.workout_set_segments s
          where s.workout_set_id = ws.id and s.reps is not null
        )
        else ws.reps
      end as max_completed_reps,
      ws.weight_kg,
      ws.reps
    from public.workout_sessions w
    join public.workout_exercises we on we.workout_id = w.id
    join public.workout_sets ws on ws.workout_exercise_id = we.id
    where w.user_id = v_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and we.exercise_id = p_exercise_id
      and ws.completed
      and ws.set_type in ('WORKING', 'DROP')
  ), sessions as (
    select
      sm.workout_id,
      sm.scoring_date,
      sm.observed_at,
      count(*) filter (where sm.set_type = 'WORKING')::integer as completed_working_sets,
      coalesce(sum(sm.set_volume_kg_reps), 0)::numeric as session_volume_kg_reps,
      max(sm.heaviest_weight_kg) filter (where sm.set_type = 'WORKING') as heaviest_weight_kg,
      max(sm.max_completed_reps) filter (where sm.set_type = 'WORKING')::integer as max_completed_reps,
      count(*) filter (
        where sm.set_type = 'WORKING'
          and sm.set_variant = 'STANDARD'
          and coalesce(sm.bodyweight_mode, 'BODYWEIGHT') = 'BODYWEIGHT'
          and sm.weight_kg is null
          and coalesce(sm.reps, 0) >= 1
      )::integer as plain_bodyweight_sets,
      count(*) filter (
        where sm.set_type = 'WORKING'
          and sm.set_variant = 'STANDARD'
          and sm.bodyweight_mode = 'ADDED_WEIGHT'
          and coalesce(sm.reps, 0) >= 1
      )::integer as added_weight_sets,
      count(*) filter (
        where sm.set_type = 'WORKING'
          and sm.set_variant = 'STANDARD'
          and sm.bodyweight_mode = 'ASSISTED'
          and coalesce(sm.reps, 0) >= 1
      )::integer as assisted_sets
    from set_metrics sm
    group by sm.workout_id, sm.scoring_date, sm.observed_at
  ), observations as (
    select
      o.*,
      max(o.metric_value) over (
        partition by o.exercise_id, o.metric_type
        order by o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as previous_pr_value
    from public.exercise_progress_observations o
    where o.user_id = v_user_id
      and o.exercise_id = p_exercise_id
      and o.valid
  )
  select
    s.workout_id,
    s.scoring_date,
    s.observed_at,
    o.metric_type,
    o.metric_value,
    o.weight_kg,
    o.reps,
    o.previous_pr_value,
    (o.workout_id is not null and o.previous_pr_value is null) as is_baseline,
    (o.workout_id is not null and o.previous_pr_value is not null and o.metric_value > o.previous_pr_value) as is_pr,
    coalesce((p.source_workout_id = s.workout_id and p.metric_type = o.metric_type), false) as is_current_pr,
    s.completed_working_sets,
    s.session_volume_kg_reps,
    s.heaviest_weight_kg,
    s.max_completed_reps,
    s.plain_bodyweight_sets,
    s.added_weight_sets,
    s.assisted_sets
  from sessions s
  left join observations o on o.workout_id = s.workout_id
  left join public.exercise_progress p
    on p.user_id = v_user_id
   and p.exercise_id = p_exercise_id
   and p.metric_type = o.metric_type
  order by s.observed_at desc, s.workout_id desc;
end;
$$;

-- Retire the incorrect "N independent working sets" Pyramid helper.
drop function if exists public.add_lifting_workout_working_set_sequence(uuid, integer);

revoke all on function public.add_lifting_workout_set(uuid, public.set_type) from public, anon, authenticated;
grant execute on function public.add_lifting_workout_set(uuid, public.set_type) to authenticated;

revoke all on function public.save_lifting_workout_set(uuid, public.set_type, numeric, integer, text, boolean) from public, anon, authenticated;
grant execute on function public.save_lifting_workout_set(uuid, public.set_type, numeric, integer, text, boolean) to authenticated;

revoke all on function public.add_lifting_workout_advanced_set(uuid, text) from public, anon, authenticated;
grant execute on function public.add_lifting_workout_advanced_set(uuid, text) to authenticated;

revoke all on function public.save_lifting_workout_advanced_set(uuid, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.save_lifting_workout_advanced_set(uuid, text, jsonb, boolean) to authenticated;

revoke all on function public.add_lifting_workout_set(uuid, public.set_type) from public, anon, authenticated;
grant execute on function public.add_lifting_workout_set(uuid, public.set_type) to authenticated;

revoke all on function public.copy_lifting_workout_set(uuid) from public, anon, authenticated;
grant execute on function public.copy_lifting_workout_set(uuid) to authenticated;

revoke all on function public.apply_lifting_workout_mutation(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_lifting_workout_mutation(uuid, uuid, text, jsonb) to authenticated;

revoke all on function public.get_my_lifting_calendar_summaries(integer, integer) from public, anon, authenticated;
grant execute on function public.get_my_lifting_calendar_summaries(integer, integer) to authenticated;

revoke all on function public.get_my_exercise_progress_history(uuid) from public, anon, authenticated;
grant execute on function public.get_my_exercise_progress_history(uuid) to authenticated;

comment on table public.workout_set_segments is
  'Ordered load/repetition stages inside one logical advanced workout set. Writes are guarded by authenticated RPCs.';
comment on column public.workout_sets.set_variant is
  'STANDARD, DROP, ASCENDING_PYRAMID, or FULL_PYRAMID workflow metadata for one logical workout set.';
comment on function public.add_lifting_workout_advanced_set(uuid, text) is
  'Creates one incomplete weighted logical set for DROP, ASCENDING_PYRAMID, or FULL_PYRAMID stage editing.';
comment on function public.save_lifting_workout_advanced_set(uuid, text, jsonb, boolean) is
  'Atomically replaces all ordered stages for one active advanced weighted set and updates the parent compatibility mirror.';
comment on function public.get_my_lifting_calendar_summaries(integer, integer) is
  'Returns authenticated-user lifting aggregates. Advanced sets count as one logical set; all child stages contribute volume.';
comment on function public.get_my_exercise_progress_history(uuid) is
  'Returns authenticated-user exercise history. Advanced sets count once while all child stages contribute volume; Pyramid parent mirrors preserve normal E1RM semantics.';

notify pgrst, 'reload schema';
