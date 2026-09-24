-- Phase 20.5: append-only adaptive progression for future planned
-- prescriptions. Completed/started/missed plan slots and ordinary workout
-- history remain authoritative and immutable.

create table public.training_program_adaptations (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null
    references public.training_programs(id) on delete cascade,
  trigger_program_workout_id uuid not null
    references public.training_program_workouts(id) on delete cascade,
  trigger_workout_session_id uuid not null
    references public.workout_sessions(id) on delete restrict,
  policy_version text not null
    check (policy_version = 'training-program-adaptation-v1'),
  source_program_revision bigint not null check (source_program_revision >= 1),
  resulting_program_revision bigint not null check (resulting_program_revision >= 1),
  evidence_through_date date not null,
  outcome text not null check (outcome in ('APPLIED','NO_CHANGE')),
  reason_codes text[] not null,
  evidence_snapshot jsonb not null
    check (jsonb_typeof(evidence_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  unique(program_id, trigger_workout_session_id),
  constraint training_program_adaptation_revision_check check (
    (
      outcome = 'NO_CHANGE'
      and resulting_program_revision = source_program_revision
    )
    or
    (
      outcome = 'APPLIED'
      and resulting_program_revision = source_program_revision + 1
    )
  ),
  constraint training_program_adaptation_reason_count_check check (
    cardinality(reason_codes) between 1 and 32
  )
);

create index training_program_adaptations_program_created_idx
  on public.training_program_adaptations(program_id, created_at desc);

create table public.training_program_adaptation_changes (
  id uuid primary key default gen_random_uuid(),
  adaptation_id uuid not null
    references public.training_program_adaptations(id) on delete cascade,
  program_exercise_id uuid not null
    references public.training_program_exercises(id) on delete cascade,
  field_name text not null check (
    field_name in ('TARGET_WEIGHT_KG','WORKING_SETS','REPS_MIN','REPS_MAX')
  ),
  old_value jsonb not null,
  new_value jsonb not null,
  reason_code text not null check (
    reason_code in (
      'ESTABLISH_LOAD_FROM_COMPLETED_SETS',
      'PROGRESS_LOAD_TOP_OF_RANGE',
      'PROGRESS_BODYWEIGHT_REPS',
      'ADD_VOLUME_PHASE19',
      'REDUCE_VOLUME_PHASE19'
    )
  ),
  created_at timestamptz not null default now(),
  unique(adaptation_id, program_exercise_id, field_name)
);

create index training_program_adaptation_changes_adaptation_idx
  on public.training_program_adaptation_changes(adaptation_id, program_exercise_id);

alter table public.training_program_adaptations enable row level security;
alter table public.training_program_adaptation_changes enable row level security;

create policy training_program_adaptations_select_own
on public.training_program_adaptations
for select to authenticated
using (
  exists (
    select 1
    from public.training_programs tp
    where tp.id = program_id
      and tp.user_id = (select auth.uid())
  )
);

create policy training_program_adaptation_changes_select_own
on public.training_program_adaptation_changes
for select to authenticated
using (
  exists (
    select 1
    from public.training_program_adaptations tpa
    join public.training_programs tp on tp.id=tpa.program_id
    where tpa.id=adaptation_id
      and tp.user_id=(select auth.uid())
  )
);

revoke all on table public.training_program_adaptations
from public, anon, authenticated;
revoke all on table public.training_program_adaptation_changes
from public, anon, authenticated;
grant select on table public.training_program_adaptations to authenticated;
grant select on table public.training_program_adaptation_changes to authenticated;

create or replace function public.get_my_training_program_adaptation_context(
  p_program_id uuid,
  p_trigger_program_workout_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_program_revision bigint;
  v_trigger_session_id uuid;
  v_trigger_scheduled_date date;
  v_trigger_scoring_date date;
  v_trigger_execution_status text;
  v_actual jsonb;
  v_future jsonb;
  v_existing jsonb;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  select
    tp.revision,
    tpw.workout_session_id,
    tpw.scheduled_date,
    ws.scoring_date,
    tpw.execution_status
  into
    v_program_revision,
    v_trigger_session_id,
    v_trigger_scheduled_date,
    v_trigger_scoring_date,
    v_trigger_execution_status
  from public.training_programs tp
  join public.training_program_workouts tpw
    on tpw.program_id=tp.id
  join public.workout_sessions ws
    on ws.id=tpw.workout_session_id
  where tp.id=p_program_id
    and tp.user_id=v_actor
    and tpw.id=p_trigger_program_workout_id
    and tp.status='ACTIVE'
    and tpw.execution_status in (
      'COMPLETED_PROGRAMMED',
      'COMPLETED_OWN_WORKOUT'
    )
    and ws.status='COMPLETED'
    and ws.user_id=v_actor;

  if not found then
    raise exception 'Completed training program workout not found'
      using errcode='42501';
  end if;

  select jsonb_build_object(
    'adaptationId', tpa.id,
    'outcome', tpa.outcome,
    'sourceProgramRevision', tpa.source_program_revision,
    'resultingProgramRevision', tpa.resulting_program_revision,
    'reasonCodes', to_jsonb(tpa.reason_codes)
  )
  into v_existing
  from public.training_program_adaptations tpa
  where tpa.program_id=p_program_id
    and tpa.trigger_workout_session_id=v_trigger_session_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'exerciseId', q.exercise_id,
        'canonicalName', q.canonical_name,
        'measurementType', q.measurement_type,
        'plannedWorkingSets', q.planned_working_sets,
        'standardWorkingSetCount', q.standard_working_set_count,
        'nonstandardCompletedSetCount', q.nonstandard_completed_set_count,
        'minCompletedReps', q.min_completed_reps,
        'maxCompletedReps', q.max_completed_reps,
        'minWeightKg', q.min_weight_kg,
        'maxWeightKg', q.max_weight_kg,
        'plainBodyweightSetCount', q.plain_bodyweight_set_count,
        'addedWeightSetCount', q.added_weight_set_count,
        'assistedSetCount', q.assisted_set_count
      )
      order by q.order_index
    ),
    '[]'::jsonb
  )
  into v_actual
  from (
    select
      we.exercise_id,
      ec.canonical_name,
      ec.measurement_type,
      min(we.order_index) as order_index,
      max(tpe.working_sets) as planned_working_sets,
      count(ws.id) filter (
        where ws.completed
          and ws.set_type='WORKING'
          and ws.set_variant='STANDARD'
      )::integer as standard_working_set_count,
      count(ws.id) filter (
        where ws.completed
          and ws.set_type in ('WORKING','DROP','FAILURE')
          and (
            ws.set_type <> 'WORKING'
            or ws.set_variant <> 'STANDARD'
          )
      )::integer as nonstandard_completed_set_count,
      min(ws.reps) filter (
        where ws.completed
          and ws.set_type='WORKING'
          and ws.set_variant='STANDARD'
          and ws.reps is not null
      )::integer as min_completed_reps,
      max(ws.reps) filter (
        where ws.completed
          and ws.set_type='WORKING'
          and ws.set_variant='STANDARD'
          and ws.reps is not null
      )::integer as max_completed_reps,
      min(ws.weight_kg) filter (
        where ws.completed
          and ws.set_type='WORKING'
          and ws.set_variant='STANDARD'
          and ws.weight_kg is not null
      ) as min_weight_kg,
      max(ws.weight_kg) filter (
        where ws.completed
          and ws.set_type='WORKING'
          and ws.set_variant='STANDARD'
          and ws.weight_kg is not null
      ) as max_weight_kg,
      count(ws.id) filter (
        where ws.completed
          and ws.set_type='WORKING'
          and ws.set_variant='STANDARD'
          and coalesce(ws.bodyweight_mode,'BODYWEIGHT')='BODYWEIGHT'
      )::integer as plain_bodyweight_set_count,
      count(ws.id) filter (
        where ws.completed
          and ws.set_type='WORKING'
          and ws.set_variant='STANDARD'
          and ws.bodyweight_mode='ADDED_WEIGHT'
      )::integer as added_weight_set_count,
      count(ws.id) filter (
        where ws.completed
          and ws.set_type='WORKING'
          and ws.set_variant='STANDARD'
          and ws.bodyweight_mode='ASSISTED'
      )::integer as assisted_set_count
    from public.workout_exercises we
    join public.exercise_catalog ec on ec.id=we.exercise_id
    left join public.training_program_exercises tpe
      on tpe.program_workout_id=p_trigger_program_workout_id
     and tpe.exercise_id=we.exercise_id
    left join public.workout_sets ws
      on ws.workout_exercise_id=we.id
    where we.workout_id=v_trigger_session_id
    group by we.exercise_id,ec.canonical_name,ec.measurement_type
  ) q;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'programExerciseId', tpe.id,
        'programWorkoutId', tpw.id,
        'scheduledDate', tpw.scheduled_date,
        'exerciseId', tpe.exercise_id,
        'canonicalName', tpe.canonical_name,
        'targetMuscleGroup', tpe.target_muscle_group,
        'targetContributionRole', tpe.target_contribution_role,
        'selectionIntent', tpe.selection_intent,
        'measurementType', tpe.measurement_type,
        'workingSets', tpe.working_sets,
        'repsMin', tpe.reps_min,
        'repsMax', tpe.reps_max,
        'targetWeightKg', tpe.target_weight_kg,
        'bodyweightMode', tpe.bodyweight_mode,
        'orderIndex', tpe.order_index,
        'currentlyExcluded', exists(
          select 1
          from public.training_program_exercise_constraints c
          where c.user_id=v_actor
            and c.exercise_id=tpe.exercise_id
            and c.constraint_kind='EXCLUDE'
        )
      )
      order by tpw.scheduled_date,tpw.session_index,tpe.order_index
    ),
    '[]'::jsonb
  )
  into v_future
  from public.training_program_workouts tpw
  join public.training_program_exercises tpe
    on tpe.program_workout_id=tpw.id
  where tpw.program_id=p_program_id
    and tpw.scheduled_date>v_trigger_scheduled_date
    and tpw.execution_status='PLANNED'
    and tpw.workout_session_id is null;

  return jsonb_build_object(
    'programId',p_program_id,
    'programRevision',v_program_revision,
    'triggerProgramWorkoutId',p_trigger_program_workout_id,
    'triggerWorkoutSessionId',v_trigger_session_id,
    'triggerScheduledDate',v_trigger_scheduled_date,
    'triggerScoringDate',v_trigger_scoring_date,
    'triggerExecutionStatus',v_trigger_execution_status,
    'alreadyAdapted',v_existing is not null,
    'existingAdaptation',v_existing,
    'actualExercises',v_actual,
    'futureExercises',v_future
  );
