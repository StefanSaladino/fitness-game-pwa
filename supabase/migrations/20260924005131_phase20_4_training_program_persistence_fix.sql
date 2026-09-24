-- Phase 20.4 follow-up: qualify the planned-workout revision in the
-- UPDATE ... FROM statement so PostgreSQL never sees an ambiguous revision.

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
      revision=tpw.revision+1,
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

notify pgrst, 'reload schema';
