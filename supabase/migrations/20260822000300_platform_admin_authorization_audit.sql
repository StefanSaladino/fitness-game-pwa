-- Fitness Game PWA — Phase 15.1 platform-admin authorization + audit foundation
-- Platform administration is intentionally independent of group OWNER / ADMIN roles.

create type public.platform_account_status as enum ('ACTIVE', 'SUSPENDED', 'DELETION_PENDING');

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.platform_account_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status public.platform_account_status not null default 'ACTIVE',
  updated_at timestamptz not null default now(),
  updated_by uuid,
  status_reason text check (status_reason is null or char_length(trim(status_reason)) between 3 and 500)
);

create table private.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  granted_at timestamptz not null default now(),
  granted_by uuid,
  grant_reason text not null check (char_length(trim(grant_reason)) between 3 and 500)
);

create table private.platform_admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  target_user_id uuid,
  action text not null check (action in (
    'PLATFORM_ADMIN_BOOTSTRAPPED',
    'PLATFORM_ADMIN_GRANTED',
    'PLATFORM_ADMIN_REVOKED'
  )),
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  before_state jsonb,
  after_state jsonb,
  occurred_at timestamptz not null default now()
);

alter table private.platform_account_state enable row level security;
alter table private.platform_admins enable row level security;
alter table private.platform_admin_audit_log enable row level security;

revoke all on table private.platform_account_state, private.platform_admins, private.platform_admin_audit_log
from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;

insert into private.platform_account_state (user_id)
select p.id
from public.profiles p
on conflict (user_id) do nothing;

create or replace function private.ensure_platform_account_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.platform_account_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profiles_create_platform_account_state
after insert on public.profiles
for each row execute function private.ensure_platform_account_state();

create or replace function private.is_active_platform_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.platform_admins pa
    join private.platform_account_state pas on pas.user_id = pa.user_id
    where pa.user_id = p_user_id
      and pas.status = 'ACTIVE'::public.platform_account_status
  );
$$;

create or replace function private.require_active_platform_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status public.platform_account_status;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select pas.status
  into v_status
  from private.platform_account_state pas
  where pas.user_id = v_actor;

  if v_status is distinct from 'ACTIVE'::public.platform_account_status then
    raise exception 'Active platform administrator required' using errcode = '42501';
  end if;

  if not private.is_active_platform_admin(v_actor) then
    raise exception 'Platform administrator required' using errcode = '42501';
  end if;

  return v_actor;
end;
$$;

create or replace function private.reject_platform_admin_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Platform admin audit records are immutable' using errcode = '42501';
end;
$$;

create trigger platform_admin_audit_immutable
before update or delete on private.platform_admin_audit_log
for each row execute function private.reject_platform_admin_audit_mutation();

create or replace function private.protect_last_active_platform_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_other_active_admins bigint;
begin
  if old.status = 'ACTIVE'::public.platform_account_status
     and new.status <> 'ACTIVE'::public.platform_account_status
     and exists (select 1 from private.platform_admins pa where pa.user_id = old.user_id) then
    select count(*)
    into v_other_active_admins
    from private.platform_admins pa
    join private.platform_account_state pas on pas.user_id = pa.user_id
    where pa.user_id <> old.user_id
      and pas.status = 'ACTIVE'::public.platform_account_status;

    if v_other_active_admins = 0 then
      raise exception 'Final platform administrator must remain active' using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger platform_account_state_protect_last_admin
before update of status on private.platform_account_state
for each row execute function private.protect_last_active_platform_admin();

create or replace function private.prevent_platform_admin_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from private.platform_admins pa where pa.user_id = old.id) then
    raise exception 'Platform administrator must be revoked before account deletion' using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger profiles_protect_platform_admin_delete
before delete on public.profiles
for each row execute function private.prevent_platform_admin_profile_delete();

