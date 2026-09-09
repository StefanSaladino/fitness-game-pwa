-- Top Set — Phase 18.7A Drop Sets + Pyramid workflows
-- Drop Sets become editable/persisted set classifications and count toward volume.
-- Pyramid helpers atomically add ordinary WORKING sets. Scoring/progression rules remain unchanged.

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

  if p_set_type not in ('WARMUP', 'WORKING', 'DROP') then
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

create or replace function public.add_lifting_workout_working_set_sequence(
  p_workout_exercise_id uuid,
  p_count integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_measurement_type text;
  v_first_set_id uuid;
  v_inserted_set_id uuid;
  v_offset integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_count is null or p_count < 2 or p_count > 8 then
    raise exception 'Set sequence count must be between 2 and 8' using errcode = '22023';
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
    raise exception 'Pyramid quick build requires a weighted exercise' using errcode = '22023';
  end if;

  for v_offset in 1..p_count loop
    v_inserted_set_id := public.add_lifting_workout_set(
      p_workout_exercise_id,
      'WORKING'
    );

    if v_offset = 1 then
      v_first_set_id := v_inserted_set_id;
    end if;
  end loop;

  return v_first_set_id;
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

  if p_set_type not in ('WARMUP', 'WORKING', 'DROP') then
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
      'COPY_SET'::text,
      'SAVE_SET'::text,
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

    when 'ADD_SET_SEQUENCE' then
      v_result_id := public.add_lifting_workout_working_set_sequence(
        (v_payload ->> 'workoutExerciseId')::uuid,
        (v_payload ->> 'count')::integer
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
      ws.id as set_id
    from public.workout_sessions w
    join public.workout_exercises we on we.workout_id = w.id
    join public.workout_sets ws on ws.workout_exercise_id = we.id
    where w.user_id = v_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and ws.set_type = 'WORKING'
      and ws.completed
      and coalesce(ws.reps, 0) >= 1
  ), volume_sets as (
    select
      w.scoring_date,
      coalesce(ws.weight_kg, 0::numeric) * ws.reps as set_volume_kg_reps
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
    select
      w.scoring_date,
      count(*)::bigint as event_count
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
    select
      gs.bucket_start::date as bucket_start,
      (gs.bucket_start + interval '6 days')::date as bucket_end
    from generate_series(
      date_trunc('week', v_today::timestamp) - make_interval(weeks => p_week_count - 1),
      date_trunc('week', v_today::timestamp),
      interval '1 week'
    ) as gs(bucket_start)
  ), monthly_periods as (
    select
      gs.bucket_start::date as bucket_start,
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
      count(es.set_id)::bigint as working_set_total,
      coalesce((
        select sum(vs.set_volume_kg_reps)
        from volume_sets vs
        where vs.scoring_date between wp.bucket_start and wp.bucket_end
      ), 0)::numeric as volume_total,
      coalesce((
        select sum(pe.event_count)
        from pr_events pe
        where pe.scoring_date between wp.bucket_start and wp.bucket_end
      ), 0)::bigint as pr_total
    from weekly_periods wp
    left join eligible_sets es
      on es.scoring_date between wp.bucket_start and wp.bucket_end
    group by wp.bucket_start, wp.bucket_end
  ), monthly_aggregates as (
    select
      mp.bucket_start,
      mp.bucket_end,
      count(distinct es.workout_id)::bigint as session_total,
      count(distinct es.exercise_id)::bigint as exercise_total,
      count(es.set_id)::bigint as working_set_total,
      coalesce((
        select sum(vs.set_volume_kg_reps)
        from volume_sets vs
        where vs.scoring_date between mp.bucket_start and mp.bucket_end
      ), 0)::numeric as volume_total,
      coalesce((
        select sum(pe.event_count)
        from pr_events pe
        where pe.scoring_date between mp.bucket_start and mp.bucket_end
      ), 0)::bigint as pr_total
    from monthly_periods mp
    left join eligible_sets es
      on es.scoring_date between mp.bucket_start and mp.bucket_end
    group by mp.bucket_start, mp.bucket_end
  )
  select
    'WEEK'::text,
    wa.bucket_start,
    wa.bucket_end,
    wa.session_total,
    wa.exercise_total,
    wa.working_set_total,
    wa.volume_total,
    wa.pr_total
  from weekly_aggregates wa

  union all

  select
    'MONTH'::text,
    ma.bucket_start,
    ma.bucket_end,
    ma.session_total,
    ma.exercise_total,
    ma.working_set_total,
    ma.volume_total,
    ma.pr_total
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
  with sessions as (
    select
      w.id as workout_id,
      w.scoring_date,
      coalesce(w.ended_at, w.started_at) as observed_at,
      count(*) filter (
        where ws.set_type = 'WORKING'
          and ws.completed
          and coalesce(ws.reps, 0) >= 1
      )::integer as completed_working_sets,
      coalesce(sum(
        case
          when ws.set_type in ('WORKING', 'DROP')
            and ws.completed
            and coalesce(ws.reps, 0) >= 1
            and ws.weight_kg is not null
          then ws.weight_kg * ws.reps
          else 0
        end
      ), 0)::numeric as session_volume_kg_reps,
      max(ws.weight_kg) filter (
        where ws.set_type = 'WORKING'
          and ws.completed
          and coalesce(ws.reps, 0) >= 1
      ) as heaviest_weight_kg,
      max(ws.reps) filter (
        where ws.set_type = 'WORKING'
          and ws.completed
          and coalesce(ws.reps, 0) >= 1
      )::integer as max_completed_reps,
      count(*) filter (
        where ws.set_type = 'WORKING'
          and ws.completed
          and coalesce(ws.reps, 0) >= 1
          and coalesce(ws.bodyweight_mode, 'BODYWEIGHT') = 'BODYWEIGHT'
          and ws.weight_kg is null
      )::integer as plain_bodyweight_sets,
      count(*) filter (
        where ws.set_type = 'WORKING'
          and ws.completed
          and coalesce(ws.reps, 0) >= 1
          and ws.bodyweight_mode = 'ADDED_WEIGHT'
      )::integer as added_weight_sets,
      count(*) filter (
        where ws.set_type = 'WORKING'
          and ws.completed
          and coalesce(ws.reps, 0) >= 1
          and ws.bodyweight_mode = 'ASSISTED'
      )::integer as assisted_sets
    from public.workout_sessions w
    join public.workout_exercises we on we.workout_id = w.id
    join public.workout_sets ws on ws.workout_exercise_id = we.id
    where w.user_id = v_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and we.exercise_id = p_exercise_id
    group by w.id, w.scoring_date, w.ended_at, w.started_at
    having count(*) filter (
      where ws.set_type in ('WORKING', 'DROP')
        and ws.completed
        and coalesce(ws.reps, 0) >= 1
    ) > 0
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
    (
      o.workout_id is not null
      and o.previous_pr_value is not null
      and o.metric_value > o.previous_pr_value
    ) as is_pr,
    coalesce((
      p.source_workout_id = s.workout_id
      and p.metric_type = o.metric_type
    ), false) as is_current_pr,
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

revoke all on function public.add_lifting_workout_working_set_sequence(uuid, integer) from public, anon, authenticated;
grant execute on function public.add_lifting_workout_working_set_sequence(uuid, integer) to authenticated;

-- Re-assert the existing guarded RPC grants after CREATE OR REPLACE.
revoke all on function public.add_lifting_workout_set(uuid, public.set_type) from public, anon, authenticated;
grant execute on function public.add_lifting_workout_set(uuid, public.set_type) to authenticated;

revoke all on function public.save_lifting_workout_set(uuid, public.set_type, numeric, integer, text, boolean) from public, anon, authenticated;
grant execute on function public.save_lifting_workout_set(uuid, public.set_type, numeric, integer, text, boolean) to authenticated;

revoke all on function public.apply_lifting_workout_mutation(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_lifting_workout_mutation(uuid, uuid, text, jsonb) to authenticated;

revoke all on function public.get_my_lifting_calendar_summaries(integer, integer) from public, anon, authenticated;
grant execute on function public.get_my_lifting_calendar_summaries(integer, integer) to authenticated;

revoke all on function public.get_my_exercise_progress_history(uuid) from public, anon, authenticated;
grant execute on function public.get_my_exercise_progress_history(uuid) to authenticated;

comment on function public.add_lifting_workout_working_set_sequence(uuid, integer) is
  'Atomically adds 2-8 ordinary WORKING sets for an active authenticated lifting exercise. Used by Pyramid quick-build workflows.';

comment on function public.get_my_lifting_calendar_summaries(integer, integer) is
  'Returns authenticated-user weekly/monthly completed lifting aggregates. WORKING and DROP sets contribute volume; working-set counts and PR counts retain lifting-v1 semantics.';

comment on function public.get_my_exercise_progress_history(uuid) is
  'Returns authenticated-user session history for one exercise. WORKING and DROP sets contribute volume; progression evidence remains based on existing WORKING-set rules.';

notify pgrst, 'reload schema';
