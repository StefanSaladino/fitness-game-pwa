-- Fitness Game PWA — Phase 15.3A user-account administration foundation
-- Extends the Phase 15.1 private account-state/audit model without exposing Auth data directly.

alter table private.platform_account_state
  add column suspension_review_at timestamptz,
  add column deletion_requested_at timestamptz,
  add column deletion_requested_by uuid,
  add column deletion_previous_status public.platform_account_status,
  add column deletion_previous_reason text,
  add column deletion_previous_review_at timestamptz;

alter table private.platform_account_state
  add constraint platform_account_state_deletion_previous_status_check
  check (
    deletion_previous_status is null
    or deletion_previous_status in (
      'ACTIVE'::public.platform_account_status,
      'SUSPENDED'::public.platform_account_status
    )
  );

alter table private.platform_account_state
  add constraint platform_account_state_lifecycle_check
  check (
    (
      status = 'ACTIVE'::public.platform_account_status
      and suspension_review_at is null
      and deletion_requested_at is null
      and deletion_requested_by is null
      and deletion_previous_status is null
      and deletion_previous_reason is null
      and deletion_previous_review_at is null
    )
    or (
      status = 'SUSPENDED'::public.platform_account_status
      and deletion_requested_at is null
      and deletion_requested_by is null
      and deletion_previous_status is null
      and deletion_previous_reason is null
      and deletion_previous_review_at is null
    )
    or (
      status = 'DELETION_PENDING'::public.platform_account_status
      and suspension_review_at is null
      and deletion_requested_at is not null
      and deletion_requested_by is not null
      and deletion_previous_status in (
        'ACTIVE'::public.platform_account_status,
        'SUSPENDED'::public.platform_account_status
      )
    )
  );

alter table private.platform_admin_audit_log
  drop constraint platform_admin_audit_log_action_check;

alter table private.platform_admin_audit_log
  add constraint platform_admin_audit_log_action_check
  check (action in (
    'PLATFORM_ADMIN_BOOTSTRAPPED',
    'PLATFORM_ADMIN_GRANTED',
    'PLATFORM_ADMIN_REVOKED',
    'ACCOUNT_SUSPENDED',
    'ACCOUNT_RESTORED',
    'ACCOUNT_DELETION_REQUESTED',
    'ACCOUNT_DELETION_CANCELLED'
  ));

create or replace function private.require_active_account()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_status public.platform_account_status;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select pas.status
  into v_status
  from private.platform_account_state pas
  where pas.user_id = v_user;

  if not found then
    raise exception 'Account state not found' using errcode = '22023';
  end if;

  if v_status <> 'ACTIVE'::public.platform_account_status then
    raise exception 'Account is not active' using errcode = '42501';
  end if;

  return v_user;
end;
$$;

