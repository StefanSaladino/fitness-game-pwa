-- Phase 20.6 hosted reconciliation: durable substitution audit + guarded planned-exercise replacement.

create table public.training_program_substitutions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  program_workout_id uuid not null references public.training_program_workouts(id) on delete cascade,
  program_exercise_id uuid not null references public.training_program_exercises(id) on delete cascade,
  old_exercise_id uuid not null references public.exercise_catalog(id) on delete restrict,
  old_canonical_name text not null,
  replacement_exercise_id uuid not null references public.exercise_catalog(id) on delete restrict,
  replacement_canonical_name text not null,
  source_program_revision bigint not null check (source_program_revision >= 1),
  resulting_program_revision bigint not null,
  constraint_revision bigint not null check (constraint_revision >= 0),
  created_at timestamptz not null default now(),
  constraint training_program_substitution_distinct_exercise
    check (old_exercise_id <> replacement_exercise_id),
  constraint training_program_substitutions_check
    check (resulting_program_revision = source_program_revision + 1)
);

create index training_program_substitutions_program_created_idx
  on public.training_program_substitutions(program_id, created_at desc);

alter table public.training_program_substitutions enable row level security;

create policy training_program_substitutions_select_own
on public.training_program_substitutions
for select
to authenticated
using (
  exists (
    select 1
    from public.training_programs tp
    where tp.id = training_program_substitutions.program_id
      and tp.user_id = (select auth.uid())
  )
);

revoke all on table public.training_program_substitutions
from public, anon, authenticated;
grant select on table public.training_program_substitutions
to authenticated;

