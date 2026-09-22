-- Explicit load capabilities for BODYWEIGHT_REPS exercises.
-- Added weight remains available for rep-based bodyweight/plyometric movements.
-- Numeric ASSISTED load is restricted to movements where measurable counterweight assistance is meaningful.

alter table public.exercise_catalog
  add column if not exists supports_added_weight boolean not null default false,
  add column if not exists supports_assisted boolean not null default false;

comment on column public.exercise_catalog.supports_added_weight is
  'Whether BODYWEIGHT_REPS sets may use ADDED_WEIGHT with a numeric external load.';
comment on column public.exercise_catalog.supports_assisted is
  'Whether BODYWEIGHT_REPS sets may use ASSISTED with a numeric counterweight/assistance load.';

update public.exercise_catalog
set supports_added_weight = (measurement_type = 'BODYWEIGHT_REPS'),
    supports_assisted = false;

update public.exercise_catalog
set supports_assisted = true
where active = true
  and measurement_type = 'BODYWEIGHT_REPS'
  and canonical_name in (
    'Pull-Up',
    'Chin-Up',
    'Neutral-Grip Pull-Up',
    'Wide-Grip Pull-Up',
    'Commando Pull-Up',
    'Scapular Pull-Up',
    'Dip'
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'exercise_catalog_load_capability_measurement_check'
      and conrelid = 'public.exercise_catalog'::regclass
  ) then
    alter table public.exercise_catalog
      add constraint exercise_catalog_load_capability_measurement_check
      check (
        measurement_type = 'BODYWEIGHT_REPS'
        or (supports_added_weight = false and supports_assisted = false)
      );
  end if;
end
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
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_measurement_type text;
  v_supports_added_weight boolean;
  v_supports_assisted boolean;
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

  select e.measurement_type, e.supports_added_weight, e.supports_assisted, ws.set_variant, ws.completed_at
  into v_measurement_type, v_supports_added_weight, v_supports_assisted, v_set_variant, v_existing_completed_at
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
    if v_mode = 'ADDED_WEIGHT' and not v_supports_added_weight then
      raise exception 'Added weight is not supported for this exercise' using errcode = '22023';
    end if;
    if v_mode = 'ASSISTED' and not v_supports_assisted then
      raise exception 'Assisted load is not supported for this exercise' using errcode = '22023';
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
$function$;
