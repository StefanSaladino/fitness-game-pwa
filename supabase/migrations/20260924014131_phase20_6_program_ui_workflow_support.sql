-- Phase 20.6 hosted reconciliation: launch an ordinary own workout from a planned program slot.

create or replace function public.launch_my_training_program_own_workout(
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
  v_result jsonb;
  v_workout_id uuid;
begin
  v_actor := private.require_active_account();

  select tpw.*
  into v_program_workout
  from public.training_program_workouts tpw
  join public.training_programs tp on tp.id = tpw.program_id
  where tpw.id = p_program_workout_id
    and tp.user_id = v_actor
  for update of tpw;

  if not found then
    raise exception 'Training program workout not found'
      using errcode='42501';
  end if;

  select *
  into v_program
  from public.training_programs
  where id = v_program_workout.program_id
    and user_id = v_actor
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

  v_result := public.start_or_resume_lifting_workout_intent(p_action_at);
  v_workout_id := nullif(v_result->>'id','')::uuid;

  if v_workout_id is null then
    raise exception 'Unable to launch own workout'
      using errcode='P0001';
  end if;

  if exists (
    select 1
    from public.training_program_workouts tpw
    where tpw.workout_session_id = v_workout_id
      and tpw.id <> p_program_workout_id
  ) then
    raise exception 'Active workout is already linked to another planned session'
      using errcode='22023';
  end if;

  update public.training_program_workouts
  set execution_status = 'STARTED_OWN_WORKOUT',
      workout_session_id = v_workout_id,
      revision = revision + 1,
      updated_at = now()
  where id = p_program_workout_id;

  return v_result || jsonb_build_object(
    'programWorkoutId', p_program_workout_id,
    'programExecutionStatus', 'STARTED_OWN_WORKOUT'
  );
end;
$$;

revoke all on function public.launch_my_training_program_own_workout(uuid,timestamptz)
from public, anon, authenticated;
grant execute on function public.launch_my_training_program_own_workout(uuid,timestamptz)
to authenticated;

notify pgrst, 'reload schema';
