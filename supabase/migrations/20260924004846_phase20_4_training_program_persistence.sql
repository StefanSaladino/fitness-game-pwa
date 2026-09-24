-- Phase 20.4: durable personalized-program persistence and workout lineage.

create table public.training_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  version text not null check (version = 'training-program-v1'),
  goal text not null check (goal in ('STRENGTH','HYPERTROPHY','BALANCED')),
  duration_weeks smallint not null check (duration_weeks in (4,8)),
  sessions_per_week smallint not null check (sessions_per_week between 1 and 6),
  start_date date not null,
  end_date date not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','ACTIVE','COMPLETED','ARCHIVED')),
  generator_version text not null check (generator_version = 'training-program-v1'),
  generated_at timestamptz not null,
  history_through_date date not null,
  muscle_volume_methodology_version text not null
    references public.muscle_volume_methodologies(version) on delete restrict,
  profile_revision bigint not null check (profile_revision >= 1),
  constraint_revision bigint not null check (constraint_revision >= 0),
  training_days text[] not null,
  requested_split text not null,
  resolved_split text not null,
  source_snapshot jsonb not null check (jsonb_typeof(source_snapshot) = 'object'),
  revision bigint not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_program_end_date_check
    check (end_date = start_date + ((duration_weeks::integer * 7) - 1)),
  constraint training_program_day_count_check
    check (cardinality(training_days) = sessions_per_week)
);

create unique index training_programs_one_active_per_user
  on public.training_programs(user_id)
  where status = 'ACTIVE';

create index training_programs_user_created_idx
  on public.training_programs(user_id, created_at desc);

create table public.training_program_workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  week_index smallint not null check (week_index >= 0),
  session_index smallint not null check (session_index >= 0),
  scheduled_date date not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  execution_status text not null default 'PLANNED'
    check (execution_status in (
      'PLANNED',
      'STARTED_PROGRAMMED',
      'STARTED_OWN_WORKOUT',
      'COMPLETED_PROGRAMMED',
      'COMPLETED_OWN_WORKOUT',
      'MISSED'
    )),
  workout_session_id uuid unique
    references public.workout_sessions(id) on delete restrict,
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, week_index, session_index),
  unique(program_id, scheduled_date),
  constraint training_program_workout_lineage_shape check (
    (
      execution_status in ('PLANNED','MISSED')
      and workout_session_id is null
    )
    or
    (
      execution_status in (
        'STARTED_PROGRAMMED',
        'STARTED_OWN_WORKOUT',
        'COMPLETED_PROGRAMMED',
        'COMPLETED_OWN_WORKOUT'
      )
      and workout_session_id is not null
    )
  )
);

create index training_program_workouts_program_date_idx
  on public.training_program_workouts(program_id, scheduled_date);

create table public.training_program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_workout_id uuid not null
    references public.training_program_workouts(id) on delete cascade,
  exercise_id uuid not null
    references public.exercise_catalog(id) on delete restrict,
  canonical_name text not null
    check (char_length(btrim(canonical_name)) between 1 and 160),
  order_index smallint not null check (order_index between 0 and 7),
  target_muscle_group text not null check (target_muscle_group in (
    'CHEST','LATS','UPPER_BACK','TRAPS','SPINAL_ERECTORS',
    'ANTERIOR_DELTS','LATERAL_DELTS','POSTERIOR_DELTS',
    'BICEPS','TRICEPS','QUADS','HAMSTRINGS','GLUTES','CALVES',
    'FOREARMS_GRIP','CORE','OBLIQUES','NECK'
  )),
  target_contribution_role text not null
    check (target_contribution_role in ('DIRECT','INDIRECT')),
  selection_intent text not null
    check (selection_intent in ('COMPOUND','ACCESSORY')),
  measurement_type text not null
    check (measurement_type in ('WEIGHT_REPS','BODYWEIGHT_REPS')),
  working_sets smallint not null check (working_sets between 1 and 8),
  reps_min smallint not null check (reps_min between 1 and 30),
  reps_max smallint not null check (reps_max between 1 and 30 and reps_max >= reps_min),
  target_weight_kg numeric check (target_weight_kg is null or target_weight_kg > 0),
  bodyweight_mode text check (
    bodyweight_mode is null
    or bodyweight_mode in ('BODYWEIGHT','ADDED_WEIGHT','ASSISTED')
  ),
  superset_group_index smallint check (
    superset_group_index is null or superset_group_index >= 0
  ),
  superset_order smallint check (
    superset_order is null or superset_order >= 0
  ),
  created_at timestamptz not null default now(),
  unique(program_workout_id, order_index),
  unique(program_workout_id, exercise_id),
  constraint training_program_exercise_load_shape check (
    (
      measurement_type = 'WEIGHT_REPS'
      and bodyweight_mode is null
    )
    or
    (
      measurement_type = 'BODYWEIGHT_REPS'
      and bodyweight_mode is not null
      and (
        bodyweight_mode <> 'BODYWEIGHT'
        or target_weight_kg is null
      )
    )
  ),
  constraint training_program_exercise_superset_pair check (
    (superset_group_index is null and superset_order is null)
    or
    (superset_group_index is not null and superset_order is not null)
  )
);

