-- Fitness Game PWA — Phase 15.3C irreversible account removal
-- Coordinates administrator-confirmed and user-confirmed removal without exposing
-- service-role Auth or Storage operations to the browser.

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
    'ACCOUNT_DELETION_CANCELLED',
    'ACCOUNT_DELETION_CONFIRMED',
    'ACCOUNT_DELETED'
  ));

create table private.platform_account_deletion_jobs (
  target_user_id uuid primary key,
  actor_user_id uuid not null,
  deletion_mode text not null check (deletion_mode in ('ADMIN', 'SELF')),
  revision bigint not null default 1 check (revision > 0),
  status text not null default 'PREPARED'
    check (status in ('PREPARED', 'STORAGE_CLEARED', 'AUTH_DELETE_STARTED', 'COMPLETED')),
  confirmed_at timestamptz not null default now(),
  storage_cleared_at timestamptz,
  auth_delete_started_at timestamptz,
  completed_at timestamptz,
  last_error_code text check (
    last_error_code is null
    or last_error_code ~ '^[A-Z][A-Z0-9_]{2,79}$'
  ),
  check (
    (status = 'PREPARED' and storage_cleared_at is null and auth_delete_started_at is null and completed_at is null)
    or (status = 'STORAGE_CLEARED' and storage_cleared_at is not null and auth_delete_started_at is null and completed_at is null)
    or (status = 'AUTH_DELETE_STARTED' and storage_cleared_at is not null and auth_delete_started_at is not null and completed_at is null)
    or (status = 'COMPLETED' and storage_cleared_at is not null and auth_delete_started_at is not null and completed_at is not null)
  )
);

alter table private.platform_account_deletion_jobs enable row level security;
revoke all on table private.platform_account_deletion_jobs from public, anon, authenticated;

create or replace function private.assert_account_has_no_owned_groups(p_target_user_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.groups g
    where g.created_by = p_target_user_id
  ) then
    raise exception 'Group ownership must be transferred before account deletion'
      using errcode = '42501';
  end if;
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

  perform private.assert_account_has_no_owned_groups(p_target_user_id);

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
      'deletion_requested_by', v_actor,
      'deletion_mode', 'ADMIN'
    )
  );
end;
$$;

create or replace function public.request_own_platform_account_deletion()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_before private.platform_account_state%rowtype;
  v_username text;
  v_reason constant text := 'User requested account deletion';
begin
  v_actor := private.require_active_account();

  if exists (select 1 from private.platform_admins pa where pa.user_id = v_actor) then
    raise exception 'Platform administrator must be revoked before account deletion' using errcode = '42501';
  end if;

  perform private.assert_account_has_no_owned_groups(v_actor);

  select *
  into v_before
  from private.platform_account_state pas
  where pas.user_id = v_actor
  for update;

  if not found then
    raise exception 'Account not found' using errcode = '22023';
  end if;
  if v_before.status <> 'ACTIVE'::public.platform_account_status then
    raise exception 'Account must be active before requesting deletion' using errcode = '42501';
  end if;

  select p.username
  into v_username
  from public.profiles p
  where p.id = v_actor;

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
  where user_id = v_actor;

  insert into private.platform_admin_audit_log (
    actor_user_id, target_user_id, action, reason, before_state, after_state
  ) values (
    v_actor,
    v_actor,
    'ACCOUNT_DELETION_REQUESTED',
    v_reason,
    jsonb_build_object('account_status', v_before.status),
    jsonb_build_object(
      'account_status', 'DELETION_PENDING',
      'deletion_requested_by', v_actor,
      'deletion_mode', 'SELF'
    )
  );

  return format('DELETE %s', v_username);
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
  if exists (
    select 1
    from private.platform_account_deletion_jobs padj
    where padj.target_user_id = p_target_user_id
  ) then
    raise exception 'Deletion confirmation already accepted; retry irreversible deletion'
      using errcode = '42501';
  end if;

  v_restore_status := coalesce(v_before.deletion_previous_status, 'ACTIVE'::public.platform_account_status);

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

