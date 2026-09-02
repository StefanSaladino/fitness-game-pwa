-- Top Set — Phase 17.8 release-blocking account-deletion ownership fallback
--
-- Repairs two related ownership invariants:
-- 1. Manual transfer_group_ownership must update groups.created_by, because that
--    column is the profile FK and canonical deletion blocker.
-- 2. Admin-initiated account deletion automatically transfers each owned group
--    to a deterministic eligible successor before the account enters deletion pending.
--
-- Self-deletion remains fail-closed for group owners. If an admin deletes a sole
-- owner with no eligible active successor, deletion remains blocked until the group
-- is explicitly handled.

create or replace function private.set_group_owner_canonical(
  p_group_id uuid,
  p_previous_owner_user_id uuid,
  p_new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1
  from public.groups g
  where g.id = p_group_id
  for update;

  if not found then
    raise exception 'Group not found' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_new_owner_user_id
      and gm.status = 'ACTIVE'::public.group_member_status
  ) then
    raise exception 'Target must be an active group member' using errcode = '22023';
  end if;

  if p_previous_owner_user_id <> p_new_owner_user_id then
    update public.group_members
    set role = 'ADMIN'::public.group_role
    where group_id = p_group_id
      and user_id = p_previous_owner_user_id
      and status = 'ACTIVE'::public.group_member_status
      and role = 'OWNER'::public.group_role;

    update public.group_members
    set role = 'OWNER'::public.group_role
    where group_id = p_group_id
      and user_id = p_new_owner_user_id
      and status = 'ACTIVE'::public.group_member_status;
  end if;

  update public.groups
  set created_by = p_new_owner_user_id
  where id = p_group_id;
end;
$$;

revoke all on function private.set_group_owner_canonical(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

create or replace function private.reassign_owned_groups_for_admin_deletion(
  p_target_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_successor_user_id uuid;
  v_transferred_count integer := 0;
begin
  for v_group_id in
    select g.id
    from public.groups g
    where g.created_by = p_target_user_id
    order by g.id
    for update
  loop
    v_successor_user_id := null;

    select gm.user_id
    into v_successor_user_id
    from public.group_members gm
    join private.platform_account_state pas
      on pas.user_id = gm.user_id
    where gm.group_id = v_group_id
      and gm.user_id <> p_target_user_id
      and gm.status = 'ACTIVE'::public.group_member_status
      and pas.status = 'ACTIVE'::public.platform_account_status
    order by
      case gm.role
        when 'OWNER'::public.group_role then 0
        when 'ADMIN'::public.group_role then 1
        else 2
      end,
      gm.joined_at,
      gm.user_id
    limit 1
    for update of gm;

    if v_successor_user_id is null then
      raise exception
        'Owned group has no active successor; transfer ownership or remove the group before account deletion'
        using errcode = '42501';
    end if;

    perform private.set_group_owner_canonical(
      v_group_id,
      p_target_user_id,
      v_successor_user_id
    );

    v_transferred_count := v_transferred_count + 1;
  end loop;

  return v_transferred_count;
end;
$$;

revoke all on function private.reassign_owned_groups_for_admin_deletion(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.transfer_group_ownership(
  p_group_id uuid,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = v_actor
      and gm.status = 'ACTIVE'::public.group_member_status
      and gm.role = 'OWNER'::public.group_role
  ) then
    raise exception 'Only the owner can transfer ownership' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_target_user_id
      and gm.status = 'ACTIVE'::public.group_member_status
  ) then
    raise exception 'Target must be an active group member' using errcode = '22023';
  end if;

  perform private.set_group_owner_canonical(
    p_group_id,
    v_actor,
    p_target_user_id
  );
end;
$$;

revoke execute on function public.transfer_group_ownership(uuid, uuid)
  from public, anon;
grant execute on function public.transfer_group_ownership(uuid, uuid)
  to authenticated;

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
  v_transferred_group_count integer := 0;
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

  v_transferred_group_count :=
    private.reassign_owned_groups_for_admin_deletion(p_target_user_id);

  perform private.assert_account_has_no_owned_groups(p_target_user_id);

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
      'deletion_mode', 'ADMIN',
      'auto_transferred_group_count', v_transferred_group_count
    )
  );
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

  if v_mode = 'ADMIN' then
    if p_actor_user_id = p_target_user_id then
      raise exception 'Platform administrator cannot delete own account' using errcode = '42501';
    end if;
    if not private.is_active_platform_admin(p_actor_user_id) then
      raise exception 'Active platform administrator required' using errcode = '42501';
    end if;

    -- Idempotent safety net for legacy pending deletions or ownership created
    -- between the request and irreversible preparation.
    perform private.reassign_owned_groups_for_admin_deletion(p_target_user_id);
  else
    if p_actor_user_id <> p_target_user_id
       or v_state.deletion_requested_by <> p_target_user_id then
      raise exception 'Self-deletion actor does not match the pending request' using errcode = '42501';
    end if;
  end if;

  perform private.assert_account_has_no_owned_groups(p_target_user_id);

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

notify pgrst, 'reload schema';