create or replace function public.list_platform_accounts(
  p_query text default null,
  p_status public.platform_account_status default null,
  p_page integer default 1,
  p_page_size integer default 25
)
returns table (
  user_id uuid,
  username text,
  display_name text,
  account_status public.platform_account_status,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_platform_admin boolean,
  suspension_review_at timestamptz,
  deletion_requested_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := nullif(trim(coalesce(p_query, '')), '');
begin
  perform private.require_active_platform_admin();

  if p_page < 1 then
    raise exception 'Page must be at least 1' using errcode = '22023';
  end if;
  if p_page_size < 1 or p_page_size > 100 then
    raise exception 'Page size must be between 1 and 100' using errcode = '22023';
  end if;

  return query
  select
    p.id,
    p.username,
    p.display_name,
    pas.status,
    au.created_at,
    au.last_sign_in_at,
    exists (select 1 from private.platform_admins pa where pa.user_id = p.id),
    pas.suspension_review_at,
    pas.deletion_requested_at,
    count(*) over()::bigint
  from public.profiles p
  join auth.users au on au.id = p.id
  join private.platform_account_state pas on pas.user_id = p.id
  where (p_status is null or pas.status = p_status)
    and (
      v_query is null
      or strpos(lower(p.username), lower(v_query)) > 0
      or strpos(lower(p.display_name), lower(v_query)) > 0
      or p.id::text = v_query
    )
  order by au.created_at desc, p.id
  limit p_page_size
  offset ((p_page - 1) * p_page_size);
end;
$$;

create or replace function public.get_platform_account_detail(p_target_user_id uuid)
returns table (
  user_id uuid,
  username text,
  display_name text,
  account_status public.platform_account_status,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_platform_admin boolean,
  status_reason text,
  status_updated_at timestamptz,
  suspension_review_at timestamptz,
  deletion_requested_at timestamptz,
  deletion_requested_by uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_active_platform_admin();

  return query
  select
    p.id,
    p.username,
    p.display_name,
    pas.status,
    au.created_at,
    au.last_sign_in_at,
    exists (select 1 from private.platform_admins pa where pa.user_id = p.id),
    pas.status_reason,
    pas.updated_at,
    pas.suspension_review_at,
    pas.deletion_requested_at,
    pas.deletion_requested_by
  from public.profiles p
  join auth.users au on au.id = p.id
  join private.platform_account_state pas on pas.user_id = p.id
  where p.id = p_target_user_id;

  if not found then
    raise exception 'Target account not found' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.suspend_platform_account(
  p_target_user_id uuid,
  p_reason text,
  p_review_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_reason text := trim(coalesce(p_reason, ''));
  v_before private.platform_account_state%rowtype;
begin
  v_actor := private.require_active_platform_admin();

  if v_actor = p_target_user_id then
    raise exception 'Platform administrator cannot suspend own account' using errcode = '42501';
  end if;
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Admin reason must be between 3 and 500 characters' using errcode = '22023';
  end if;
  if p_review_at is not null and p_review_at <= now() then
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
  if v_before.status <> 'ACTIVE'::public.platform_account_status then
    raise exception 'Target account must be active before suspension' using errcode = '22023';
  end if;

  update private.platform_account_state
  set
    status = 'SUSPENDED'::public.platform_account_status,
    updated_by = v_actor,
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
    v_actor,
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
end;
$$;

create or replace function public.restore_platform_account(
  p_target_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_reason text := trim(coalesce(p_reason, ''));
  v_before private.platform_account_state%rowtype;
begin
  v_actor := private.require_active_platform_admin();

  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Admin reason must be between 3 and 500 characters' using errcode = '22023';
  end if;

  select *
  into v_before
  from private.platform_account_state pas
  where pas.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'Target account not found' using errcode = '22023';
  end if;
  if v_before.status <> 'SUSPENDED'::public.platform_account_status then
    raise exception 'Target account must be suspended before restore' using errcode = '22023';
  end if;

  update private.platform_account_state
  set
    status = 'ACTIVE'::public.platform_account_status,
    updated_by = v_actor,
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
    v_actor,
    p_target_user_id,
    'ACCOUNT_RESTORED',
    v_reason,
    jsonb_build_object(
      'account_status', v_before.status,
      'status_reason', v_before.status_reason,
      'suspension_review_at', v_before.suspension_review_at
    ),
    jsonb_build_object('account_status', 'ACTIVE')
  );
end;
$$;

create or replace function public.request_platform_account_deletion(
  p_target_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_reason text := trim(coalesce(p_reason, ''));
  v_before private.platform_account_state%rowtype;
begin
  v_actor := private.require_active_platform_admin();

  if v_actor = p_target_user_id then
    raise exception 'Platform administrator cannot request own account deletion' using errcode = '42501';
  end if;
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Admin reason must be between 3 and 500 characters' using errcode = '22023';
  end if;
  if exists (select 1 from private.platform_admins pa where pa.user_id = p_target_user_id) then
    raise exception 'Platform administrator must be revoked before account deletion' using errcode = '42501';
  end if;

  select *
  into v_before
  from private.platform_account_state pas
  where pas.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'Target account not found' using errcode = '22023';
  end if;
  if v_before.status = 'DELETION_PENDING'::public.platform_account_status then
    raise exception 'Target account deletion is already pending' using errcode = '22023';
  end if;

  update private.platform_account_state
  set
    status = 'DELETION_PENDING'::public.platform_account_status,
    updated_by = v_actor,
    status_reason = v_reason,
    suspension_review_at = null,
    deletion_requested_at = now(),
    deletion_requested_by = v_actor,
    deletion_previous_status = v_before.status,
    deletion_previous_reason = v_before.status_reason,
    deletion_previous_review_at = v_before.suspension_review_at
  where user_id = p_target_user_id;

  insert into private.platform_admin_audit_log (
    actor_user_id, target_user_id, action, reason, before_state, after_state
  ) values (
    v_actor,
    p_target_user_id,
    'ACCOUNT_DELETION_REQUESTED',
    v_reason,
    jsonb_build_object(
      'account_status', v_before.status,
      'status_reason', v_before.status_reason,
      'suspension_review_at', v_before.suspension_review_at
    ),
    jsonb_build_object(
      'account_status', 'DELETION_PENDING',
      'deletion_requested_by', v_actor
    )
  );
end;
$$;

create or replace function public.cancel_platform_account_deletion(
  p_target_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_reason text := trim(coalesce(p_reason, ''));
  v_before private.platform_account_state%rowtype;
  v_restore_status public.platform_account_status;
begin
  v_actor := private.require_active_platform_admin();

  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Admin reason must be between 3 and 500 characters' using errcode = '22023';
  end if;

  select *
  into v_before
  from private.platform_account_state pas
  where pas.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'Target account not found' using errcode = '22023';
  end if;
  if v_before.status <> 'DELETION_PENDING'::public.platform_account_status then
    raise exception 'Target account deletion is not pending' using errcode = '22023';
  end if;

  v_restore_status := coalesce(
    v_before.deletion_previous_status,
    'ACTIVE'::public.platform_account_status
  );

  update private.platform_account_state
  set
    status = v_restore_status,
    updated_by = v_actor,
    status_reason = case
      when v_restore_status = 'SUSPENDED'::public.platform_account_status
        then v_before.deletion_previous_reason
      else null
    end,
    suspension_review_at = case
      when v_restore_status = 'SUSPENDED'::public.platform_account_status
        then v_before.deletion_previous_review_at
      else null
    end,
    deletion_requested_at = null,
    deletion_requested_by = null,
    deletion_previous_status = null,
    deletion_previous_reason = null,
    deletion_previous_review_at = null
  where user_id = p_target_user_id;

  insert into private.platform_admin_audit_log (
    actor_user_id, target_user_id, action, reason, before_state, after_state
  ) values (
    v_actor,
    p_target_user_id,
    'ACCOUNT_DELETION_CANCELLED',
    v_reason,
    jsonb_build_object(
      'account_status', v_before.status,
      'deletion_requested_at', v_before.deletion_requested_at,
      'deletion_requested_by', v_before.deletion_requested_by
    ),
    jsonb_build_object('account_status', v_restore_status)
  );
end;
$$;

revoke all on function private.require_active_account() from public, anon, authenticated;

revoke all on function public.list_platform_accounts(text, public.platform_account_status, integer, integer)
from public, anon, authenticated;
revoke all on function public.get_platform_account_detail(uuid)
from public, anon, authenticated;
revoke all on function public.suspend_platform_account(uuid, text, timestamptz)
from public, anon, authenticated;
revoke all on function public.restore_platform_account(uuid, text)
from public, anon, authenticated;
revoke all on function public.request_platform_account_deletion(uuid, text)
from public, anon, authenticated;
revoke all on function public.cancel_platform_account_deletion(uuid, text)
from public, anon, authenticated;

grant execute on function public.list_platform_accounts(text, public.platform_account_status, integer, integer)
to authenticated;
grant execute on function public.get_platform_account_detail(uuid)
to authenticated;
grant execute on function public.suspend_platform_account(uuid, text, timestamptz)
to authenticated;
grant execute on function public.restore_platform_account(uuid, text)
to authenticated;
grant execute on function public.request_platform_account_deletion(uuid, text)
to authenticated;
grant execute on function public.cancel_platform_account_deletion(uuid, text)
to authenticated;

comment on function private.require_active_account() is
  'Reusable Phase 15.3 account-status guard. Future authenticated application RPCs must call this before serving suspended/deletion-pending users.';
comment on function public.list_platform_accounts(text, public.platform_account_status, integer, integer) is
  'Platform-admin-only searchable/paginated application-account directory. Does not expose email, password, tokens, or raw Auth metadata.';
comment on function public.request_platform_account_deletion(uuid, text) is
  'First step of the destructive account-removal flow. Marks DELETION_PENDING only; irreversible Auth/data deletion is a later server-side confirmation slice.';