create index training_program_exercises_workout_order_idx
  on public.training_program_exercises(program_workout_id, order_index);

create unique index training_program_exercises_superset_member_order_idx
  on public.training_program_exercises(
    program_workout_id,
    superset_group_index,
    superset_order
  )
  where superset_group_index is not null;

alter table public.training_programs enable row level security;
alter table public.training_program_workouts enable row level security;
alter table public.training_program_exercises enable row level security;

create policy training_programs_select_own
on public.training_programs
for select to authenticated
using ((select auth.uid()) = user_id);

create policy training_program_workouts_select_own
on public.training_program_workouts
for select to authenticated
using (
  exists (
    select 1
    from public.training_programs tp
    where tp.id = program_id
      and tp.user_id = (select auth.uid())
  )
);

create policy training_program_exercises_select_own
on public.training_program_exercises
for select to authenticated
using (
  exists (
    select 1
    from public.training_program_workouts tpw
    join public.training_programs tp on tp.id = tpw.program_id
    where tpw.id = program_workout_id
      and tp.user_id = (select auth.uid())
  )
);

revoke all on table public.training_programs from public, anon, authenticated;
revoke all on table public.training_program_workouts from public, anon, authenticated;
revoke all on table public.training_program_exercises from public, anon, authenticated;
grant select on table public.training_programs to authenticated;
grant select on table public.training_program_workouts to authenticated;
grant select on table public.training_program_exercises to authenticated;

