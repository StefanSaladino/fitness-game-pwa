-- Phase 20.6: user-controlled total planned volume with durable overrides.
--
-- System/adaptation recommendations remain in working_sets.
-- User choices live separately in user_working_sets_override so the latest
-- Top Set recommendation can always be restored without losing adaptation history.

alter table public.training_program_exercises
  add column if not exists user_working_sets_override smallint;

alter table public.training_program_exercises
  drop constraint if exists training_program_exercises_user_working_sets_override_check;

alter table public.training_program_exercises
  add constraint training_program_exercises_user_working_sets_override_check
  check (
    user_working_sets_override is null
    or user_working_sets_override between 1 and 8
  );

create table if not exists public.training_program_volume_adjustments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  program_workout_id uuid not null references public.training_program_workouts(id) on delete cascade,
  source_program_revision bigint not null check (source_program_revision >= 1),
  resulting_program_revision bigint not null,
  source_workout_revision bigint not null check (source_workout_revision >= 0),
  resulting_workout_revision bigint not null,
  before_total_working_sets integer not null check (before_total_working_sets >= 1),
  after_total_working_sets integer not null check (after_total_working_sets >= 1),
  change_snapshot jsonb not null check (jsonb_typeof(change_snapshot) = 'array'),
  restored_recommended boolean not null default false,
  created_at timestamptz not null default now(),
  constraint training_program_volume_adjustments_program_revision_check
    check (resulting_program_revision = source_program_revision + 1),
  constraint training_program_volume_adjustments_workout_revision_check
    check (resulting_workout_revision = source_workout_revision + 1)
);

create index if not exists training_program_volume_adjustments_program_created_idx
  on public.training_program_volume_adjustments(program_id, created_at desc);

create index if not exists training_program_volume_adjustments_workout_created_idx
  on public.training_program_volume_adjustments(program_workout_id, created_at desc);

alter table public.training_program_volume_adjustments enable row level security;

drop policy if exists training_program_volume_adjustments_select_own
  on public.training_program_volume_adjustments;

create policy training_program_volume_adjustments_select_own
on public.training_program_volume_adjustments
for select
to authenticated
using (
  exists (
    select 1
    from public.training_programs tp
    where tp.id = training_program_volume_adjustments.program_id
      and tp.user_id = (select auth.uid())
  )
);

revoke all on table public.training_program_volume_adjustments
from public, anon, authenticated;
grant select on table public.training_program_volume_adjustments
to authenticated;

