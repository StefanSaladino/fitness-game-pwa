-- Fitness Game PWA — Phase 15.3B suspension enforcement + Auth coordination
-- Database account state is authoritative for product access. Supabase Auth ban
-- state is coordinated separately through a service-role-only Edge Function.

create table private.platform_auth_coordination (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  action text not null check (action in ('SUSPEND', 'RESTORE')),
  desired_banned boolean not null,
  revision bigint not null check (revision > 0),
  requested_by uuid not null,
  requested_reason text not null check (char_length(trim(requested_reason)) between 3 and 500),
  requested_review_at timestamptz,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error_code text check (
    last_error_code is null or char_length(trim(last_error_code)) between 3 and 80
  )
);

alter table private.platform_auth_coordination enable row level security;
revoke all on table private.platform_auth_coordination from public, anon, authenticated;

create or replace function private.require_active_platform_admin_by_id(p_actor_user_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_status public.platform_account_status;
begin
  if p_actor_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select pas.status
  into v_status
  from private.platform_account_state pas
  where pas.user_id = p_actor_user_id;

  if v_status is distinct from 'ACTIVE'::public.platform_account_status then
    raise exception 'Active platform administrator required' using errcode = '42501';
  end if;

  if not private.is_active_platform_admin(p_actor_user_id) then
    raise exception 'Platform administrator required' using errcode = '42501';
  end if;

  return p_actor_user_id;
end;
$$;

create or replace function public.is_current_account_session_active()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_claims jsonb;
  v_session_text text;
  v_session_id uuid;
begin
  if v_user_id is null then
    return false;
  end if;

  begin
    v_claims := coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb,
      '{}'::jsonb
    );
    v_session_text := coalesce(
      nullif(v_claims ->> 'session_id', ''),
      nullif(current_setting('request.jwt.claim.session_id', true), '')
    );
    v_session_id := v_session_text::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  if v_session_id is null then
    return false;
  end if;

  return exists (
    select 1
    from private.platform_account_state pas
    join auth.sessions s
      on s.user_id = pas.user_id
     and s.id = v_session_id
    where pas.user_id = v_user_id
      and pas.status = 'ACTIVE'::public.platform_account_status
      and (s.not_after is null or s.not_after > now())
  );
end;
$$;

create or replace function public.enforce_active_account_request()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_claims jsonb;
  v_claim_role text;
  v_user_id uuid := auth.uid();
  v_status public.platform_account_status;