end;
$$;

revoke all on function public.get_my_training_program_adaptation_context(uuid,uuid)
from public, anon, authenticated;
grant execute on function public.get_my_training_program_adaptation_context(uuid,uuid)
to authenticated;

create or replace function public.apply_my_training_program_adaptation(
  p_program_id uuid,
  p_trigger_program_workout_id uuid,
  p_expected_revision bigint,
  p_evidence_snapshot jsonb,
  p_reason_codes text[],
  p_changes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_program public.training_programs%rowtype;
  v_trigger public.training_program_workouts%rowtype;
  v_trigger_session public.workout_sessions%rowtype;
  v_existing public.training_program_adaptations%rowtype;
  v_adaptation_id uuid;
  v_outcome text;
  v_change jsonb;
  v_target record;
  v_field text;
  v_reason text;
  v_new_numeric numeric;
  v_old_numeric numeric;
  v_old_integer integer;
  v_new_integer integer;
  v_standard_count integer;
  v_nonstandard_count integer;
  v_min_reps integer;
  v_min_weight numeric;
  v_plain_count integer;
  v_required_sets integer;
  v_change_count integer;
begin
  v_actor := private.require_active_account();

  select *
  into v_program
  from public.training_programs
  where id=p_program_id
    and user_id=v_actor
  for update;

  if not found then
    raise exception 'Training program not found' using errcode='42501';
  end if;

  select *
  into v_trigger
  from public.training_program_workouts
  where id=p_trigger_program_workout_id
    and program_id=p_program_id;

  if not found
     or v_trigger.execution_status not in (
       'COMPLETED_PROGRAMMED',
       'COMPLETED_OWN_WORKOUT'
     )
     or v_trigger.workout_session_id is null
  then
    raise exception 'Completed training program workout not found'
      using errcode='42501';
  end if;

  select *
  into v_trigger_session
  from public.workout_sessions
  where id=v_trigger.workout_session_id
    and user_id=v_actor
    and status='COMPLETED';

  if not found then
    raise exception 'Completed workout evidence is unavailable'
      using errcode='42501';
  end if;

  select *
  into v_existing
  from public.training_program_adaptations
  where program_id=p_program_id
    and trigger_workout_session_id=v_trigger.workout_session_id;

  if found then
    return jsonb_build_object(
      'adaptationId',v_existing.id,
      'outcome',v_existing.outcome,
      'sourceProgramRevision',v_existing.source_program_revision,
      'resultingProgramRevision',v_existing.resulting_program_revision,
      'changeCount',(
        select count(*)
        from public.training_program_adaptation_changes c
        where c.adaptation_id=v_existing.id
      ),
      'alreadyApplied',true
    );
  end if;

  if v_program.status <> 'ACTIVE' then
    raise exception 'Training program must be active for adaptation'
      using errcode='22023';
  end if;

  if p_expected_revision is null
     or p_expected_revision <> v_program.revision
  then
    raise exception 'Training program changed. Reload and try again.'
      using errcode='40001';
  end if;

  if p_evidence_snapshot is null
     or jsonb_typeof(p_evidence_snapshot) <> 'object'
  then
    raise exception 'Adaptation evidence snapshot must be an object'
      using errcode='22023';
  end if;

  if p_reason_codes is null
     or cardinality(p_reason_codes) < 1
     or cardinality(p_reason_codes) > 32
     or (
       select count(distinct code)
       from unnest(p_reason_codes) code
     ) <> cardinality(p_reason_codes)
     or exists (
       select 1
       from unnest(p_reason_codes) code
       where code not in (
         'LOAD_ESTABLISHED',
         'LOAD_PROGRESSED',
         'BODYWEIGHT_REPS_PROGRESSED',
         'VOLUME_ADDED',
         'VOLUME_REDUCED',
         'HOLD_INCOMPLETE_SETS',
         'HOLD_ADVANCED_SET_EDIT',
         'HOLD_REPS_BELOW_TOP',
         'HOLD_NO_MATCHING_FUTURE_EXERCISE',
         'HOLD_PHASE19_MONITOR',
         'HOLD_PHASE19_MAINTAIN',
         'HOLD_PHASE19_SMALL_CHANGE',
         'HOLD_CONSTRAINT_EXCLUDED',
         'HOLD_UNSUPPORTED_LOAD_MODE',
         'HOLD_NO_ADAPTIVE_SIGNAL'
       )
     )
  then
    raise exception 'Adaptation reason codes are invalid'
      using errcode='22023';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'array'
     or jsonb_array_length(p_changes) > 64
  then
    raise exception 'Adaptation changes must be an array of at most 64 items'
      using errcode='22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_changes) item
    where jsonb_typeof(item) <> 'object'
       or (item - 'programExerciseId' - 'field' - 'oldValue' - 'newValue' - 'reasonCode')
          <> '{}'::jsonb
       or coalesce(item->>'programExerciseId','') !~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or coalesce(item->>'field','') not in (
         'TARGET_WEIGHT_KG','WORKING_SETS','REPS_MIN','REPS_MAX'
       )
       or coalesce(item->>'reasonCode','') not in (
         'ESTABLISH_LOAD_FROM_COMPLETED_SETS',
         'PROGRESS_LOAD_TOP_OF_RANGE',
         'PROGRESS_BODYWEIGHT_REPS',
         'ADD_VOLUME_PHASE19',
         'REDUCE_VOLUME_PHASE19'
       )
  ) then
    raise exception 'Adaptation contains an invalid change'
      using errcode='22023';
  end if;

  if (
    select count(*)
    from jsonb_array_elements(p_changes)
  ) <> (
    select count(distinct concat_ws(
      ':',
      item->>'programExerciseId',
      item->>'field'
    ))
    from jsonb_array_elements(p_changes) item
  ) then
    raise exception 'Adaptation cannot repeat an exercise field change'
      using errcode='22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_changes) item
    where item->>'reasonCode'='PROGRESS_BODYWEIGHT_REPS'
      and (
        select count(*)
        from jsonb_array_elements(p_changes) pair_item
        where pair_item->>'programExerciseId'=item->>'programExerciseId'
          and pair_item->>'reasonCode'='PROGRESS_BODYWEIGHT_REPS'
          and pair_item->>'field' in ('REPS_MIN','REPS_MAX')
      ) <> 2
  ) then
    raise exception 'Bodyweight rep progression must change both rep bounds'
      using errcode='22023';
  end if;

  v_change_count := jsonb_array_length(p_changes);
  v_outcome := case when v_change_count=0 then 'NO_CHANGE' else 'APPLIED' end;

  insert into public.training_program_adaptations(
    program_id,
    trigger_program_workout_id,
    trigger_workout_session_id,
    policy_version,
    source_program_revision,
    resulting_program_revision,
    evidence_through_date,
    outcome,
    reason_codes,
    evidence_snapshot
  )
  values(
    p_program_id,
    p_trigger_program_workout_id,
    v_trigger.workout_session_id,
    'training-program-adaptation-v1',
    v_program.revision,
    case when v_change_count=0
      then v_program.revision
      else v_program.revision+1
    end,
    v_trigger_session.scoring_date,
    v_outcome,
    p_reason_codes,
    p_evidence_snapshot
  )
  returning id into v_adaptation_id;

  for v_change in
    select value from jsonb_array_elements(p_changes)
  loop
    v_field := v_change->>'field';
    v_reason := v_change->>'reasonCode';

    select
      tpe.*,
      tpw.scheduled_date as target_scheduled_date
    into v_target
    from public.training_program_exercises tpe
    join public.training_program_workouts tpw
      on tpw.id=tpe.program_workout_id
    where tpe.id=(v_change->>'programExerciseId')::uuid
      and tpw.program_id=p_program_id
      and tpw.scheduled_date>v_trigger.scheduled_date
      and tpw.execution_status='PLANNED'
      and tpw.workout_session_id is null
    for update of tpe,tpw;

    if not found then
      raise exception 'Adaptation target is not a future planned exercise'
        using errcode='22023';
    end if;

    if exists (
      select 1
      from public.training_program_exercise_constraints c
      where c.user_id=v_actor
        and c.exercise_id=v_target.exercise_id
        and c.constraint_kind='EXCLUDE'
    ) then
      raise exception 'Adaptation target is currently excluded'
        using errcode='22023';
    end if;

    if v_field='WORKING_SETS' then
      if jsonb_typeof(v_change->'oldValue') <> 'number'
         or jsonb_typeof(v_change->'newValue') <> 'number'
      then
        raise exception 'Working-set adaptation values must be numeric'
          using errcode='22023';
      end if;

      v_old_integer := (v_change->>'oldValue')::integer;
      v_new_integer := (v_change->>'newValue')::integer;

      if v_old_integer <> v_target.working_sets
         or v_new_integer not between 2 and 4
         or (
           v_reason='ADD_VOLUME_PHASE19'
           and v_new_integer <> v_old_integer+1
         )
         or (
           v_reason='REDUCE_VOLUME_PHASE19'
           and v_new_integer <> v_old_integer-1
         )
         or v_reason not in (
           'ADD_VOLUME_PHASE19',
           'REDUCE_VOLUME_PHASE19'
         )
      then
        raise exception 'Working-set adaptation is invalid'
          using errcode='22023';
      end if;

      update public.training_program_exercises
      set working_sets=v_new_integer
      where id=v_target.id;

    elsif v_field='TARGET_WEIGHT_KG' then
      if jsonb_typeof(v_change->'newValue') <> 'number' then
        raise exception 'Target-load adaptation requires a numeric new value'
          using errcode='22023';
      end if;

      v_old_numeric := case
        when v_change->'oldValue'='null'::jsonb then null
        else (v_change->>'oldValue')::numeric
      end;
      v_new_numeric := (v_change->>'newValue')::numeric;

      if v_target.measurement_type <> 'WEIGHT_REPS'
         or v_new_numeric <= 0
         or (
           v_target.target_weight_kg is null
           and v_old_numeric is not null
         )
         or (
           v_target.target_weight_kg is not null
           and v_old_numeric is distinct from v_target.target_weight_kg
         )
         or v_reason not in (
           'ESTABLISH_LOAD_FROM_COMPLETED_SETS',
           'PROGRESS_LOAD_TOP_OF_RANGE'
         )
      then
        raise exception 'Target-load adaptation is invalid'
          using errcode='22023';
      end if;

      select
        count(ws.id) filter (
          where ws.completed
            and ws.set_type='WORKING'
            and ws.set_variant='STANDARD'
        )::integer,
        count(ws.id) filter (
          where ws.completed
            and ws.set_type in ('WORKING','DROP','FAILURE')
            and (
              ws.set_type <> 'WORKING'
              or ws.set_variant <> 'STANDARD'
            )
        )::integer,
        min(ws.reps) filter (
          where ws.completed
            and ws.set_type='WORKING'
            and ws.set_variant='STANDARD'
            and ws.reps is not null
        )::integer,
        min(ws.weight_kg) filter (
          where ws.completed
            and ws.set_type='WORKING'
            and ws.set_variant='STANDARD'
            and ws.weight_kg is not null
        ),
        coalesce((
          select tpe_trigger.working_sets
          from public.training_program_exercises tpe_trigger
          where tpe_trigger.program_workout_id=v_trigger.id
            and tpe_trigger.exercise_id=v_target.exercise_id
          limit 1
        ),2)
      into
        v_standard_count,
        v_nonstandard_count,
        v_min_reps,
        v_min_weight,
        v_required_sets
      from public.workout_exercises we
      left join public.workout_sets ws
        on ws.workout_exercise_id=we.id
      where we.workout_id=v_trigger.workout_session_id
        and we.exercise_id=v_target.exercise_id;

      if v_standard_count < v_required_sets
         or v_nonstandard_count > 0
         or v_min_reps is null
         or v_min_weight is null
      then
        raise exception 'Completed-set evidence does not support load adaptation'
          using errcode='22023';
      end if;

      if v_reason='ESTABLISH_LOAD_FROM_COMPLETED_SETS' then
        if v_target.target_weight_kg is not null
           or v_min_reps < v_target.reps_min
           or abs(v_new_numeric-v_min_weight) > 0.01
        then
          raise exception 'Completed-set evidence does not support load establishment'
            using errcode='22023';
        end if;
      else
        if v_target.target_weight_kg is null
           or v_min_reps < v_target.reps_max
           or v_min_weight < v_target.target_weight_kg
           or v_new_numeric <= greatest(v_target.target_weight_kg,v_min_weight)
           or v_new_numeric > greatest(v_target.target_weight_kg,v_min_weight)*1.10
        then
          raise exception 'Completed-set evidence does not support load progression'
            using errcode='22023';
        end if;
      end if;

      update public.training_program_exercises
      set target_weight_kg=v_new_numeric
      where id=v_target.id;

    elsif v_field in ('REPS_MIN','REPS_MAX') then
      if v_reason <> 'PROGRESS_BODYWEIGHT_REPS'
         or jsonb_typeof(v_change->'oldValue') <> 'number'
         or jsonb_typeof(v_change->'newValue') <> 'number'
         or v_target.measurement_type <> 'BODYWEIGHT_REPS'
         or v_target.bodyweight_mode <> 'BODYWEIGHT'
      then
        raise exception 'Bodyweight rep adaptation is invalid'
          using errcode='22023';
      end if;

      v_old_integer := (v_change->>'oldValue')::integer;
      v_new_integer := (v_change->>'newValue')::integer;

      if v_new_integer <> v_old_integer+1
         or v_new_integer > 30
         or (
           v_field='REPS_MIN'
           and v_old_integer <> v_target.reps_min
         )
         or (
           v_field='REPS_MAX'
           and v_old_integer <> v_target.reps_max
         )
      then
        raise exception 'Bodyweight rep adaptation bounds are invalid'
          using errcode='22023';
      end if;

      select
        count(ws.id) filter (
          where ws.completed
            and ws.set_type='WORKING'
            and ws.set_variant='STANDARD'
        )::integer,
        count(ws.id) filter (
          where ws.completed
            and ws.set_type in ('WORKING','DROP','FAILURE')
            and (
              ws.set_type <> 'WORKING'
              or ws.set_variant <> 'STANDARD'
            )
        )::integer,
        min(ws.reps) filter (
          where ws.completed
            and ws.set_type='WORKING'
            and ws.set_variant='STANDARD'
            and ws.reps is not null
        )::integer,
        count(ws.id) filter (
          where ws.completed
            and ws.set_type='WORKING'
            and ws.set_variant='STANDARD'
            and coalesce(ws.bodyweight_mode,'BODYWEIGHT')='BODYWEIGHT'
        )::integer,
        coalesce((
          select tpe_trigger.working_sets
          from public.training_program_exercises tpe_trigger
          where tpe_trigger.program_workout_id=v_trigger.id
            and tpe_trigger.exercise_id=v_target.exercise_id
          limit 1
        ),2)
      into
        v_standard_count,
        v_nonstandard_count,
        v_min_reps,
        v_plain_count,
        v_required_sets
      from public.workout_exercises we
      left join public.workout_sets ws
        on ws.workout_exercise_id=we.id
      where we.workout_id=v_trigger.workout_session_id
        and we.exercise_id=v_target.exercise_id;

      if v_standard_count < v_required_sets
         or v_nonstandard_count > 0
         or v_plain_count < v_required_sets
         or v_min_reps < v_target.reps_max
      then
        raise exception 'Completed-set evidence does not support bodyweight rep progression'
          using errcode='22023';
      end if;

      if v_field='REPS_MIN' then
        update public.training_program_exercises
        set reps_min=v_new_integer
        where id=v_target.id;
      else
        update public.training_program_exercises
        set reps_max=v_new_integer
        where id=v_target.id;
      end if;
    end if;

    insert into public.training_program_adaptation_changes(
      adaptation_id,
      program_exercise_id,
      field_name,
      old_value,
      new_value,
      reason_code
    )
    values(
      v_adaptation_id,
      v_target.id,
      v_field,
      v_change->'oldValue',
      v_change->'newValue',
      v_reason
    );
  end loop;

  if v_change_count>0 then
    update public.training_program_workouts tpw
    set revision=tpw.revision+1,
        updated_at=now()
    where tpw.id in (
      select distinct tpe.program_workout_id
      from public.training_program_adaptation_changes c
      join public.training_program_exercises tpe
        on tpe.id=c.program_exercise_id
      where c.adaptation_id=v_adaptation_id
    );

    update public.training_programs
    set revision=revision+1,
        updated_at=now()
    where id=p_program_id;
  end if;

  return jsonb_build_object(
    'adaptationId',v_adaptation_id,
    'outcome',v_outcome,
    'sourceProgramRevision',v_program.revision,
    'resultingProgramRevision',
      case when v_change_count=0
        then v_program.revision
        else v_program.revision+1
      end,
    'changeCount',v_change_count,
    'alreadyApplied',false
  );
end;
$$;

revoke all on function public.apply_my_training_program_adaptation(uuid,uuid,bigint,jsonb,text[],jsonb)
from public, anon, authenticated;
grant execute on function public.apply_my_training_program_adaptation(uuid,uuid,bigint,jsonb,text[],jsonb)
to authenticated;

notify pgrst, 'reload schema';