create or replace function public.set_my_training_program_workout_volume(
  p_program_workout_id uuid,
  p_expected_program_revision bigint,
  p_expected_workout_revision bigint,
  p_overrides jsonb default '[]'::jsonb,
  p_restore_recommended boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_program public.training_programs%rowtype;
  v_workout public.training_program_workouts%rowtype;
  v_before_total integer;
  v_after_total integer;
  v_change_snapshot jsonb;
  v_input_count integer;
  v_valid_count integer;
  v_changed boolean := false;
begin
  v_actor := private.require_active_account();

  if p_expected_program_revision is null
     or p_expected_program_revision < 1
     or p_expected_workout_revision is null
     or p_expected_workout_revision < 0
  then
    raise exception 'Training program volume revisions are invalid'
      using errcode='22023';
  end if;

  if jsonb_typeof(coalesce(p_overrides, '[]'::jsonb)) <> 'array' then
    raise exception 'Training program volume overrides must be an array'
      using errcode='22023';
  end if;

  select tpw.*
  into v_workout
  from public.training_program_workouts tpw
  join public.training_programs tp on tp.id=tpw.program_id
  where tpw.id=p_program_workout_id
    and tp.user_id=v_actor
  for update of tpw;

  if not found then
    raise exception 'Training program workout not found'
      using errcode='42501';
  end if;

  select *
  into v_program
  from public.training_programs
  where id=v_workout.program_id
    and user_id=v_actor
  for update;

  if not found then
    raise exception 'Training program not found'
      using errcode='42501';
  end if;

  if v_program.status not in ('DRAFT','ACTIVE')
     or v_workout.execution_status not in ('PLANNED','MISSED')
     or v_workout.workout_session_id is not null
  then
    raise exception 'Only an unstarted planned workout can change planned volume'
      using errcode='22023';
  end if;

  if v_program.revision <> p_expected_program_revision
     or v_workout.revision <> p_expected_workout_revision
  then
    raise exception 'Training program changed. Reload and try again.'
      using errcode='40001';
  end if;

  select coalesce(sum(coalesce(tpe.user_working_sets_override, tpe.working_sets)), 0)::integer
  into v_before_total
  from public.training_program_exercises tpe
  where tpe.program_workout_id=p_program_workout_id;

  if v_before_total < 1 then
    raise exception 'Training program workout has no planned exercises'
      using errcode='22023';
  end if;

  if p_restore_recommended then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'exerciseId', tpe.exercise_id,
          'recommendedWorkingSets', tpe.working_sets,
          'beforeWorkingSets', coalesce(
            tpe.user_working_sets_override,
            tpe.working_sets
          ),
          'afterWorkingSets', tpe.working_sets
        )
        order by tpe.order_index
      ),
      '[]'::jsonb
    )
    into v_change_snapshot
    from public.training_program_exercises tpe
    where tpe.program_workout_id=p_program_workout_id;

    update public.training_program_exercises
    set user_working_sets_override=null
    where program_workout_id=p_program_workout_id
      and user_working_sets_override is not null;

    v_changed := found;
  else
    select count(*)::integer
    into v_input_count
    from jsonb_array_elements(coalesce(p_overrides, '[]'::jsonb));

    if v_input_count < 1 then
      raise exception 'At least one planned-volume override is required'
        using errcode='22023';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(p_overrides) entry
      where jsonb_typeof(entry) <> 'object'
         or not (entry ? 'exerciseId')
         or not (entry ? 'workingSets')
         or exists (
           select 1
           from jsonb_object_keys(entry) as keys(key)
           where key not in ('exerciseId','workingSets')
         )
    ) then
      raise exception 'Training program volume override shape is invalid'
        using errcode='22023';
    end if;

    if exists (
      select 1
      from (
        select (entry->>'exerciseId')::uuid as exercise_id, count(*) as n
        from jsonb_array_elements(p_overrides) entry
        group by (entry->>'exerciseId')::uuid
      ) duplicates
      where duplicates.n > 1
    ) then
      raise exception 'Training program volume overrides cannot repeat an exercise'
        using errcode='22023';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(p_overrides) entry
      where (entry->>'workingSets')::integer not between 1 and 8
    ) then
      raise exception 'Training program working sets must be between 1 and 8'
        using errcode='22023';
    end if;

    select count(*)::integer
    into v_valid_count
    from jsonb_array_elements(p_overrides) entry
    join public.training_program_exercises tpe
      on tpe.program_workout_id=p_program_workout_id
     and tpe.exercise_id=(entry->>'exerciseId')::uuid;

    if v_valid_count <> v_input_count then
      raise exception 'Training program volume override exercise is invalid'
        using errcode='22023';
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'exerciseId', tpe.exercise_id,
          'recommendedWorkingSets', tpe.working_sets,
          'beforeWorkingSets', coalesce(
            tpe.user_working_sets_override,
            tpe.working_sets
          ),
          'afterWorkingSets', case
            when input.exercise_id is null then coalesce(
              tpe.user_working_sets_override,
              tpe.working_sets
            )
            else input.working_sets
          end
        )
        order by tpe.order_index
      ),
      '[]'::jsonb
    )
    into v_change_snapshot
    from public.training_program_exercises tpe
    left join (
      select
        (entry->>'exerciseId')::uuid as exercise_id,
        (entry->>'workingSets')::integer as working_sets
      from jsonb_array_elements(p_overrides) entry
    ) input on input.exercise_id=tpe.exercise_id
    where tpe.program_workout_id=p_program_workout_id;

    update public.training_program_exercises tpe
    set user_working_sets_override = case
      when input.working_sets=tpe.working_sets then null
      else input.working_sets
    end
    from (
      select
        (entry->>'exerciseId')::uuid as exercise_id,
        (entry->>'workingSets')::integer as working_sets
      from jsonb_array_elements(p_overrides) entry
    ) input
    where tpe.program_workout_id=p_program_workout_id
      and tpe.exercise_id=input.exercise_id
      and coalesce(tpe.user_working_sets_override, tpe.working_sets)
          is distinct from input.working_sets;

    v_changed := found;
  end if;

  select coalesce(sum(coalesce(tpe.user_working_sets_override, tpe.working_sets)), 0)::integer
  into v_after_total
  from public.training_program_exercises tpe
  where tpe.program_workout_id=p_program_workout_id;

  if not v_changed then
    return jsonb_build_object(
      'programId',v_program.id,
      'programWorkoutId',v_workout.id,
      'programRevision',v_program.revision,
      'workoutRevision',v_workout.revision,
      'beforeTotalWorkingSets',v_before_total,
      'afterTotalWorkingSets',v_after_total,
      'changed',false
    );
  end if;

  insert into public.training_program_volume_adjustments(
    program_id,
    program_workout_id,
    source_program_revision,
    resulting_program_revision,
    source_workout_revision,
    resulting_workout_revision,
    before_total_working_sets,
    after_total_working_sets,
    change_snapshot,
    restored_recommended
  )
  values(
    v_program.id,
    v_workout.id,
    v_program.revision,
    v_program.revision + 1,
    v_workout.revision,
    v_workout.revision + 1,
    v_before_total,
    v_after_total,
    v_change_snapshot,
    p_restore_recommended
  );

  update public.training_program_workouts
  set revision=revision+1,
      updated_at=now()
  where id=v_workout.id
  returning * into v_workout;

  update public.training_programs
  set revision=revision+1,
      updated_at=now()
  where id=v_program.id
  returning * into v_program;

  return jsonb_build_object(
    'programId',v_program.id,
    'programWorkoutId',v_workout.id,
    'programRevision',v_program.revision,
    'workoutRevision',v_workout.revision,
    'beforeTotalWorkingSets',v_before_total,
    'afterTotalWorkingSets',v_after_total,
    'changed',true
  );
end;
$$;

revoke all on function public.set_my_training_program_workout_volume(
  uuid,bigint,bigint,jsonb,boolean
) from public, anon, authenticated;
grant execute on function public.set_my_training_program_workout_volume(
  uuid,bigint,bigint,jsonb,boolean
) to authenticated;

-- Launch the user-adjusted effective set count while preserving working_sets as
-- the system/adaptation recommendation underneath the override.
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
  v_effective_working_sets integer;
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

    v_effective_working_sets := coalesce(
      v_plan_exercise.user_working_sets_override,
      v_plan_exercise.working_sets
    );

    for v_set_number in 1..v_effective_working_sets
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

notify pgrst, 'reload schema';
