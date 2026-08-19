-- Workout Game PWA — Phase 5 onboarding foundation
-- Makes username selection part of the same authoritative onboarding transaction.

begin;

-- Retire the Phase 4 three-argument overload so clients cannot complete
-- onboarding without choosing the canonical username used by the product.
revoke all on function public.complete_onboarding(text, text, smallint) from public;
revoke execute on function public.complete_onboarding(text, text, smallint) from authenticated;
drop function public.complete_onboarding(text, text, smallint);

create or replace function public.complete_onboarding(
  p_username text,
  p_display_name text,
  p_timezone text,
  p_weekly_target smallint
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_username text := lower(trim(p_username));
  v_display_name text := trim(p_display_name);
  v_week_start date;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = v_user
      and onboarding_completed_at is not null
  ) then
    raise exception 'Onboarding already completed' using errcode = '22023';
  end if;

  if v_username is null or v_username !~ '^[a-z0-9_]{3,32}$' then
    raise exception 'Username must be 3-32 lowercase letters, numbers, or underscores' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.profiles
    where username = v_username
      and id <> v_user
  ) then
    raise exception 'Username already taken' using errcode = '23505';
  end if;

  if v_display_name is null or char_length(v_display_name) not between 1 and 80 then
    raise exception 'Invalid display name' using errcode = '22023';
  end if;

  if p_weekly_target is null or p_weekly_target not between 1 and 7 then
    raise exception 'Weekly target must be 1-7' using errcode = '22023';
  end if;

  if p_timezone is null or not exists (
    select 1
    from pg_timezone_names
    where name = p_timezone
  ) then
    raise exception 'Invalid timezone' using errcode = '22023';
  end if;

  update public.profiles
  set username = v_username,
      display_name = v_display_name,
      timezone = p_timezone,
      weekly_workout_target = p_weekly_target,
      pending_weekly_workout_target = null,
      onboarding_completed_at = now()
  where id = v_user;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  v_week_start := (
    (now() at time zone p_timezone)::date
    - (extract(isodow from (now() at time zone p_timezone)::date)::int - 1)
  );

  insert into public.weekly_goals (user_id, week_start, target)
  values (v_user, v_week_start, p_weekly_target)
  on conflict (user_id, week_start) do nothing;
end;
$$;

revoke all on function public.complete_onboarding(text, text, text, smallint) from public;
grant execute on function public.complete_onboarding(text, text, text, smallint) to authenticated;

commit;