begin
  begin
    v_claims := coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb,
      '{}'::jsonb
    );
  exception
    when invalid_text_representation then
      v_claims := '{}'::jsonb;
  end;

  v_claim_role := coalesce(
    nullif(v_claims ->> 'role', ''),
    nullif(current_setting('request.jwt.claim.role', true), '')
  );

  -- Anonymous requests and trusted server-role requests retain their existing
  -- boundaries. Every authenticated user request is checked below.
  if v_claim_role is distinct from 'authenticated' then
    return;
  end if;

  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select pas.status
  into v_status
  from private.platform_account_state pas
  where pas.user_id = v_user_id;

  if not found then
    raise exception 'Account state not found' using errcode = '42501';
  end if;

  if v_status <> 'ACTIVE'::public.platform_account_status then
    raise exception 'Account is not active' using errcode = '42501';
  end if;

  if not public.is_current_account_session_active() then
    raise exception 'Session is not active' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.prepare_platform_account_auth_transition(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_reason text,
  p_review_at timestamptz default null
)
returns table (
  coordination_revision bigint,
  desired_banned boolean,
  account_status public.platform_account_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text := upper(trim(coalesce(p_action, '')));
  v_reason text := trim(coalesce(p_reason, ''));
  v_before private.platform_account_state%rowtype;
  v_revision bigint;
  v_desired_banned boolean;
begin
  perform private.require_active_platform_admin_by_id(p_actor_user_id);

  if v_action not in ('SUSPEND', 'RESTORE') then
    raise exception 'Unsupported account Auth transition' using errcode = '22023';
  end if;
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Admin reason must be between 3 and 500 characters' using errcode = '22023';
  end if;
  if p_actor_user_id = p_target_user_id then
    raise exception 'Platform administrator cannot change own Auth state' using errcode = '42501';
  end if;
  if v_action = 'SUSPEND' and p_review_at is not null and p_review_at <= now() then
    raise exception 'Suspension review date must be in the future' using errcode = '22023';
  end if;

  select *
  into v_before
  from private.platform_account_state pas
  where pas.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'Target account not found' using errcode = '22023';
  end if;

  if v_action = 'SUSPEND' then
    if v_before.status = 'ACTIVE'::public.platform_account_status then
      update private.platform_account_state
      set
        status = 'SUSPENDED'::public.platform_account_status,
        updated_by = p_actor_user_id,
        status_reason = v_reason,
        suspension_review_at = p_review_at,
        deletion_requested_at = null,
        deletion_requested_by = null,
        deletion_previous_status = null,
        deletion_previous_reason = null,
        deletion_previous_review_at = null
      where user_id = p_target_user_id;

      insert into private.platform_admin_audit_log (
        actor_user_id, target_user_id, action, reason, before_state, after_state
      ) values (
        p_actor_user_id,
        p_target_user_id,
        'ACCOUNT_SUSPENDED',
        v_reason,
        jsonb_build_object(
          'account_status', v_before.status,
          'suspension_review_at', v_before.suspension_review_at
        ),
        jsonb_build_object(
          'account_status', 'SUSPENDED',
          'suspension_review_at', p_review_at
        )
      );
    elsif v_before.status <> 'SUSPENDED'::public.platform_account_status then
      raise exception 'Target account must be active before suspension' using errcode = '22023';
    end if;

    v_desired_banned := true;
  else
    if v_before.status <> 'SUSPENDED'::public.platform_account_status then
      raise exception 'Target account must be suspended before restore' using errcode = '22023';
    end if;
    v_desired_banned := false;
  end if;

  insert into private.platform_auth_coordination as pac (
    user_id,
    action,
    desired_banned,
    revision,
    requested_by,
    requested_reason,
    requested_review_at,
    requested_at,
    completed_at,
    last_error_code
  ) values (
    p_target_user_id,
    v_action,
    v_desired_banned,
    1,
    p_actor_user_id,
    v_reason,
    case when v_action = 'SUSPEND' then p_review_at else null end,
    now(),
    null,
    null
  )
  on conflict (user_id) do update
  set
    action = excluded.action,
    desired_banned = excluded.desired_banned,
    revision = pac.revision + 1,
    requested_by = excluded.requested_by,
    requested_reason = excluded.requested_reason,
    requested_review_at = excluded.requested_review_at,
    requested_at = excluded.requested_at,
    completed_at = null,
    last_error_code = null
  returning revision into v_revision;

  return query
  select
    v_revision,
    v_desired_banned,
    case
      when v_action = 'SUSPEND' then 'SUSPENDED'::public.platform_account_status
      else v_before.status
    end;
end;
$$;

create or replace function public.complete_platform_account_auth_transition(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_coordination_revision bigint,
  p_success boolean,
  p_error_code text default null
)
returns public.platform_account_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coordination private.platform_auth_coordination%rowtype;
  v_before private.platform_account_state%rowtype;
  v_current_status public.platform_account_status;
  v_error_code text := nullif(trim(coalesce(p_error_code, '')), '');
begin
  perform private.require_active_platform_admin_by_id(p_actor_user_id);

  select *
  into v_coordination
  from private.platform_auth_coordination pac
  where pac.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'Auth coordination request not found' using errcode = '22023';
  end if;
  if v_coordination.requested_by <> p_actor_user_id then
    raise exception 'Auth coordination actor mismatch' using errcode = '42501';
  end if;
  if v_coordination.revision <> p_coordination_revision then
    raise exception 'Stale Auth coordination revision' using errcode = '40001';
  end if;

  if not p_success then
    v_error_code := coalesce(v_error_code, 'AUTH_ADMIN_UPDATE_FAILED');
    if char_length(v_error_code) not between 3 and 80 then
      raise exception 'Auth coordination error code must be between 3 and 80 characters'
        using errcode = '22023';
    end if;

    update private.platform_auth_coordination
    set completed_at = null,
        last_error_code = v_error_code
    where user_id = p_target_user_id;

    select pas.status
    into strict v_current_status
    from private.platform_account_state pas
    where pas.user_id = p_target_user_id;
    return v_current_status;
  end if;

  select *
  into v_before
  from private.platform_account_state pas
  where pas.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'Target account not found' using errcode = '22023';
  end if;

  if v_coordination.action = 'SUSPEND' then
    if v_before.status <> 'SUSPENDED'::public.platform_account_status then
      raise exception 'Suspension state changed during Auth coordination' using errcode = '40001';
    end if;
  else
    if v_before.status <> 'SUSPENDED'::public.platform_account_status then
      raise exception 'Restore state changed during Auth coordination' using errcode = '40001';
    end if;

    update private.platform_account_state
    set
      status = 'ACTIVE'::public.platform_account_status,
      updated_by = p_actor_user_id,
      status_reason = null,
      suspension_review_at = null,
      deletion_requested_at = null,
      deletion_requested_by = null,
      deletion_previous_status = null,
      deletion_previous_reason = null,
      deletion_previous_review_at = null
    where user_id = p_target_user_id;

    insert into private.platform_admin_audit_log (
      actor_user_id, target_user_id, action, reason, before_state, after_state
    ) values (
      p_actor_user_id,
      p_target_user_id,
      'ACCOUNT_RESTORED',
      v_coordination.requested_reason,
      jsonb_build_object(
        'account_status', v_before.status,
        'status_reason', v_before.status_reason,
        'suspension_review_at', v_before.suspension_review_at
      ),
      jsonb_build_object('account_status', 'ACTIVE')
    );
  end if;

  update private.platform_auth_coordination
  set completed_at = now(),
      last_error_code = null
  where user_id = p_target_user_id;

  return case
    when v_coordination.action = 'SUSPEND'
      then 'SUSPENDED'::public.platform_account_status
    else 'ACTIVE'::public.platform_account_status
  end;
end;
$$;

-- Direct browser suspension/restore would bypass Auth ban coordination. Retain
-- the historical functions for migration compatibility, but remove all callers.
revoke all on function public.suspend_platform_account(uuid, text, timestamptz)
from public, anon, authenticated, service_role;
revoke all on function public.restore_platform_account(uuid, text)
from public, anon, authenticated, service_role;

revoke all on function private.require_active_platform_admin_by_id(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.is_current_account_session_active()
from public, anon, authenticated, service_role;
revoke all on function public.enforce_active_account_request()
from public, anon, authenticated, service_role, authenticator;
revoke all on function public.prepare_platform_account_auth_transition(uuid, uuid, text, text, timestamptz)
from public, anon, authenticated, service_role;
revoke all on function public.complete_platform_account_auth_transition(uuid, uuid, bigint, boolean, text)
from public, anon, authenticated, service_role;

grant execute on function public.is_current_account_session_active() to authenticated;
grant execute on function public.enforce_active_account_request()
to anon, authenticated, service_role, authenticator;
grant execute on function public.prepare_platform_account_auth_transition(uuid, uuid, text, text, timestamptz)
to service_role;
grant execute on function public.complete_platform_account_auth_transition(uuid, uuid, bigint, boolean, text)
to service_role;

alter role authenticator set pgrst.db_pre_request = 'public.enforce_active_account_request';
notify pgrst, 'reload config';

drop policy if exists profile_pictures_select_own on storage.objects;
create policy profile_pictures_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.is_current_account_session_active())
);

drop policy if exists profile_pictures_insert_own on storage.objects;
create policy profile_pictures_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.is_current_account_session_active())
);

drop policy if exists profile_pictures_delete_own on storage.objects;
create policy profile_pictures_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.is_current_account_session_active())
);

comment on table private.platform_auth_coordination is
  'Revisioned server-only handoff between authoritative account state and Supabase Auth ban/unban updates.';
comment on function public.enforce_active_account_request() is
  'PostgREST pre-request guard: authenticated Data API requests require an ACTIVE account and a live auth.sessions row matching the JWT session_id claim.';
comment on function public.is_current_account_session_active() is
  'Storage/RLS helper for the current authenticated JWT. Does not expose Auth session data.';
comment on function public.prepare_platform_account_auth_transition(uuid, uuid, text, text, timestamptz) is
  'Service-role-only Phase 15.3B transition preparation. Suspension becomes DB-authoritative before Auth ban; restore remains blocked until completion.';
comment on function public.complete_platform_account_auth_transition(uuid, uuid, bigint, boolean, text) is
  'Service-role-only completion for revisioned Auth ban/unban coordination.';
