-- Fitness Game PWA — recipient-owned platform inbox deletion
-- Deletion is a private per-recipient tombstone. Shared message content,
-- delivery identity, administrator audit, and other recipients are retained.

alter table private.platform_message_deliveries
  add column deleted_at timestamptz;

create index platform_message_deliveries_visible_recipient_idx
  on private.platform_message_deliveries(recipient_user_id, delivered_at desc, message_id)
  where deleted_at is null;

create or replace function private.protect_platform_message_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Platform message deliveries are retained' using errcode = '42501';
  end if;

  if new.message_id is distinct from old.message_id
     or new.recipient_user_id is distinct from old.recipient_user_id
     or new.recipient_username_snapshot is distinct from old.recipient_username_snapshot
     or new.recipient_display_name_snapshot is distinct from old.recipient_display_name_snapshot
     or new.account_status_at_delivery is distinct from old.account_status_at_delivery
     or new.delivered_at is distinct from old.delivered_at
     or new.read_revision < old.read_revision
     or new.acknowledged_revision < old.acknowledged_revision
     or (old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at)
     or (new.deleted_at is not null and new.deleted_at < old.delivered_at) then
    raise exception 'Platform message delivery identity and progress are immutable' using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.list_my_platform_messages(
  p_page integer default 1,
  p_page_size integer default 20,
  p_include_expired boolean default false
)
returns table (
  message_id uuid,
  audience_type public.platform_message_audience_type,
  message_type public.platform_message_type,
  subject text,
  body text,
  acknowledgement_required boolean,
  current_revision integer,
  delivery_state text,
  delivered_at timestamptz,
  read_at timestamptz,
  acknowledged_at timestamptz,
  sent_at timestamptz,
  edited_at timestamptz,
  expires_at timestamptz,
  is_expired boolean,
  unread_count bigint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := private.require_active_platform_user();
  if p_page < 1 or p_page_size < 1 or p_page_size > 50 then
    raise exception 'Inbox page is outside the supported range' using errcode = '22023';
  end if;

  return query
  with visible as (
    select
      pm.id,
      pm.audience_type,
      pm.message_type,
      pmr.subject,
      pmr.body,
      pm.acknowledgement_required,
      pm.current_revision,
      pmd.delivered_at,
      pmd.read_at,
      pmd.acknowledged_at,
      pmd.read_revision,
      pmd.acknowledged_revision,
      pm.sent_at,
      pm.edited_at,
      pmr.expires_at,
      pmr.expires_at is not null and pmr.expires_at <= now() as expired
    from private.platform_message_deliveries pmd
    join private.platform_messages pm on pm.id = pmd.message_id
    join private.platform_message_revisions pmr
      on pmr.message_id = pm.id
     and pmr.revision = pm.current_revision
    where pmd.recipient_user_id = v_user_id
      and pmd.deleted_at is null
      and pm.status = 'SENT'::public.platform_message_status
      and (p_include_expired or pmr.expires_at is null or pmr.expires_at > now())
  )
  select
    v.id,
    v.audience_type,
    v.message_type,
    v.subject,
    v.body,
    v.acknowledgement_required,
    v.current_revision,
    case
      when v.acknowledgement_required and v.acknowledged_revision = v.current_revision then 'ACKNOWLEDGED'
      when v.read_revision = v.current_revision then 'READ'
      else 'DELIVERED'
    end,
    v.delivered_at,
    case when v.read_revision = v.current_revision then v.read_at else null end,
    case when v.acknowledged_revision = v.current_revision then v.acknowledged_at else null end,
    v.sent_at,
    v.edited_at,
    v.expires_at,
    v.expired,
    count(*) filter (where v.read_revision < v.current_revision) over(),
    count(*) over()
  from visible v
  order by
    case when v.read_revision < v.current_revision then 0 else 1 end,
    case v.message_type
      when 'ACTION_REQUIRED'::public.platform_message_type then 0
      when 'ACCOUNT_STATUS'::public.platform_message_type then 1
      when 'WARNING'::public.platform_message_type then 2
      else 3
    end,
    v.sent_at desc,
    v.id desc
  offset (p_page - 1) * p_page_size
  limit p_page_size;
end;
$$;

create or replace function public.mark_platform_message_read(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_revision integer;
begin
  v_user_id := private.require_active_platform_user();

  select pm.current_revision
  into v_revision
  from private.platform_messages pm
  join private.platform_message_deliveries pmd on pmd.message_id = pm.id
  join private.platform_message_revisions pmr
    on pmr.message_id = pm.id
   and pmr.revision = pm.current_revision
  where pm.id = p_message_id
    and pmd.recipient_user_id = v_user_id
    and pmd.deleted_at is null
    and pm.status = 'SENT'::public.platform_message_status
    and (pmr.expires_at is null or pmr.expires_at > now())
  for update of pmd;

  if not found then
    raise exception 'Inbox message not found or unavailable' using errcode = '22023';
  end if;

  update private.platform_message_deliveries
  set read_revision = v_revision, read_at = now()
  where message_id = p_message_id
    and recipient_user_id = v_user_id
    and deleted_at is null
    and read_revision < v_revision;
end;
$$;

create or replace function public.acknowledge_platform_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_revision integer;
  v_required boolean;
  v_now timestamptz := now();
begin
  v_user_id := private.require_active_platform_user();

  select pm.current_revision, pm.acknowledgement_required
  into v_revision, v_required
  from private.platform_messages pm
  join private.platform_message_deliveries pmd on pmd.message_id = pm.id
  join private.platform_message_revisions pmr
    on pmr.message_id = pm.id
   and pmr.revision = pm.current_revision
  where pm.id = p_message_id
    and pmd.recipient_user_id = v_user_id
    and pmd.deleted_at is null
    and pm.status = 'SENT'::public.platform_message_status
    and (pmr.expires_at is null or pmr.expires_at > now())
  for update of pmd;

  if not found then
    raise exception 'Inbox message not found or unavailable' using errcode = '22023';
  end if;
  if not v_required then
    raise exception 'Message does not require acknowledgement' using errcode = '22023';
  end if;

  update private.platform_message_deliveries
  set
    read_revision = v_revision,
    read_at = v_now,
    acknowledged_revision = v_revision,
    acknowledged_at = v_now
  where message_id = p_message_id
    and recipient_user_id = v_user_id
    and deleted_at is null;
end;
$$;

create or replace function public.delete_my_platform_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_current_revision integer;
  v_acknowledgement_required boolean;
  v_acknowledged_revision integer;
  v_deleted_at timestamptz;
begin
  v_user_id := private.require_active_platform_user();

  select
    pm.current_revision,
    pm.acknowledgement_required,
    pmd.acknowledged_revision,
    pmd.deleted_at
  into
    v_current_revision,
    v_acknowledgement_required,
    v_acknowledged_revision,
    v_deleted_at
  from private.platform_messages pm
  join private.platform_message_deliveries pmd on pmd.message_id = pm.id
  where pm.id = p_message_id
    and pmd.recipient_user_id = v_user_id
    and pm.status = 'SENT'::public.platform_message_status
  for update of pmd;

  if not found then
    raise exception 'Inbox message not found or unavailable' using errcode = '22023';
  end if;
  if v_deleted_at is not null then
    return;
  end if;
  if v_acknowledgement_required and v_acknowledged_revision <> v_current_revision then
    raise exception 'Acknowledge this message before deleting it' using errcode = '22023';
  end if;

  update private.platform_message_deliveries
  set deleted_at = now()
  where message_id = p_message_id
    and recipient_user_id = v_user_id
    and deleted_at is null;
end;
$$;

revoke all on function public.delete_my_platform_message(uuid) from public, anon, authenticated;
grant execute on function public.delete_my_platform_message(uuid) to authenticated;

comment on column private.platform_message_deliveries.deleted_at is
  'Recipient-only inbox tombstone. Does not remove shared message, recipient identity, progress, or administrator audit history.';
comment on function public.delete_my_platform_message(uuid) is
  'Permanently hides one received message from the active caller inbox. Required current revisions must be acknowledged first.';

notify pgrst, 'reload schema';