create or replace function private.bootstrap_platform_admin(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.platform_account_status;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Admin reason must be between 3 and 500 characters' using errcode = '22023';
  end if;

  lock table private.platform_admins in exclusive mode;

  if exists (select 1 from private.platform_admins) then
    raise exception 'Platform administrator already bootstrapped' using errcode = '42501';
  end if;

  select pas.status
  into v_status
  from private.platform_account_state pas
  where pas.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Target account not found' using errcode = '22023';
  end if;
  if v_status <> 'ACTIVE'::public.platform_account_status then
    raise exception 'Target account must be active' using errcode = '22023';
  end if;

  insert into private.platform_admins (user_id, granted_by, grant_reason)
  values (p_user_id, null, v_reason);

  insert into private.platform_admin_audit_log (
    actor_user_id, target_user_id, action, reason, before_state, after_state
  ) values (
    null,
    p_user_id,
    'PLATFORM_ADMIN_BOOTSTRAPPED',
    v_reason,
    jsonb_build_object('is_platform_admin', false, 'account_status', v_status),
    jsonb_build_object('is_platform_admin', true, 'account_status', v_status)
  );
end;
$$;

create or replace function public.get_my_platform_access()
returns table (
  account_status public.platform_account_status,
  is_platform_admin boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  return query
  select
    pas.status,
    pas.status = 'ACTIVE'::public.platform_account_status
      and exists (select 1 from private.platform_admins pa where pa.user_id = v_user)
  from private.platform_account_state pas
  where pas.user_id = v_user;

  if not found then
    raise exception 'Account state not found' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.grant_platform_admin(p_target_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_status public.platform_account_status;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  v_actor := private.require_active_platform_admin();
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Admin reason must be between 3 and 500 characters' using errcode = '22023';
  end if;

  lock table private.platform_admins in exclusive mode;

  select pas.status
  into v_status
  from private.platform_account_state pas
  where pas.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'Target account not found' using errcode = '22023';
  end if;
  if v_status <> 'ACTIVE'::public.platform_account_status then
    raise exception 'Target account must be active' using errcode = '22023';
  end if;
  if exists (select 1 from private.platform_admins pa where pa.user_id = p_target_user_id) then
    raise exception 'Target is already a platform administrator' using errcode = '22023';
  end if;

  insert into private.platform_admins (user_id, granted_by, grant_reason)
  values (p_target_user_id, v_actor, v_reason);

  insert into private.platform_admin_audit_log (
    actor_user_id, target_user_id, action, reason, before_state, after_state
  ) values (
    v_actor,
    p_target_user_id,
    'PLATFORM_ADMIN_GRANTED',
    v_reason,
    jsonb_build_object('is_platform_admin', false, 'account_status', v_status),
    jsonb_build_object('is_platform_admin', true, 'account_status', v_status)
  );
end;
$$;

create or replace function public.revoke_platform_admin(p_target_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_target_status public.platform_account_status;
  v_other_active_admins bigint;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  v_actor := private.require_active_platform_admin();
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Admin reason must be between 3 and 500 characters' using errcode = '22023';
  end if;

  lock table private.platform_admins in exclusive mode;

  if not exists (select 1 from private.platform_admins pa where pa.user_id = p_target_user_id) then
    raise exception 'Target is not a platform administrator' using errcode = '22023';
  end if;

  select pas.status into v_target_status
  from private.platform_account_state pas
  where pas.user_id = p_target_user_id;

  select count(*)
  into v_other_active_admins
  from private.platform_admins pa
  join private.platform_account_state pas on pas.user_id = pa.user_id
  where pa.user_id <> p_target_user_id
    and pas.status = 'ACTIVE'::public.platform_account_status;

  if v_other_active_admins = 0 then
    raise exception 'Final platform administrator cannot be revoked' using errcode = '42501';
  end if;

  delete from private.platform_admins pa where pa.user_id = p_target_user_id;

  insert into private.platform_admin_audit_log (
    actor_user_id, target_user_id, action, reason, before_state, after_state
  ) values (
    v_actor,
    p_target_user_id,
    'PLATFORM_ADMIN_REVOKED',
    v_reason,
    jsonb_build_object('is_platform_admin', true, 'account_status', v_target_status),
    jsonb_build_object('is_platform_admin', false, 'account_status', v_target_status)
  );
end;
$$;

-- Private helpers are never browser RPCs. The bootstrap function is SQL-editor/server-operator only.
revoke all on function private.ensure_platform_account_state() from public, anon, authenticated;
revoke all on function private.is_active_platform_admin(uuid) from public, anon, authenticated;
revoke all on function private.require_active_platform_admin() from public, anon, authenticated;
revoke all on function private.reject_platform_admin_audit_mutation() from public, anon, authenticated;
revoke all on function private.protect_last_active_platform_admin() from public, anon, authenticated;
revoke all on function private.prevent_platform_admin_profile_delete() from public, anon, authenticated;
revoke all on function private.bootstrap_platform_admin(uuid, text) from public, anon, authenticated;

-- Public RPC surface: authenticated callers may reach the boundary, but admin mutations authorize inside it.
revoke all on function public.get_my_platform_access() from public, anon, authenticated;
revoke all on function public.grant_platform_admin(uuid, text) from public, anon, authenticated;
revoke all on function public.revoke_platform_admin(uuid, text) from public, anon, authenticated;

grant execute on function public.get_my_platform_access() to authenticated;
grant execute on function public.grant_platform_admin(uuid, text) to authenticated;
grant execute on function public.revoke_platform_admin(uuid, text) to authenticated;

comment on schema private is 'Non-exposed operational data and authorization helpers. Never add this schema to the Data API exposed schemas.';
comment on table private.platform_admin_audit_log is 'Append-only platform-admin audit history. Actor/target UUIDs intentionally survive future profile deletion.';
comment on function private.bootstrap_platform_admin(uuid, text) is 'One-time SQL-editor/server-operator bootstrap. Not executable by browser roles.';
