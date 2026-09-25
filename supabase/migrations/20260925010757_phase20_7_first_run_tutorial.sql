-- Phase 20.7: versioned first-run tutorial completion.
-- NOTE: the function body in this migration is preserved exactly as first
-- applied. The immediate follow-up migration fixes the qualified GREATEST call.

alter table public.profiles
  add column if not exists tutorial_completed_version smallint not null default 0;

alter table public.profiles
  drop constraint if exists profiles_tutorial_completed_version_check;

alter table public.profiles
  add constraint profiles_tutorial_completed_version_check
  check (tutorial_completed_version between 0 and 99);

comment on column public.profiles.tutorial_completed_version is
  'Highest version of the first-run product tutorial the user has completed or skipped. Zero means no tutorial version has been completed.';

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
    pg_catalog.greatest(tutorial_completed_version, p_version)
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

comment on function public.complete_my_tutorial(smallint) is
  'Marks a tutorial version complete for the active authenticated caller. Completion is monotonic so older clients cannot lower the recorded version.';
