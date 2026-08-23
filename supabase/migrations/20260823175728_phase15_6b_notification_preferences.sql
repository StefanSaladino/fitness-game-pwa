-- Phase 15.6B: server-persisted account-level optional notification preferences.
-- Device/browser permission and push subscriptions remain separate Phase 15.6C concerns.

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notifications_enabled boolean not null default false,
  workout_reminders boolean not null default false,
  weekly_goal_reminders boolean not null default false,
  badge_achievements boolean not null default false,
  personal_record_alerts boolean not null default false,
  group_activity boolean not null default false,
  group_invitations boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

comment on table public.notification_preferences is
  'Account-level optional notification delivery preferences. Device permission/subscription state is stored separately and mandatory in-app account/security/moderation notices are not governed by these flags.';
comment on column public.notification_preferences.notifications_enabled is
  'Master optional-notification preference. OFF suppresses optional delivery without clearing category selections.';

alter table public.notification_preferences enable row level security;

revoke all on table public.notification_preferences from public, anon, authenticated;
grant select on table public.notification_preferences to authenticated;

create policy notification_preferences_select_own
on public.notification_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

insert into public.notification_preferences (user_id)
select p.id
from public.profiles p
on conflict (user_id) do nothing;

create or replace function private.create_notification_preferences_for_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.create_notification_preferences_for_profile()
from public, anon, authenticated;

drop trigger if exists profiles_create_notification_preferences on public.profiles;
create trigger profiles_create_notification_preferences
after insert on public.profiles
for each row execute function private.create_notification_preferences_for_profile();

create or replace function public.update_my_notification_preferences(
  p_notifications_enabled boolean,
  p_workout_reminders boolean,
  p_weekly_goal_reminders boolean,
  p_badge_achievements boolean,
  p_personal_record_alerts boolean,
  p_group_activity boolean,
  p_group_invitations boolean
)
returns public.notification_preferences
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_after public.notification_preferences%rowtype;
begin
  v_actor := private.require_active_account();

  if p_notifications_enabled is null
     or p_workout_reminders is null
     or p_weekly_goal_reminders is null
     or p_badge_achievements is null
     or p_personal_record_alerts is null
     or p_group_activity is null
     or p_group_invitations is null then
    raise exception 'Notification preferences cannot be null' using errcode = '22004';
  end if;

  insert into public.notification_preferences as np (
    user_id,
    notifications_enabled,
    workout_reminders,
    weekly_goal_reminders,
    badge_achievements,
    personal_record_alerts,
    group_activity,
    group_invitations,
    updated_at
  ) values (
    v_actor,
    p_notifications_enabled,
    p_workout_reminders,
    p_weekly_goal_reminders,
    p_badge_achievements,
    p_personal_record_alerts,
    p_group_activity,
    p_group_invitations,
    pg_catalog.now()
  )
  on conflict (user_id) do update
  set notifications_enabled = excluded.notifications_enabled,
      workout_reminders = excluded.workout_reminders,
      weekly_goal_reminders = excluded.weekly_goal_reminders,
      badge_achievements = excluded.badge_achievements,
      personal_record_alerts = excluded.personal_record_alerts,
      group_activity = excluded.group_activity,
      group_invitations = excluded.group_invitations,
      updated_at = pg_catalog.now()
  returning np.* into v_after;

  return v_after;
end;
$$;

revoke all on function public.update_my_notification_preferences(boolean, boolean, boolean, boolean, boolean, boolean, boolean)
from public, anon, authenticated;
grant execute on function public.update_my_notification_preferences(boolean, boolean, boolean, boolean, boolean, boolean, boolean)
to authenticated;

comment on function public.update_my_notification_preferences(boolean, boolean, boolean, boolean, boolean, boolean, boolean) is
  'Updates only the active caller account-level optional notification preferences. Master OFF preserves category selections; device permission and push subscriptions are separate.';