create or replace function private.training_program_split_is_compatible(
  p_sessions integer,
  p_requested text,
  p_resolved text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_requested = 'AUTO' then
      p_resolved = case p_sessions
        when 1 then 'FULL_BODY'
        when 2 then 'FULL_BODY_AB'
        when 3 then 'FULL_BODY_ABC'
        when 4 then 'UPPER_LOWER_X2'
        when 5 then 'UPPER_LOWER_PPL'
        when 6 then 'PPL_X2'
        else null
      end
    else
      p_requested = p_resolved
      and p_resolved = any(
        case p_sessions
          when 1 then array['FULL_BODY']
          when 2 then array['FULL_BODY_AB','UPPER_LOWER']
          when 3 then array['FULL_BODY_ABC','PUSH_PULL_LEGS','UPPER_LOWER_FULL_BODY']
          when 4 then array['UPPER_LOWER_X2','PUSH_PULL_UPPER_LOWER']
          when 5 then array['PPL_UPPER_LOWER','UPPER_LOWER_PPL']
          when 6 then array['PPL_X2','UPPER_LOWER_X3']
          else array[]::text[]
        end
      )
  end;
$$;

create or replace function private.training_program_day_name(p_date date)
returns text
language sql
immutable
set search_path = ''
as $$
  select case extract(isodow from p_date)::integer
    when 1 then 'MONDAY'
    when 2 then 'TUESDAY'
    when 3 then 'WEDNESDAY'
    when 4 then 'THURSDAY'
    when 5 then 'FRIDAY'
    when 6 then 'SATURDAY'
    when 7 then 'SUNDAY'
  end;
$$;

create or replace function public.create_my_training_program(p_program jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_source jsonb;
  v_workout jsonb;
  v_exercise jsonb;
  v_program_id uuid;
  v_program_workout_id uuid;
  v_version text;
  v_goal text;
  v_duration integer;
  v_sessions integer;
  v_start_date date;
  v_end_date date;
  v_generated_at timestamptz;
  v_history_through_date date;
  v_methodology text;
  v_profile_revision bigint;
  v_constraint_revision bigint;
  v_training_days text[];
  v_requested_split text;
  v_resolved_split text;
  v_week integer;
  v_session integer;
  v_scheduled_date date;
  v_title text;
  v_offset integer;
  v_exercise_id uuid;
  v_catalog_name text;
  v_catalog_measurement text;
  v_supports_added boolean;
  v_supports_assisted boolean;
  v_measurement text;
  v_target_group text;
  v_target_role text;
  v_selection_intent text;
  v_bodyweight_mode text;
  v_target_weight numeric;
  v_superset_group integer;
  v_superset_order integer;
  v_working_sets integer;
  v_reps_min integer;
  v_reps_max integer;
  v_order_index integer;
begin
  v_actor := private.require_active_account();

  if p_program is null or jsonb_typeof(p_program) <> 'object' then
    raise exception 'Training program payload must be an object' using errcode='22023';
  end if;

  v_source := p_program->'source';
  if v_source is null or jsonb_typeof(v_source) <> 'object' then
    raise exception 'Training program source snapshot is required' using errcode='22023';
  end if;

  v_version := p_program->>'version';
  v_goal := p_program->>'goal';
  v_duration := nullif(p_program->>'weeks','')::integer;
  v_sessions := nullif(p_program->>'sessionsPerWeek','')::integer;
  v_start_date := nullif(v_source->>'startDate','')::date;
  v_generated_at := nullif(v_source->>'generatedAt','')::timestamptz;
  v_history_through_date := nullif(v_source->>'historyThroughDate','')::date;
  v_methodology := v_source->>'muscleVolumeMethodologyVersion';
  v_profile_revision := nullif(v_source->>'profileRevision','')::bigint;
  v_constraint_revision := nullif(v_source->>'constraintRevision','')::bigint;
  v_requested_split := v_source->>'requestedSplit';
  v_resolved_split := v_source->>'resolvedSplit';

  if jsonb_typeof(v_source->'trainingDays') <> 'array' then
    raise exception 'Training days must be an array' using errcode='22023';
  end if;

  select array_agg(day_value order by ordinality)
  into v_training_days
  from jsonb_array_elements_text(v_source->'trainingDays')
       with ordinality as d(day_value, ordinality);

  if v_version <> 'training-program-v1'
     or v_source->>'generatorVersion' <> 'training-program-v1'
     or v_goal not in ('STRENGTH','HYPERTROPHY','BALANCED')
     or v_duration not in (4,8)
     or v_sessions not between 1 and 6
     or nullif(v_source->>'durationWeeks','')::integer <> v_duration
     or v_start_date is null
     or v_generated_at is null
     or v_history_through_date is null
     or v_profile_revision is null or v_profile_revision < 1
     or v_constraint_revision is null or v_constraint_revision < 0
  then
    raise exception 'Training program header is invalid' using errcode='22023';
  end if;

  if not exists (
    select 1 from public.muscle_volume_methodologies
    where version = v_methodology
  ) then
    raise exception 'Training program methodology is invalid' using errcode='22023';
  end if;

  if cardinality(v_training_days) <> v_sessions
     or (
       select count(distinct day_value)
       from unnest(v_training_days) day_value
     ) <> v_sessions
     or exists (
       select 1
       from unnest(v_training_days) day_value
       where day_value not in (
         'MONDAY','TUESDAY','WEDNESDAY','THURSDAY',
         'FRIDAY','SATURDAY','SUNDAY'
       )
     )
  then
    raise exception 'Training program weekdays are invalid' using errcode='22023';
  end if;

  if not private.training_program_split_is_compatible(
    v_sessions,
    v_requested_split,
    v_resolved_split
  ) then
    raise exception 'Training program split is incompatible with frequency'
      using errcode='22023';
  end if;

  if jsonb_typeof(p_program->'workouts') <> 'array'
     or jsonb_array_length(p_program->'workouts') <> v_duration * v_sessions
  then
    raise exception 'Training program workout count is invalid' using errcode='22023';
  end if;

  v_end_date := v_start_date + ((v_duration * 7) - 1);

  insert into public.training_programs(
    user_id,version,goal,duration_weeks,sessions_per_week,
    start_date,end_date,status,generator_version,generated_at,
    history_through_date,muscle_volume_methodology_version,
    profile_revision,constraint_revision,training_days,
    requested_split,resolved_split,source_snapshot
  )
  values(
    v_actor,v_version,v_goal,v_duration,v_sessions,
    v_start_date,v_end_date,'DRAFT','training-program-v1',v_generated_at,
    v_history_through_date,v_methodology,
    v_profile_revision,v_constraint_revision,v_training_days,
    v_requested_split,v_resolved_split,v_source
  )
  returning id into v_program_id;

  for v_workout in
    select value from jsonb_array_elements(p_program->'workouts')
  loop
    v_week := nullif(v_workout->>'weekIndex','')::integer;
    v_session := nullif(v_workout->>'sessionIndex','')::integer;
    v_scheduled_date := nullif(v_workout->>'scheduledDate','')::date;
    v_title := btrim(v_workout->>'title');
    v_offset := v_scheduled_date - v_start_date;

    if jsonb_typeof(v_workout) <> 'object'
       or v_week is null or v_week < 0 or v_week >= v_duration
       or v_session is null or v_session < 0 or v_session >= v_sessions
       or v_scheduled_date is null
       or v_offset < 0 or v_offset >= v_duration * 7
       or floor(v_offset::numeric / 7)::integer <> v_week
       or not (private.training_program_day_name(v_scheduled_date) = any(v_training_days))
       or v_title is null or char_length(v_title) not between 1 and 120
       or jsonb_typeof(v_workout->'exercises') <> 'array'
       or jsonb_array_length(v_workout->'exercises') not between 1 and 8
    then
      raise exception 'Training program workout is invalid' using errcode='22023';
    end if;

    insert into public.training_program_workouts(
      program_id,week_index,session_index,scheduled_date,title
    )
    values(v_program_id,v_week,v_session,v_scheduled_date,v_title)
    returning id into v_program_workout_id;

    for v_exercise in
      select value from jsonb_array_elements(v_workout->'exercises')
    loop
      v_exercise_id := nullif(v_exercise->>'exerciseId','')::uuid;
      v_order_index := nullif(v_exercise->>'orderIndex','')::integer;
      v_target_group := v_exercise->>'targetMuscleGroup';
      v_target_role := v_exercise->>'targetContributionRole';
      v_selection_intent := v_exercise->>'selectionIntent';
      v_measurement := v_exercise->>'measurementType';
      v_working_sets := nullif(v_exercise->>'workingSets','')::integer;
      v_reps_min := nullif(v_exercise->>'repsMin','')::integer;
      v_reps_max := nullif(v_exercise->>'repsMax','')::integer;
      v_target_weight := nullif(v_exercise->>'targetWeightKg','')::numeric;
      v_bodyweight_mode := nullif(v_exercise->>'bodyweightMode','');
      v_superset_group := nullif(v_exercise->>'supersetGroupIndex','')::integer;
      v_superset_order := nullif(v_exercise->>'supersetOrder','')::integer;

      select
        ec.canonical_name,
        ec.measurement_type,
        ec.supports_added_weight,
        ec.supports_assisted
      into
        v_catalog_name,
        v_catalog_measurement,
        v_supports_added,
        v_supports_assisted
      from public.exercise_catalog ec
      where ec.id = v_exercise_id
        and ec.active = true;

      if jsonb_typeof(v_exercise) <> 'object'
         or v_catalog_name is null
         or v_catalog_name <> v_exercise->>'canonicalName'
         or v_measurement <> v_catalog_measurement
         or v_measurement not in ('WEIGHT_REPS','BODYWEIGHT_REPS')
         or v_order_index is null or v_order_index not between 0 and 7
         or v_working_sets is null or v_working_sets not between 1 and 8
         or v_reps_min is null or v_reps_min not between 1 and 30
         or v_reps_max is null or v_reps_max not between v_reps_min and 30
         or v_target_role not in ('DIRECT','INDIRECT')
         or v_selection_intent not in ('COMPOUND','ACCESSORY')
         or (v_measurement='WEIGHT_REPS' and v_bodyweight_mode is not null)
         or (
           v_measurement='BODYWEIGHT_REPS'
           and v_bodyweight_mode not in ('BODYWEIGHT','ADDED_WEIGHT','ASSISTED')
         )
         or (v_bodyweight_mode='ADDED_WEIGHT' and not v_supports_added)
         or (v_bodyweight_mode='ASSISTED' and not v_supports_assisted)
         or (v_bodyweight_mode='BODYWEIGHT' and v_target_weight is not null)
         or (v_target_weight is not null and v_target_weight <= 0)
         or ((v_superset_group is null) <> (v_superset_order is null))
      then
        raise exception 'Training program exercise is invalid' using errcode='22023';
      end if;

      if not exists (
        select 1
        from public.muscle_volume_exercise_rules r
        join public.muscle_volume_exercise_contributions c
          on c.methodology_version = r.methodology_version
         and c.exercise_id = r.exercise_id
        where r.methodology_version = v_methodology
          and r.exercise_id = v_exercise_id
          and r.volume_eligible = true
          and c.muscle_group = v_target_group
          and c.contribution_role = v_target_role
      ) then
        raise exception 'Training program exercise target mapping is invalid'
          using errcode='22023';
      end if;

      insert into public.training_program_exercises(
        program_workout_id,exercise_id,canonical_name,order_index,
        target_muscle_group,target_contribution_role,selection_intent,
        measurement_type,working_sets,reps_min,reps_max,target_weight_kg,
        bodyweight_mode,superset_group_index,superset_order
      )
      values(
        v_program_workout_id,v_exercise_id,v_catalog_name,v_order_index,
        v_target_group,v_target_role,v_selection_intent,
        v_measurement,v_working_sets,v_reps_min,v_reps_max,v_target_weight,
        v_bodyweight_mode,v_superset_group,v_superset_order
      );
    end loop;

    if exists (
      select 1
      from (
        select
          order_index,
          row_number() over (order by order_index) - 1 as expected_order
        from public.training_program_exercises
        where program_workout_id=v_program_workout_id
      ) q
      where q.order_index <> q.expected_order
    ) then
      raise exception 'Training program exercise order is invalid'
        using errcode='22023';
    end if;

    if exists (
      select 1
      from (
        select
          superset_group_index,
          count(*) as member_count,
          min(superset_order) as min_order,
          max(superset_order) as max_order,
          count(distinct superset_order) as distinct_orders
        from public.training_program_exercises
        where program_workout_id=v_program_workout_id
          and superset_group_index is not null
        group by superset_group_index
      ) s
      where s.member_count < 2
         or s.min_order <> 0
         or s.max_order <> s.member_count - 1
         or s.distinct_orders <> s.member_count
    ) then
      raise exception 'Training program Superset structure is invalid'
        using errcode='22023';
    end if;
  end loop;

  if exists (
    select 1
    from (
      select
        week_index,
        session_index,
        row_number() over (
          partition by week_index order by scheduled_date
        ) - 1 as expected_session_index,
        count(*) over (partition by week_index) as week_count
      from public.training_program_workouts
      where program_id = v_program_id
    ) s
    where s.week_count <> v_sessions
       or s.session_index <> s.expected_session_index
  ) then
    raise exception 'Training program workout schedule ordering is invalid'
      using errcode='22023';
  end if;

  return v_program_id;
end;
$$;

revoke all on function public.create_my_training_program(jsonb)
from public, anon, authenticated;
grant execute on function public.create_my_training_program(jsonb)
to authenticated;

create or replace function public.set_my_training_program_status(
  p_program_id uuid,
  p_status text,
  p_expected_revision bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_row public.training_programs%rowtype;
begin
  v_actor := private.require_active_account();

  select *
  into v_row
  from public.training_programs
  where id = p_program_id
    and user_id = v_actor
  for update;

  if not found then
    raise exception 'Training program not found' using errcode='42501';
  end if;

  if p_expected_revision is null or p_expected_revision <> v_row.revision then
    raise exception 'Training program changed. Reload and try again.'
      using errcode='40001';
  end if;

  if not (
    (v_row.status='DRAFT' and p_status in ('ACTIVE','ARCHIVED'))
    or (v_row.status='ACTIVE' and p_status in ('COMPLETED','ARCHIVED'))
    or (v_row.status='COMPLETED' and p_status='ARCHIVED')
  ) then
    raise exception 'Training program status transition is invalid'
      using errcode='22023';
  end if;

  update public.training_programs
  set status=p_status,
      revision=revision+1,
      updated_at=now()
  where id=p_program_id
  returning * into v_row;

  return jsonb_build_object(
    'programId',v_row.id,
    'status',v_row.status,
    'revision',v_row.revision
  );
end;
$$;

revoke all on function public.set_my_training_program_status(uuid,text,bigint)
from public, anon, authenticated;
grant execute on function public.set_my_training_program_status(uuid,text,bigint)
to authenticated;

create or replace function public.launch_my_training_program_workout(
  p_program_workout_id uuid,
  p_action_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_program_workout public.training_program_workouts%rowtype;
  v_program public.training_programs%rowtype;
  v_exercise_ids uuid[];
  v_superset_groups jsonb;
  v_result jsonb;
  v_workout_id uuid;
  v_plan_exercise record;
  v_workout_exercise_id uuid;
  v_set_number integer;
begin
  v_actor := private.require_active_account();

  select tpw.*
  into v_program_workout
  from public.training_program_workouts tpw
  join public.training_programs tp on tp.id=tpw.program_id
  where tpw.id=p_program_workout_id
    and tp.user_id=v_actor
  for update of tpw;

  if not found then
    raise exception 'Training program workout not found' using errcode='42501';
  end if;

  select *
  into v_program
  from public.training_programs
  where id=v_program_workout.program_id
    and user_id=v_actor
  for update;

  if v_program.status <> 'ACTIVE' then
    raise exception 'Training program must be active before launch'
      using errcode='22023';
  end if;

  if v_program_workout.execution_status not in ('PLANNED','MISSED')
     or v_program_workout.workout_session_id is not null
  then
    raise exception 'Training program workout is already linked'
      using errcode='22023';
  end if;

  select array_agg(tpe.exercise_id order by tpe.order_index)
  into v_exercise_ids
  from public.training_program_exercises tpe
  where tpe.program_workout_id=p_program_workout_id;

  select coalesce(
    jsonb_agg(group_members order by group_index),
    '[]'::jsonb
  )
  into v_superset_groups
  from (
    select
      tpe.superset_group_index as group_index,
      jsonb_agg(
        tpe.exercise_id::text order by tpe.superset_order
      ) as group_members
    from public.training_program_exercises tpe
    where tpe.program_workout_id=p_program_workout_id
      and tpe.superset_group_index is not null
    group by tpe.superset_group_index
  ) grouped;

  v_result := public.start_lifting_workout_from_preset(
    v_exercise_ids,
    v_superset_groups,
    p_action_at
  );
  v_workout_id := nullif(v_result->>'id','')::uuid;

  if v_workout_id is null then
    raise exception 'Unable to launch training program workout'
      using errcode='P0001';
  end if;

  for v_plan_exercise in
    select *
    from public.training_program_exercises
    where program_workout_id=p_program_workout_id
    order by order_index
  loop
    select we.id
    into v_workout_exercise_id
    from public.workout_exercises we
    where we.workout_id=v_workout_id
      and we.exercise_id=v_plan_exercise.exercise_id;

    if v_workout_exercise_id is null then
      raise exception 'Program exercise did not launch correctly'
        using errcode='P0001';
    end if;

    for v_set_number in 1..v_plan_exercise.working_sets
    loop
      insert into public.workout_sets(
        workout_exercise_id,set_number,set_type,weight_kg,
        bodyweight_mode,completed,set_variant
      )
      values(
        v_workout_exercise_id,v_set_number,'WORKING',
        v_plan_exercise.target_weight_kg,
        case
          when v_plan_exercise.measurement_type='BODYWEIGHT_REPS'
            then v_plan_exercise.bodyweight_mode
          else null
        end,
        false,'STANDARD'
      );
    end loop;
  end loop;

  update public.training_program_workouts
  set execution_status='STARTED_PROGRAMMED',
      workout_session_id=v_workout_id,
      revision=revision+1,
      updated_at=now()
  where id=p_program_workout_id;

  return v_result || jsonb_build_object(
    'programWorkoutId',p_program_workout_id,
    'programExecutionStatus','STARTED_PROGRAMMED'
  );
end;
$$;

revoke all on function public.launch_my_training_program_workout(uuid,timestamptz)
from public, anon, authenticated;
grant execute on function public.launch_my_training_program_workout(uuid,timestamptz)
to authenticated;

create or replace function public.link_my_training_program_own_workout(
  p_program_workout_id uuid,
  p_workout_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_session_status text;
  v_execution_status text;
begin
  v_actor := private.require_active_account();

  perform 1
  from public.training_program_workouts tpw
  join public.training_programs tp on tp.id=tpw.program_id
  where tpw.id=p_program_workout_id
    and tp.user_id=v_actor
    and tp.status='ACTIVE'
    and tpw.execution_status in ('PLANNED','MISSED')
    and tpw.workout_session_id is null
  for update of tpw;

  if not found then
    raise exception 'Training program workout is not available for linking'
      using errcode='42501';
  end if;

  select ws.status::text
  into v_session_status
  from public.workout_sessions ws
  where ws.id=p_workout_session_id
    and ws.user_id=v_actor
    and ws.category='STRENGTH'
    and ws.source='IN_APP'
    and ws.status in ('IN_PROGRESS','COMPLETED');

  if v_session_status is null then
    raise exception 'Workout session is not linkable'
      using errcode='22023';
  end if;

  v_execution_status := case
    when v_session_status='COMPLETED' then 'COMPLETED_OWN_WORKOUT'
    else 'STARTED_OWN_WORKOUT'
  end;

  update public.training_program_workouts
  set execution_status=v_execution_status,
      workout_session_id=p_workout_session_id,
      revision=revision+1,
      updated_at=now()
  where id=p_program_workout_id;

  return jsonb_build_object(
    'programWorkoutId',p_program_workout_id,
    'workoutSessionId',p_workout_session_id,
    'programExecutionStatus',v_execution_status
  );
end;
$$;

revoke all on function public.link_my_training_program_own_workout(uuid,uuid)
from public, anon, authenticated;
grant execute on function public.link_my_training_program_own_workout(uuid,uuid)
to authenticated;

create or replace function public.mark_my_training_program_workout_missed(
  p_program_workout_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
begin
  v_actor := private.require_active_account();

  update public.training_program_workouts tpw
  set execution_status='MISSED',
      revision=revision+1,
      updated_at=now()
  from public.training_programs tp
  where tpw.id=p_program_workout_id
    and tp.id=tpw.program_id
    and tp.user_id=v_actor
    and tp.status='ACTIVE'
    and tpw.execution_status='PLANNED'
    and tpw.workout_session_id is null;

  if not found then
    raise exception 'Training program workout is not available to mark missed'
      using errcode='42501';
  end if;

  return jsonb_build_object(
    'programWorkoutId',p_program_workout_id,
    'programExecutionStatus','MISSED'
  );
end;
$$;

revoke all on function public.mark_my_training_program_workout_missed(uuid)
from public, anon, authenticated;
grant execute on function public.mark_my_training_program_workout_missed(uuid)
to authenticated;

create or replace function private.sync_training_program_workout_execution()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'COMPLETED' then
    update public.training_program_workouts
    set execution_status = case execution_status
          when 'STARTED_PROGRAMMED' then 'COMPLETED_PROGRAMMED'
          when 'STARTED_OWN_WORKOUT' then 'COMPLETED_OWN_WORKOUT'
          else execution_status
        end,
        revision = revision + 1,
        updated_at = now()
    where workout_session_id = new.id
      and execution_status in (
        'STARTED_PROGRAMMED','STARTED_OWN_WORKOUT'
      );
  elsif new.status = 'CANCELLED' then
    update public.training_program_workouts
    set execution_status='PLANNED',
        workout_session_id=null,
        revision=revision+1,
        updated_at=now()
    where workout_session_id=new.id
      and execution_status in (
        'STARTED_PROGRAMMED','STARTED_OWN_WORKOUT'
      );
  end if;

  return new;
end;
$$;

create trigger sync_training_program_workout_execution
after update of status on public.workout_sessions
for each row
execute function private.sync_training_program_workout_execution();

notify pgrst, 'reload schema';