create or replace function public.replace_my_training_program_exercise(
  p_program_exercise_id uuid,
  p_replacement_exercise_id uuid,
  p_expected_program_revision bigint,
  p_expected_constraint_revision bigint,
  p_target_weight_kg numeric default null
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
  v_current public.training_program_exercises%rowtype;
  v_replacement public.exercise_catalog%rowtype;
  v_constraint_revision bigint;
  v_replacement_compound boolean;
  v_expected_compound boolean;
  v_substitution_id uuid;
begin
  v_actor := private.require_active_account();

  if p_expected_program_revision is null
     or p_expected_program_revision < 1
     or p_expected_constraint_revision is null
     or p_expected_constraint_revision < 0
  then
    raise exception 'Training program substitution revisions are invalid'
      using errcode='22023';
  end if;

  select tpe.*
  into v_current
  from public.training_program_exercises tpe
  where tpe.id = p_program_exercise_id;

  if not found then
    raise exception 'Training program exercise not found'
      using errcode='42501';
  end if;

  select tpw.*
  into v_workout
  from public.training_program_workouts tpw
  where tpw.id = v_current.program_workout_id
  for update;

  if not found then
    raise exception 'Training program workout not found'
      using errcode='42501';
  end if;

  select tp.*
  into v_program
  from public.training_programs tp
  where tp.id = v_workout.program_id
    and tp.user_id = v_actor
  for update;

  if not found then
    raise exception 'Training program not found'
      using errcode='42501';
  end if;

  if v_program.status not in ('DRAFT','ACTIVE')
     or v_workout.execution_status <> 'PLANNED'
     or v_workout.workout_session_id is not null
  then
    raise exception 'Only an unstarted planned exercise can be replaced'
      using errcode='22023';
  end if;

  if v_program.revision <> p_expected_program_revision then
    raise exception 'Training program changed. Reload and try again.'
      using errcode='40001';
  end if;

  select coalesce(tpc.revision, 0)
  into v_constraint_revision
  from (select 1) seed
  left join public.training_program_constraints tpc
    on tpc.user_id = v_actor;

  if v_constraint_revision <> p_expected_constraint_revision then
    raise exception 'Training program constraints changed. Reload and try again.'
      using errcode='40001';
  end if;

  if p_replacement_exercise_id = v_current.exercise_id then
    raise exception 'Replacement exercise must be different'
      using errcode='22023';
  end if;

  select ec.*
  into v_replacement
  from public.exercise_catalog ec
  where ec.id = p_replacement_exercise_id
    and ec.active = true;

  if not found then
    raise exception 'Replacement exercise is unavailable'
      using errcode='22023';
  end if;

  if v_replacement.measurement_type <> v_current.measurement_type then
    raise exception 'Replacement must preserve measurement type'
      using errcode='22023';
  end if;

  if not exists (
    select 1
    from public.muscle_volume_exercise_rules r
    join public.muscle_volume_exercise_contributions c
      on c.methodology_version = r.methodology_version
     and c.exercise_id = r.exercise_id
    where r.methodology_version = v_program.muscle_volume_methodology_version
      and r.exercise_id = p_replacement_exercise_id
      and r.volume_eligible = true
      and c.muscle_group = v_current.target_muscle_group
      and c.contribution_role = v_current.target_contribution_role
  ) then
    raise exception 'Replacement does not preserve the program target'
      using errcode='22023';
  end if;

  v_expected_compound := v_current.selection_intent = 'COMPOUND';
  v_replacement_compound := private.training_program_candidate_is_compound(
    p_replacement_exercise_id,
    v_program.muscle_volume_methodology_version
  );

  if v_replacement_compound <> v_expected_compound then
    raise exception 'Replacement does not preserve selection intent'
      using errcode='22023';
  end if;

  if exists (
    select 1
    from public.training_program_exercise_constraints c
    where c.user_id = v_actor
      and c.exercise_id = p_replacement_exercise_id
      and c.constraint_kind = 'EXCLUDE'
  ) then
    raise exception 'Replacement exercise is excluded'
      using errcode='22023';
  end if;

  if exists (
    select 1
    from public.training_program_exercises sibling
    where sibling.program_workout_id = v_current.program_workout_id
      and sibling.exercise_id = p_replacement_exercise_id
      and sibling.id <> v_current.id
  ) then
    raise exception 'Replacement exercise already exists in this workout'
      using errcode='22023';
  end if;

  if v_current.measurement_type = 'BODYWEIGHT_REPS' then
    if v_current.bodyweight_mode = 'ADDED_WEIGHT'
       and not v_replacement.supports_added_weight
    then
      raise exception 'Replacement does not support added weight'
        using errcode='22023';
    end if;

    if v_current.bodyweight_mode = 'ASSISTED'
       and not v_replacement.supports_assisted
    then
      raise exception 'Replacement does not support assistance'
        using errcode='22023';
    end if;

    if v_current.bodyweight_mode = 'BODYWEIGHT'
       and p_target_weight_kg is not null
    then
      raise exception 'Plain bodyweight replacement cannot prescribe load'
        using errcode='22023';
    end if;
  end if;

  if p_target_weight_kg is not null and p_target_weight_kg <= 0 then
    raise exception 'Replacement target weight must be positive'
      using errcode='22023';
  end if;

  insert into public.training_program_substitutions(
    program_id,
    program_workout_id,
    program_exercise_id,
    old_exercise_id,
    old_canonical_name,
    replacement_exercise_id,
    replacement_canonical_name,
    source_program_revision,
    resulting_program_revision,
    constraint_revision
  )
  values(
    v_program.id,
    v_workout.id,
    v_current.id,
    v_current.exercise_id,
    v_current.canonical_name,
    v_replacement.id,
    v_replacement.canonical_name,
    v_program.revision,
    v_program.revision + 1,
    v_constraint_revision
  )
  returning id into v_substitution_id;

  update public.training_program_exercises
  set exercise_id = v_replacement.id,
      canonical_name = v_replacement.canonical_name,
      target_weight_kg = p_target_weight_kg
  where id = v_current.id;

  update public.training_program_workouts
  set revision = revision + 1,
      updated_at = now()
  where id = v_workout.id
  returning * into v_workout;

  update public.training_programs
  set revision = revision + 1,
      updated_at = now()
  where id = v_program.id
  returning * into v_program;

  return jsonb_build_object(
    'substitutionId', v_substitution_id,
    'programId', v_program.id,
    'programWorkoutId', v_workout.id,
    'programExerciseId', v_current.id,
    'replacementExerciseId', v_replacement.id,
    'replacementCanonicalName', v_replacement.canonical_name,
    'programRevision', v_program.revision,
    'workoutRevision', v_workout.revision,
    'constraintRevision', v_constraint_revision
  );
end;
$$;

revoke all on function public.replace_my_training_program_exercise(uuid,uuid,bigint,bigint,numeric)
from public, anon, authenticated;
grant execute on function public.replace_my_training_program_exercise(uuid,uuid,bigint,bigint,numeric)
to authenticated;

notify pgrst, 'reload schema';
