-- Phase 20.7: fix the tutorial completion function from the immediately
-- preceding migration. GREATEST is SQL syntax and must not be schema-qualified.

create or replace function public.complete_my_tutorial(
  p_version smallint
)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_completed_version smallint;
begin
  v_actor := private.require_active_account();

  if p_version is null or p_version < 1 or p_version > 99 then
    raise exception 'Tutorial version must be between 1 and 99'
      using errcode = '22023';
  end if;

  update public.profiles
  set tutorial_completed_version =
    greatest(tutorial_completed_version, p_version)
  where id = v_actor
  returning tutorial_completed_version into v_completed_version;

  if not found then
    raise exception 'Profile not found'
      using errcode = 'P0002';
  end if;

  return v_completed_version;
end;
$$;

revoke all on function public.complete_my_tutorial(smallint)
from public, anon, authenticated;

grant execute on function public.complete_my_tutorial(smallint)
to authenticated;