create or replace function public.cancel_own_platform_account_deletion(
  p_actor_user_id uuid,
  p_reason text
)
returns public.platform_account_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := trim(coalesce(p_reason, ''));
  v_before private.platform_account_state%rowtype;
  v_restore_status public.platform_account_status;
begin
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Cancellation reason must be between 3 and 500 characters' using errcode = '22023';
  end if;

  select *
  into v_before
  from private.platform_account_state pas
  where pas.user_id = p_actor_user_id
  for update;

  if not found then
    raise exception 'Account not found' using errcode = '22023';
  end if;
  if v_before.status <> 'DELETION_PENDING'::public.platform_account_status
     or v_before.deletion_requested_by <> p_actor_user_id then
    raise exception 'Self-deletion request is not pending' using errcode = '42501';
  end if;
  if exists (
    select 1
    from private.platform_account_deletion_jobs padj
    where padj.target_user_id = p_actor_user_id
  ) then
    raise exception 'Deletion confirmation already accepted; retry irreversible deletion'
      using errcode = '42501';
  end if;

  v_restore_status := coalesce(v_before.deletion_previous_status, 'ACTIVE'::public.platform_account_status);

  update private.platform_account_state
  set
    status = v_restore_status,
    updated_by = p_actor_user_id,
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
  where user_id = p_actor_user_id;

  insert into private.platform_admin_audit_log (
    actor_user_id, target_user_id, action, reason, before_state, after_state
  ) values (
    p_actor_user_id,
    p_actor_user_id,
    'ACCOUNT_DELETION_CANCELLED',
    v_reason,
    jsonb_build_object(
      'account_status', v_before.status,
      'deletion_requested_at', v_before.deletion_requested_at,
      'deletion_mode', 'SELF'
    ),
    jsonb_build_object('account_status', v_restore_status)
  );

  return v_restore_status;
end;
$$;

