-- Phase 15.6A: authoritative ordinary-user Profile/Settings preferences.
-- Historical workout/scoring data remains canonical in kilograms; this stores
-- only the user's preferred display/input unit.

alter table public.profiles
  add column if not exists preferred_weight_unit text not null default 'KG';

alter table public.profiles
  drop constraint if exists profiles_preferred_weight_unit_check;

alter table public.profiles
  add constraint profiles_preferred_weight_unit_check
  check (preferred_weight_unit in ('KG', 'LB'));

comment on column public.profiles.preferred_weight_unit is
  'Account-level display/input preference only. Authoritative workout weights remain stored in kilograms.';

-- Identity/preferences are now changed only through the validated self-service
-- RPC. Keep the narrowly scoped profile-picture grant owned by Phase 5.5C.
revoke update (username, display_name, timezone) on public.profiles from authenticated;

create or replace function public.update_my_profile_settings(
  p_username text,
  p_display_name text,
  p_timezone text,
  p_weekly_target smallint,
  p_preferred_weight_unit text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_before public.profiles%rowtype;
  v_after public.profiles%rowtype;
  v_username text := pg_catalog.lower(pg_catalog.btrim(p_username));
  v_display_name text := pg_catalog.btrim(p_display_name);
  v_weight_unit text := pg_catalog.upper(pg_catalog.btrim(p_preferred_weight_unit));
  v_today date;
  v_current_week_start date;
begin
  v_actor := private.require_active_account();

  select p.*
  into v_before
  from public.profiles p
  where p.id = v_actor
  for update;

  if not found or v_before.onboarding_completed_at is null then
    raise exception 'Completed profile not found' using errcode = 'P0002';
  end if;

  if v_username is null or v_username !~ '^[a-z0-9_]{3,32}$' then
    raise exception 'Username must be 3-32 lowercase letters, numbers, or underscores' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.username = v_username
      and p.id <> v_actor
  ) then
    raise exception 'Username already taken' using errcode = '23505';
  end if;

  if v_display_name is null or pg_catalog.char_length(v_display_name) not between 1 and 80 then
    raise exception 'Invalid display name' using errcode = '22023';
  end if;

  if p_timezone is null or not exists (
    select 1
    from pg_catalog.pg_timezone_names tz
    where tz.name = p_timezone
  ) then
    raise exception 'Invalid timezone' using errcode = '22023';
  end if;

  if p_weekly_target is null or p_weekly_target not between 1 and 7 then
    raise exception 'Weekly target must be 1-7' using errcode = '22023';
  end if;

  if v_weight_unit is null or v_weight_unit not in ('KG', 'LB') then
    raise exception 'Preferred weight unit must be KG or LB' using errcode = '22023';
  end if;

  v_today := (pg_catalog.now() at time zone p_timezone)::date;
  v_current_week_start := v_today - (extract(isodow from v_today)::integer - 1);

  update public.profiles p
  set username = v_username,
      display_name = v_display_name,
      timezone = p_timezone,
      preferred_weight_unit = v_weight_unit,
      pending_weekly_workout_target = case
        when p_weekly_target = v_before.weekly_workout_target then null
        else p_weekly_target
      end,
      pending_weekly_workout_target_week_start = case
        when p_weekly_target = v_before.weekly_workout_target then null
        else v_current_week_start + 7
      end
  where p.id = v_actor
  returning p.* into v_after;

  return v_after;
end;
$$;

revoke all on function public.update_my_profile_settings(text, text, text, smallint, text)
from public, anon, authenticated;
grant execute on function public.update_my_profile_settings(text, text, text, smallint, text)
to authenticated;

comment on function public.update_my_profile_settings(text, text, text, smallint, text) is
  'Atomically validates and updates the active caller profile, schedules weekly-target changes at the next Monday boundary, and never rewrites workout/scoring history.';