create or replace function public.prepare_platform_account_deletion(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_mode text,
  p_confirmation text
)
returns table (
  deletion_revision bigint,
  storage_prefix text,
  storage_cleanup_required boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state private.platform_account_state%rowtype;
  v_job private.platform_account_deletion_jobs%rowtype;
  v_username text;
  v_mode text := upper(trim(coalesce(p_mode, '')));
  v_expected_confirmation text;
  v_is_retry boolean := false;
begin
  if v_mode not in ('ADMIN', 'SELF') then
    raise exception 'Deletion mode must be ADMIN or SELF' using errcode = '22023';
  end if;

  select *
  into v_state
  from private.platform_account_state pas
  where pas.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'Target account not found' using errcode = '22023';
  end if;
  if v_state.status <> 'DELETION_PENDING'::public.platform_account_status then
    raise exception 'Target account deletion is not pending' using errcode = '42501';
  end if;
  if exists (select 1 from private.platform_admins pa where pa.user_id = p_target_user_id) then
    raise exception 'Platform administrator must be revoked before account deletion' using errcode = '42501';
  end if;

  select p.username
  into v_username
  from public.profiles p
  where p.id = p_target_user_id;

  perform private.assert_account_has_no_owned_groups(p_target_user_id);

  if v_mode = 'ADMIN' then
    if p_actor_user_id = p_target_user_id then
      raise exception 'Platform administrator cannot delete own account' using errcode = '42501';
    end if;
    if not private.is_active_platform_admin(p_actor_user_id) then
      raise exception 'Active platform administrator required' using errcode = '42501';
    end if;
  else
    if p_actor_user_id <> p_target_user_id
       or v_state.deletion_requested_by <> p_target_user_id then
      raise exception 'Self-deletion actor does not match the pending request' using errcode = '42501';
    end if;
  end if;

  v_expected_confirmation := format('DELETE %s', v_username);
  if p_confirmation is distinct from v_expected_confirmation then
    raise exception 'Deletion confirmation does not match' using errcode = '22023';
  end if;

  select *
  into v_job
  from private.platform_account_deletion_jobs padj
  where padj.target_user_id = p_target_user_id
  for update;

  if found then
    if v_job.status in ('AUTH_DELETE_STARTED', 'COMPLETED') then
      raise exception 'Account deletion has already started' using errcode = '42501';
    end if;
    if v_job.actor_user_id <> p_actor_user_id or v_job.deletion_mode <> v_mode then
      raise exception 'Deletion retry must use the original actor and mode' using errcode = '42501';
    end if;
    v_is_retry := true;

    update private.platform_account_deletion_jobs
    set
      revision = revision + 1,
      confirmed_at = now(),
      last_error_code = null
    where target_user_id = p_target_user_id
    returning * into v_job;
  else
    insert into private.platform_account_deletion_jobs (
      target_user_id,
      actor_user_id,
      deletion_mode
    ) values (
      p_target_user_id,
      p_actor_user_id,
      v_mode
    )
    returning * into v_job;
  end if;

  if not v_is_retry then
    insert into private.platform_admin_audit_log (
      actor_user_id, target_user_id, action, reason, before_state, after_state
    ) values (
      p_actor_user_id,
      p_target_user_id,
      'ACCOUNT_DELETION_CONFIRMED',
      'Irreversible account deletion confirmed',
      jsonb_build_object(
        'account_status', v_state.status,
        'deletion_requested_at', v_state.deletion_requested_at
      ),
      jsonb_build_object(
        'deletion_mode', v_mode,
        'deletion_revision', v_job.revision
      )
    );
  end if;

  return query
  select
    v_job.revision,
    p_target_user_id::text,
    v_job.status = 'PREPARED';
end;
$$;

create or replace function public.mark_platform_account_deletion_storage_cleared(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_deletion_revision bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.platform_account_deletion_jobs
  set
    status = 'STORAGE_CLEARED',
    storage_cleared_at = coalesce(storage_cleared_at, now()),
    last_error_code = null
  where target_user_id = p_target_user_id
    and actor_user_id = p_actor_user_id
    and revision = p_deletion_revision
    and status in ('PREPARED', 'STORAGE_CLEARED');

  if not found then
    raise exception 'Stale or invalid account deletion job' using errcode = '40001';
  end if;
end;
$$;

create or replace function public.record_platform_account_deletion_failure(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_deletion_revision bigint,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_error_code text := upper(trim(coalesce(p_error_code, '')));
begin
  if v_error_code !~ '^[A-Z][A-Z0-9_]{2,79}$' then
    raise exception 'Invalid account deletion error code' using errcode = '22023';
  end if;

  update private.platform_account_deletion_jobs
  set last_error_code = v_error_code
  where target_user_id = p_target_user_id
    and actor_user_id = p_actor_user_id
    and revision = p_deletion_revision
    and status in ('PREPARED', 'STORAGE_CLEARED');

  if not found then
    raise exception 'Stale or invalid account deletion job' using errcode = '40001';
  end if;
end;
$$;

create or replace function private.begin_platform_auth_user_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state private.platform_account_state%rowtype;
  v_job private.platform_account_deletion_jobs%rowtype;
begin
  if not exists (select 1 from public.profiles p where p.id = old.id) then
    return old;
  end if;

  select *
  into v_state
  from private.platform_account_state pas
  where pas.user_id = old.id
  for update;

  if not found or v_state.status <> 'DELETION_PENDING'::public.platform_account_status then
    raise exception 'Prepared account deletion required before Auth user deletion' using errcode = '42501';
  end if;

  select *
  into v_job
  from private.platform_account_deletion_jobs padj
  where padj.target_user_id = old.id
  for update;

  if not found or v_job.status <> 'STORAGE_CLEARED' then
    raise exception 'Storage cleanup required before Auth user deletion' using errcode = '42501';
  end if;
  if exists (select 1 from private.platform_admins pa where pa.user_id = old.id) then
    raise exception 'Platform administrator must be revoked before account deletion' using errcode = '42501';
  end if;

  perform private.assert_account_has_no_owned_groups(old.id);

  update private.platform_account_deletion_jobs
  set
    status = 'AUTH_DELETE_STARTED',
    auth_delete_started_at = now(),
    last_error_code = null
  where target_user_id = old.id;

  return old;
end;
$$;

create trigger auth_users_begin_platform_account_delete
before delete on auth.users
for each row execute function private.begin_platform_auth_user_delete();

create or replace function private.finalize_platform_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state private.platform_account_state%rowtype;
  v_job private.platform_account_deletion_jobs%rowtype;
begin
  select *
  into v_state
  from private.platform_account_state pas
  where pas.user_id = old.id
  for update;

  select *
  into v_job
  from private.platform_account_deletion_jobs padj
  where padj.target_user_id = old.id
  for update;

  if v_state.user_id is null then
    raise exception 'Pending account state required before profile deletion' using errcode = '42501';
  end if;
  if not found or v_job.status <> 'AUTH_DELETE_STARTED' then
    raise exception 'Profile deletion must be coordinated through Auth' using errcode = '42501';
  end if;
  if v_state.status <> 'DELETION_PENDING'::public.platform_account_status then
    raise exception 'Pending account state required before profile deletion' using errcode = '42501';
  end if;
  if exists (select 1 from private.platform_admins pa where pa.user_id = old.id) then
    raise exception 'Platform administrator must be revoked before account deletion' using errcode = '42501';
  end if;

  perform private.assert_account_has_no_owned_groups(old.id);

  update private.platform_account_deletion_jobs
  set
    status = 'COMPLETED',
    completed_at = now(),
    last_error_code = null
  where target_user_id = old.id;

  insert into private.platform_admin_audit_log (
    actor_user_id, target_user_id, action, reason, before_state, after_state
  ) values (
    v_job.actor_user_id,
    old.id,
    'ACCOUNT_DELETED',
    coalesce(v_state.status_reason, 'Account deletion completed'),
    jsonb_build_object(
      'account_status', v_state.status,
      'deletion_mode', v_job.deletion_mode,
      'deletion_revision', v_job.revision
    ),
    jsonb_build_object('account_status', 'DELETED')
  );

  return old;
end;
$$;

create trigger profiles_finalize_platform_account_delete
before delete on public.profiles
for each row execute function private.finalize_platform_profile_delete();

revoke all on function private.assert_account_has_no_owned_groups(uuid) from public, anon, authenticated;
revoke all on function private.begin_platform_auth_user_delete() from public, anon, authenticated;
revoke all on function private.finalize_platform_profile_delete() from public, anon, authenticated;

revoke all on function public.request_own_platform_account_deletion() from public, anon, authenticated;
grant execute on function public.request_own_platform_account_deletion() to authenticated;

revoke all on function public.cancel_own_platform_account_deletion(uuid, text)
from public, anon, authenticated;
grant execute on function public.cancel_own_platform_account_deletion(uuid, text) to service_role;

revoke all on function public.prepare_platform_account_deletion(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.prepare_platform_account_deletion(uuid, uuid, text, text) to service_role;

revoke all on function public.mark_platform_account_deletion_storage_cleared(uuid, uuid, bigint)
from public, anon, authenticated;
grant execute on function public.mark_platform_account_deletion_storage_cleared(uuid, uuid, bigint) to service_role;

revoke all on function public.record_platform_account_deletion_failure(uuid, uuid, bigint, text)
from public, anon, authenticated;
grant execute on function public.record_platform_account_deletion_failure(uuid, uuid, bigint, text) to service_role;

comment on table private.platform_account_deletion_jobs is
  'Retained UUID-only Phase 15.3C coordination state. Contains no username, email, token, or Storage object metadata.';
comment on function public.request_own_platform_account_deletion() is
  'First self-service deletion step. Marks the active caller DELETION_PENDING and returns the exact server-derived second-confirmation phrase.';
comment on function public.prepare_platform_account_deletion(uuid, uuid, text, text) is
  'Service-role-only irreversible deletion preparation for ADMIN and SELF modes. Rechecks authorization, pending state, exact confirmation, platform-admin status, and group ownership.';
comment on function public.mark_platform_account_deletion_storage_cleared(uuid, uuid, bigint) is
  'Service-role-only proof that the Edge Function completed Storage API cleanup before hard Auth deletion.';

notify pgrst, 'reload schema';
