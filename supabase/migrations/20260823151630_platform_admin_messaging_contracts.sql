-- Fitness Game PWA — Phase 15.4 administrator-to-user messaging
-- Audience resolution, delivery fan-out, recipient history, content revisions,
-- and administrator audit all stay server-authoritative.

create type public.platform_message_type as enum (
  'NOTICE',
  'WARNING',
  'ACTION_REQUIRED',
  'ACCOUNT_STATUS'
);

create type public.platform_message_audience_type as enum (
  'USER',
  'GROUP',
  'ALL'
);

create type public.platform_message_status as enum (
  'SENT',
  'WITHDRAWN'
);

create table private.platform_messages (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  creator_username_snapshot text not null,
  creator_display_name_snapshot text not null,
  audience_type public.platform_message_audience_type not null,
  audience_label_snapshot text not null,
  target_user_id uuid,
  target_username_snapshot text,
  target_display_name_snapshot text,
  target_group_id uuid,
  target_group_name_snapshot text,
  message_type public.platform_message_type not null,
  acknowledgement_required boolean not null default false,
  status public.platform_message_status not null default 'SENT',
  current_revision integer not null default 1 check (current_revision > 0),
  recipient_count integer not null check (recipient_count > 0),
  sent_at timestamptz not null default now(),
  edited_at timestamptz,
  withdrawn_at timestamptz,
  withdrawn_by uuid,
  withdrawal_reason text check (
    withdrawal_reason is null
    or char_length(trim(withdrawal_reason)) between 3 and 500
  ),
  retention_until timestamptz not null default (now() + interval '2 years'),
  check (char_length(creator_username_snapshot) between 3 and 32),
  check (char_length(creator_display_name_snapshot) between 1 and 80),
  check (char_length(audience_label_snapshot) between 1 and 180),
  check (
    (
      audience_type = 'USER'
      and target_user_id is not null
      and char_length(target_username_snapshot) between 3 and 32
      and char_length(target_display_name_snapshot) between 1 and 80
      and target_group_id is null
      and target_group_name_snapshot is null
    )
    or (
      audience_type = 'GROUP'
      and target_user_id is null
      and target_username_snapshot is null
      and target_display_name_snapshot is null
      and target_group_id is not null
      and char_length(target_group_name_snapshot) between 1 and 80
    )
    or (
      audience_type = 'ALL'
      and target_user_id is null
      and target_username_snapshot is null
      and target_display_name_snapshot is null
      and target_group_id is null
      and target_group_name_snapshot is null
    )
  ),
  check (
    (
      status = 'SENT'
      and withdrawn_at is null
      and withdrawn_by is null
      and withdrawal_reason is null
    )
    or (
      status = 'WITHDRAWN'
      and withdrawn_at is not null
      and withdrawn_by is not null
      and withdrawal_reason is not null
    )
  ),
  check (edited_at is null or edited_at >= sent_at),
  check (retention_until >= sent_at + interval '2 years')
);

create table private.platform_message_revisions (
  message_id uuid not null references private.platform_messages(id) on delete restrict,
  revision integer not null check (revision > 0),
  subject text not null check (char_length(trim(subject)) between 3 and 120),
  body text not null check (char_length(trim(body)) between 10 and 4000),
  expires_at timestamptz,
  edited_by uuid not null,
  editor_username_snapshot text not null,
  editor_display_name_snapshot text not null,
  edit_reason text not null check (char_length(trim(edit_reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  primary key (message_id, revision),
  check (expires_at is null or expires_at > created_at),
  check (char_length(editor_username_snapshot) between 3 and 32),
  check (char_length(editor_display_name_snapshot) between 1 and 80)
);

create table private.platform_message_deliveries (
  message_id uuid not null references private.platform_messages(id) on delete restrict,
  recipient_user_id uuid not null,
  recipient_username_snapshot text not null,
  recipient_display_name_snapshot text not null,
  account_status_at_delivery public.platform_account_status not null,
  delivered_at timestamptz not null default now(),
  read_revision integer not null default 0 check (read_revision >= 0),
  read_at timestamptz,
  acknowledged_revision integer not null default 0 check (acknowledged_revision >= 0),
  acknowledged_at timestamptz,
  primary key (message_id, recipient_user_id),
  check (char_length(recipient_username_snapshot) between 3 and 32),
  check (char_length(recipient_display_name_snapshot) between 1 and 80),
  check (
    (read_revision = 0 and read_at is null)
    or (read_revision > 0 and read_at is not null)
  ),
  check (
    (acknowledged_revision = 0 and acknowledged_at is null)
    or (acknowledged_revision > 0 and acknowledged_at is not null)
  ),
  check (acknowledged_revision <= read_revision)
);

create table private.platform_message_events (
  id bigint generated always as identity primary key,
  message_id uuid not null references private.platform_messages(id) on delete restrict,
  actor_user_id uuid not null,
  actor_username_snapshot text not null,
  actor_display_name_snapshot text not null,
  action text not null check (action in ('MESSAGE_SENT', 'MESSAGE_EDITED', 'MESSAGE_WITHDRAWN')),
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  before_state jsonb not null default '{}'::jsonb check (jsonb_typeof(before_state) = 'object'),
  after_state jsonb not null default '{}'::jsonb check (jsonb_typeof(after_state) = 'object'),
  occurred_at timestamptz not null default now(),
  retention_until timestamptz not null default (now() + interval '2 years'),
  check (char_length(actor_username_snapshot) between 3 and 32),
  check (char_length(actor_display_name_snapshot) between 1 and 80),
  check (retention_until >= occurred_at + interval '2 years')
);

create table private.platform_message_previews (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  audience_type public.platform_message_audience_type not null,
  target_user_id uuid,
  target_group_id uuid,
  message_type public.platform_message_type not null,
  audience_label text not null check (char_length(audience_label) between 1 and 180),
  recipient_count integer not null check (recipient_count > 0),
  recipient_fingerprint text not null check (recipient_fingerprint ~ '^[0-9a-f]{64}$'),
  confirmation_phrase text not null check (char_length(confirmation_phrase) between 8 and 80),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  sent_message_id uuid unique references private.platform_messages(id) on delete restrict,
  check (expires_at > created_at and expires_at <= created_at + interval '10 minutes'),
  check (
    (audience_type = 'USER' and target_user_id is not null and target_group_id is null)
    or (audience_type = 'GROUP' and target_user_id is null and target_group_id is not null)
    or (audience_type = 'ALL' and target_user_id is null and target_group_id is null)
  )
);

create index platform_messages_creator_sent_idx
  on private.platform_messages(created_by, sent_at desc, id);
create index platform_messages_audience_sent_idx
  on private.platform_messages(audience_type, sent_at desc, id);
create index platform_message_deliveries_recipient_idx
  on private.platform_message_deliveries(recipient_user_id, delivered_at desc, message_id);
create index platform_message_events_message_idx
  on private.platform_message_events(message_id, occurred_at, id);
create index platform_message_previews_actor_expiry_idx
  on private.platform_message_previews(actor_user_id, expires_at desc);

alter table private.platform_messages enable row level security;
alter table private.platform_message_revisions enable row level security;
alter table private.platform_message_deliveries enable row level security;
alter table private.platform_message_events enable row level security;
alter table private.platform_message_previews enable row level security;

revoke all on table private.platform_messages from public, anon, authenticated;
revoke all on table private.platform_message_revisions from public, anon, authenticated;
revoke all on table private.platform_message_deliveries from public, anon, authenticated;
revoke all on table private.platform_message_events from public, anon, authenticated;
revoke all on table private.platform_message_previews from public, anon, authenticated;

create or replace function private.reject_platform_message_immutable_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Platform message history is immutable' using errcode = '42501';
end;
$$;

create trigger platform_messages_no_delete
before delete on private.platform_messages
for each row execute function private.reject_platform_message_immutable_mutation();

create trigger platform_message_revisions_immutable
before update or delete on private.platform_message_revisions
for each row execute function private.reject_platform_message_immutable_mutation();

create trigger platform_message_events_immutable
before update or delete on private.platform_message_events
for each row execute function private.reject_platform_message_immutable_mutation();

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
     or new.acknowledged_revision < old.acknowledged_revision then
    raise exception 'Platform message delivery identity and progress are immutable' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger platform_message_deliveries_protected
before update or delete on private.platform_message_deliveries
for each row execute function private.protect_platform_message_delivery();

create or replace function private.require_active_platform_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from private.platform_account_state pas
    where pas.user_id = v_user_id
      and pas.status = 'ACTIVE'::public.platform_account_status
  ) then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  return v_user_id;
end;
$$;

create or replace function private.resolve_platform_message_recipients(
  p_audience_type public.platform_message_audience_type,
  p_target_user_id uuid,
  p_target_group_id uuid,
  p_message_type public.platform_message_type
)
returns table (
  user_id uuid,
  username text,
  display_name text,
  account_status public.platform_account_status
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_audience_type = 'USER'::public.platform_message_audience_type then
    if p_target_user_id is null or p_target_group_id is not null then
      raise exception 'Individual audience requires exactly one user' using errcode = '22023';
    end if;

    return query
    select p.id, p.username, p.display_name, pas.status
    from public.profiles p
    join private.platform_account_state pas on pas.user_id = p.id
    where p.id = p_target_user_id
      and (
        pas.status = 'ACTIVE'::public.platform_account_status
        or p_message_type in (
          'WARNING'::public.platform_message_type,
          'ACTION_REQUIRED'::public.platform_message_type,
          'ACCOUNT_STATUS'::public.platform_message_type
        )
      );
  elsif p_audience_type = 'GROUP'::public.platform_message_audience_type then
    if p_target_group_id is null or p_target_user_id is not null then
      raise exception 'Group audience requires exactly one group' using errcode = '22023';
    end if;

    return query
    select p.id, p.username, p.display_name, pas.status
    from public.group_members gm
    join public.profiles p on p.id = gm.user_id
    join private.platform_account_state pas on pas.user_id = p.id
    where gm.group_id = p_target_group_id
      and gm.status = 'ACTIVE'::public.group_member_status
      and pas.status = 'ACTIVE'::public.platform_account_status
    order by p.id;
  elsif p_audience_type = 'ALL'::public.platform_message_audience_type then
    if p_target_user_id is not null or p_target_group_id is not null then
      raise exception 'All-user audience cannot include a target ID' using errcode = '22023';
    end if;

    return query
    select p.id, p.username, p.display_name, pas.status
    from public.profiles p
    join private.platform_account_state pas on pas.user_id = p.id
    where pas.status = 'ACTIVE'::public.platform_account_status
    order by p.id;
  else
    raise exception 'Unsupported platform message audience' using errcode = '22023';
  end if;
end;
$$;

create or replace function private.platform_message_recipient_fingerprint(
  p_audience_type public.platform_message_audience_type,
  p_target_user_id uuid,
  p_target_group_id uuid,
  p_message_type public.platform_message_type
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(
    extensions.digest(
      coalesce(
        string_agg(
          recipients.user_id::text || ':' || recipients.account_status::text,
          ',' order by recipients.user_id
        ),
        ''
      ),
      'sha256'
    ),
    'hex'
  )
  from private.resolve_platform_message_recipients(
    p_audience_type,
    p_target_user_id,
    p_target_group_id,
    p_message_type
  ) recipients;
$$;

create or replace function public.search_platform_message_users(
  p_query text default null,
  p_limit integer default 10
)
returns table (
  user_id uuid,
  username text,
  display_name text,
  account_status public.platform_account_status
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := lower(trim(coalesce(p_query, '')));
begin
  perform private.require_active_platform_admin();
  if p_limit < 1 or p_limit > 20 then
    raise exception 'User search limit must be between 1 and 20' using errcode = '22023';
  end if;

  return query
  select p.id, p.username, p.display_name, pas.status
  from public.profiles p
  join private.platform_account_state pas on pas.user_id = p.id
  where v_query = ''
     or lower(p.username) like '%' || v_query || '%'
     or lower(p.display_name) like '%' || v_query || '%'
     or p.id::text = v_query
  order by
    case when lower(p.username) = v_query then 0 else 1 end,
    lower(p.username),
    p.id
  limit p_limit;
end;
$$;

create or replace function public.search_platform_message_groups(
  p_query text default null,
  p_limit integer default 10
)
returns table (
  group_id uuid,
  group_name text,
  eligible_recipient_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := lower(trim(coalesce(p_query, '')));
begin
  perform private.require_active_platform_admin();
  if p_limit < 1 or p_limit > 20 then
    raise exception 'Group search limit must be between 1 and 20' using errcode = '22023';
  end if;

  return query
  select
    g.id,
    g.name,
    count(pas.user_id)::integer
  from public.groups g
  left join public.group_members gm
    on gm.group_id = g.id
   and gm.status = 'ACTIVE'::public.group_member_status
  left join public.profiles p on p.id = gm.user_id
  left join private.platform_account_state pas
    on pas.user_id = p.id
   and pas.status = 'ACTIVE'::public.platform_account_status
  where v_query = ''
     or lower(g.name) like '%' || v_query || '%'
     or g.id::text = v_query
  group by g.id, g.name
  order by
    case when lower(g.name) = v_query then 0 else 1 end,
    lower(g.name),
    g.id
  limit p_limit;
end;
$$;

create or replace function public.preview_platform_message_audience(
  p_audience_type public.platform_message_audience_type,
  p_target_user_id uuid default null,
  p_target_group_id uuid default null,
  p_message_type public.platform_message_type default 'NOTICE'
)
returns table (
  preview_id uuid,
  audience_type public.platform_message_audience_type,
  audience_label text,
  recipient_count integer,
  confirmation_phrase text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_count integer;
  v_fingerprint text;
  v_label text;
  v_confirmation text;
  v_preview private.platform_message_previews%rowtype;
begin
  v_actor := private.require_active_platform_admin();

  if p_audience_type = 'ALL'::public.platform_message_audience_type
     and p_message_type <> 'NOTICE'::public.platform_message_type then
    raise exception 'Full-platform blasts must be dismissible notices' using errcode = '22023';
  end if;

  select count(*)::integer
  into v_count
  from private.resolve_platform_message_recipients(
    p_audience_type,
    p_target_user_id,
    p_target_group_id,
    p_message_type
  );

  if v_count = 0 then
    if p_audience_type = 'USER'::public.platform_message_audience_type then
      raise exception 'Target account is unavailable for this message type' using errcode = '22023';
    end if;
    raise exception 'Audience has no eligible active recipients' using errcode = '22023';
  end if;

  v_fingerprint := private.platform_message_recipient_fingerprint(
    p_audience_type,
    p_target_user_id,
    p_target_group_id,
    p_message_type
  );

  if p_audience_type = 'USER'::public.platform_message_audience_type then
    select format('@%s — %s', r.username, r.display_name)
    into v_label
    from private.resolve_platform_message_recipients(
      p_audience_type,
      p_target_user_id,
      p_target_group_id,
      p_message_type
    ) r;
  elsif p_audience_type = 'GROUP'::public.platform_message_audience_type then
    select g.name into v_label
    from public.groups g
    where g.id = p_target_group_id;
    if not found then
      raise exception 'Target group not found' using errcode = '22023';
    end if;
  else
    v_label := 'All eligible users';
  end if;

  v_confirmation := format(
    'SEND TO %s %s',
    v_count,
    case when v_count = 1 then 'USER' else 'USERS' end
  );

  insert into private.platform_message_previews (
    actor_user_id,
    audience_type,
    target_user_id,
    target_group_id,
    message_type,
    audience_label,
    recipient_count,
    recipient_fingerprint,
    confirmation_phrase
  ) values (
    v_actor,
    p_audience_type,
    p_target_user_id,
    p_target_group_id,
    p_message_type,
    v_label,
    v_count,
    v_fingerprint,
    v_confirmation
  )
  returning * into v_preview;

  return query
  select
    v_preview.id,
    v_preview.audience_type,
    v_preview.audience_label,
    v_preview.recipient_count,
    v_preview.confirmation_phrase,
    v_preview.expires_at;
end;
$$;

create or replace function public.send_platform_message(
  p_preview_id uuid,
  p_subject text,
  p_body text,
  p_acknowledgement_required boolean,
  p_expires_at timestamptz,
  p_confirmation text,
  p_audit_reason text
)
returns table (
  message_id uuid,
  recipient_count integer,
  sent_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_actor_username text;
  v_actor_display_name text;
  v_preview private.platform_message_previews%rowtype;
  v_message private.platform_messages%rowtype;
  v_subject text := trim(coalesce(p_subject, ''));
  v_body text := trim(coalesce(p_body, ''));
  v_reason text := trim(coalesce(p_audit_reason, ''));
  v_count integer;
  v_fingerprint text;
  v_target_username text;
  v_target_display_name text;
begin
  v_actor := private.require_active_platform_admin();

  select p.username, p.display_name
  into v_actor_username, v_actor_display_name
  from public.profiles p
  where p.id = v_actor;

  select *
  into v_preview
  from private.platform_message_previews pmp
  where pmp.id = p_preview_id
  for update;

  if not found or v_preview.actor_user_id <> v_actor then
    raise exception 'Active message preview is required' using errcode = '42501';
  end if;

  if v_preview.sent_message_id is not null then
    return query
    select pm.id, pm.recipient_count, pm.sent_at
    from private.platform_messages pm
    where pm.id = v_preview.sent_message_id;
    return;
  end if;

  if v_preview.expires_at <= now() then
    raise exception 'Message preview expired; preview the audience again' using errcode = '22023';
  end if;
  if coalesce(p_confirmation, '') <> v_preview.confirmation_phrase then
    raise exception 'Message confirmation does not match' using errcode = '22023';
  end if;
  if char_length(v_subject) not between 3 and 120 then
    raise exception 'Message subject must be between 3 and 120 characters' using errcode = '22023';
  end if;
  if char_length(v_body) not between 10 and 4000 then
    raise exception 'Message body must be between 10 and 4000 characters' using errcode = '22023';
  end if;
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Message audit reason must be between 3 and 500 characters' using errcode = '22023';
  end if;
  if v_preview.message_type <> 'NOTICE'::public.platform_message_type
     and p_expires_at is not null then
    raise exception 'Warnings and required/account notices do not expire' using errcode = '22023';
  end if;
  if v_preview.audience_type = 'ALL'::public.platform_message_audience_type
     and coalesce(p_acknowledgement_required, false) then
    raise exception 'Full-platform blasts are dismissible and cannot require acknowledgement' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() + interval '5 minutes' then
    raise exception 'Message expiry must be at least five minutes in the future' using errcode = '22023';
  end if;

  -- Keep audience membership stable across the fingerprint check and delivery
  -- insert. The locks are held only for this short, set-based transaction.
  lock table public.profiles in share mode;
  lock table public.group_members in share mode;
  lock table private.platform_account_state in share mode;

  select count(*)::integer
  into v_count
  from private.resolve_platform_message_recipients(
    v_preview.audience_type,
    v_preview.target_user_id,
    v_preview.target_group_id,
    v_preview.message_type
  );
  v_fingerprint := private.platform_message_recipient_fingerprint(
    v_preview.audience_type,
    v_preview.target_user_id,
    v_preview.target_group_id,
    v_preview.message_type
  );

  if v_count <> v_preview.recipient_count
     or v_fingerprint <> v_preview.recipient_fingerprint then
    raise exception 'Audience changed; preview and confirm again' using errcode = '40001';
  end if;

  if v_preview.audience_type = 'USER'::public.platform_message_audience_type then
    select r.username, r.display_name
    into v_target_username, v_target_display_name
    from private.resolve_platform_message_recipients(
      v_preview.audience_type,
      v_preview.target_user_id,
      v_preview.target_group_id,
      v_preview.message_type
    ) r;
  end if;

  insert into private.platform_messages (
    created_by,
    creator_username_snapshot,
    creator_display_name_snapshot,
    audience_type,
    audience_label_snapshot,
    target_user_id,
    target_username_snapshot,
    target_display_name_snapshot,
    target_group_id,
    target_group_name_snapshot,
    message_type,
    acknowledgement_required,
    recipient_count
  ) values (
    v_actor,
    v_actor_username,
    v_actor_display_name,
    v_preview.audience_type,
    v_preview.audience_label,
    v_preview.target_user_id,
    v_target_username,
    v_target_display_name,
    v_preview.target_group_id,
    case
      when v_preview.audience_type = 'GROUP'::public.platform_message_audience_type
      then v_preview.audience_label
      else null
    end,
    v_preview.message_type,
    coalesce(p_acknowledgement_required, false),
    v_count
  )
  returning * into v_message;

  insert into private.platform_message_revisions (
    message_id,
    revision,
    subject,
    body,
    expires_at,
    edited_by,
    editor_username_snapshot,
    editor_display_name_snapshot,
    edit_reason,
    created_at
  ) values (
    v_message.id,
    1,
    v_subject,
    v_body,
    p_expires_at,
    v_actor,
    v_actor_username,
    v_actor_display_name,
    v_reason,
    v_message.sent_at
  );

  insert into private.platform_message_deliveries (
    message_id,
    recipient_user_id,
    recipient_username_snapshot,
    recipient_display_name_snapshot,
    account_status_at_delivery,
    delivered_at
  )
  select
    v_message.id,
    r.user_id,
    r.username,
    r.display_name,
    r.account_status,
    v_message.sent_at
  from private.resolve_platform_message_recipients(
    v_preview.audience_type,
    v_preview.target_user_id,
    v_preview.target_group_id,
    v_preview.message_type
  ) r;

  insert into private.platform_message_events (
    message_id,
    actor_user_id,
    actor_username_snapshot,
    actor_display_name_snapshot,
    action,
    reason,
    before_state,
    after_state,
    occurred_at
  ) values (
    v_message.id,
    v_actor,
    v_actor_username,
    v_actor_display_name,
    'MESSAGE_SENT',
    v_reason,
    '{}'::jsonb,
    jsonb_build_object(
      'audienceType', v_message.audience_type,
      'audienceLabel', v_message.audience_label_snapshot,
      'messageType', v_message.message_type,
      'acknowledgementRequired', v_message.acknowledgement_required,
      'recipientCount', v_message.recipient_count,
      'revision', 1,
      'subject', v_subject,
      'expiresAt', p_expires_at
    ),
    v_message.sent_at
  );

  update private.platform_message_previews
  set sent_message_id = v_message.id
  where id = v_preview.id;

  return query select v_message.id, v_message.recipient_count, v_message.sent_at;
end;
$$;

create or replace function public.edit_platform_message(
  p_message_id uuid,
  p_subject text,
  p_body text,
  p_expires_at timestamptz,
  p_reason text
)
returns table (
  message_id uuid,
  revision integer,
  edited_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_actor_username text;
  v_actor_display_name text;
  v_message private.platform_messages%rowtype;
  v_current private.platform_message_revisions%rowtype;
  v_subject text := trim(coalesce(p_subject, ''));
  v_body text := trim(coalesce(p_body, ''));
  v_reason text := trim(coalesce(p_reason, ''));
  v_revision integer;
  v_edited_at timestamptz := now();
begin
  v_actor := private.require_active_platform_admin();
  select p.username, p.display_name
  into v_actor_username, v_actor_display_name
  from public.profiles p
  where p.id = v_actor;

  select * into v_message
  from private.platform_messages pm
  where pm.id = p_message_id
  for update;

  if not found then
    raise exception 'Platform message not found' using errcode = '22023';
  end if;
  if v_message.status = 'WITHDRAWN'::public.platform_message_status then
    raise exception 'Withdrawn messages cannot be edited' using errcode = '22023';
  end if;
  if char_length(v_subject) not between 3 and 120
     or char_length(v_body) not between 10 and 4000 then
    raise exception 'Message subject or body is outside the supported length' using errcode = '22023';
  end if;
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Edit reason must be between 3 and 500 characters' using errcode = '22023';
  end if;
  if v_message.message_type <> 'NOTICE'::public.platform_message_type
     and p_expires_at is not null then
    raise exception 'Warnings and required/account notices do not expire' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() + interval '5 minutes' then
    raise exception 'Message expiry must be at least five minutes in the future' using errcode = '22023';
  end if;

  select * into v_current
  from private.platform_message_revisions pmr
  where pmr.message_id = v_message.id
    and pmr.revision = v_message.current_revision;

  if v_current.subject = v_subject
     and v_current.body = v_body
     and v_current.expires_at is not distinct from p_expires_at then
    raise exception 'Message edit must change the recipient-visible content' using errcode = '22023';
  end if;

  v_revision := v_message.current_revision + 1;
  insert into private.platform_message_revisions (
    message_id, revision, subject, body, expires_at, edited_by,
    editor_username_snapshot, editor_display_name_snapshot, edit_reason, created_at
  ) values (
    v_message.id, v_revision, v_subject, v_body, p_expires_at, v_actor,
    v_actor_username, v_actor_display_name, v_reason, v_edited_at
  );

  update private.platform_messages
  set current_revision = v_revision, edited_at = v_edited_at
  where id = v_message.id;

  insert into private.platform_message_events (
    message_id, actor_user_id, actor_username_snapshot, actor_display_name_snapshot,
    action, reason, before_state, after_state, occurred_at
  ) values (
    v_message.id, v_actor, v_actor_username, v_actor_display_name,
    'MESSAGE_EDITED', v_reason,
    jsonb_build_object(
      'revision', v_current.revision,
      'subject', v_current.subject,
      'body', v_current.body,
      'expiresAt', v_current.expires_at
    ),
    jsonb_build_object(
      'revision', v_revision,
      'subject', v_subject,
      'body', v_body,
      'expiresAt', p_expires_at
    ),
    v_edited_at
  );

  return query select v_message.id, v_revision, v_edited_at;
end;
$$;

create or replace function public.withdraw_platform_message(
  p_message_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_actor_username text;
  v_actor_display_name text;
  v_message private.platform_messages%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_withdrawn_at timestamptz := now();
begin
  v_actor := private.require_active_platform_admin();
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Withdrawal reason must be between 3 and 500 characters' using errcode = '22023';
  end if;

  select p.username, p.display_name
  into v_actor_username, v_actor_display_name
  from public.profiles p
  where p.id = v_actor;

  select * into v_message
  from private.platform_messages pm
  where pm.id = p_message_id
  for update;

  if not found then
    raise exception 'Platform message not found' using errcode = '22023';
  end if;
  if v_message.status = 'WITHDRAWN'::public.platform_message_status then
    raise exception 'Platform message is already withdrawn' using errcode = '22023';
  end if;

  update private.platform_messages
  set
    status = 'WITHDRAWN'::public.platform_message_status,
    withdrawn_at = v_withdrawn_at,
    withdrawn_by = v_actor,
    withdrawal_reason = v_reason
  where id = v_message.id;

  insert into private.platform_message_events (
    message_id, actor_user_id, actor_username_snapshot, actor_display_name_snapshot,
    action, reason, before_state, after_state, occurred_at
  ) values (
    v_message.id, v_actor, v_actor_username, v_actor_display_name,
    'MESSAGE_WITHDRAWN', v_reason,
    jsonb_build_object('status', v_message.status, 'revision', v_message.current_revision),
    jsonb_build_object('status', 'WITHDRAWN', 'revision', v_message.current_revision),
    v_withdrawn_at
  );
end;
$$;

create or replace function public.list_platform_messages(
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  message_id uuid,
  audience_type public.platform_message_audience_type,
  audience_label text,
  message_type public.platform_message_type,
  subject text,
  body text,
  acknowledgement_required boolean,
  expires_at timestamptz,
  status public.platform_message_status,
  current_revision integer,
  recipient_count integer,
  read_count integer,
  acknowledged_count integer,
  sent_at timestamptz,
  edited_at timestamptz,
  withdrawn_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_active_platform_admin();
  if p_page < 1 or p_page_size < 1 or p_page_size > 50 then
    raise exception 'Message page is outside the supported range' using errcode = '22023';
  end if;

  return query
  select
    pm.id,
    pm.audience_type,
    pm.audience_label_snapshot,
    pm.message_type,
    pmr.subject,
    pmr.body,
    pm.acknowledgement_required,
    pmr.expires_at,
    pm.status,
    pm.current_revision,
    pm.recipient_count,
    count(*) filter (where pmd.read_revision = pm.current_revision)::integer,
    count(*) filter (where pmd.acknowledged_revision = pm.current_revision)::integer,
    pm.sent_at,
    pm.edited_at,
    pm.withdrawn_at,
    count(*) over() as total_count
  from private.platform_messages pm
  join private.platform_message_revisions pmr
    on pmr.message_id = pm.id
   and pmr.revision = pm.current_revision
  join private.platform_message_deliveries pmd on pmd.message_id = pm.id
  group by pm.id, pmr.subject, pmr.body, pmr.expires_at
  order by pm.sent_at desc, pm.id desc
  offset (p_page - 1) * p_page_size
  limit p_page_size;
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
    and recipient_user_id = v_user_id;
end;
$$;

revoke all on function private.reject_platform_message_immutable_mutation() from public, anon, authenticated;
revoke all on function private.protect_platform_message_delivery() from public, anon, authenticated;
revoke all on function private.require_active_platform_user() from public, anon, authenticated;
revoke all on function private.resolve_platform_message_recipients(public.platform_message_audience_type,uuid,uuid,public.platform_message_type) from public, anon, authenticated;
revoke all on function private.platform_message_recipient_fingerprint(public.platform_message_audience_type,uuid,uuid,public.platform_message_type) from public, anon, authenticated;

revoke all on function public.search_platform_message_users(text,integer) from public, anon, authenticated;
revoke all on function public.search_platform_message_groups(text,integer) from public, anon, authenticated;
revoke all on function public.preview_platform_message_audience(public.platform_message_audience_type,uuid,uuid,public.platform_message_type) from public, anon, authenticated;
revoke all on function public.send_platform_message(uuid,text,text,boolean,timestamptz,text,text) from public, anon, authenticated;
revoke all on function public.edit_platform_message(uuid,text,text,timestamptz,text) from public, anon, authenticated;
revoke all on function public.withdraw_platform_message(uuid,text) from public, anon, authenticated;
revoke all on function public.list_platform_messages(integer,integer) from public, anon, authenticated;
revoke all on function public.list_my_platform_messages(integer,integer,boolean) from public, anon, authenticated;
revoke all on function public.mark_platform_message_read(uuid) from public, anon, authenticated;
revoke all on function public.acknowledge_platform_message(uuid) from public, anon, authenticated;

grant usage on type public.platform_message_type to authenticated;
grant usage on type public.platform_message_audience_type to authenticated;
grant usage on type public.platform_message_status to authenticated;
grant execute on function public.search_platform_message_users(text,integer) to authenticated;
grant execute on function public.search_platform_message_groups(text,integer) to authenticated;
grant execute on function public.preview_platform_message_audience(public.platform_message_audience_type,uuid,uuid,public.platform_message_type) to authenticated;
grant execute on function public.send_platform_message(uuid,text,text,boolean,timestamptz,text,text) to authenticated;
grant execute on function public.edit_platform_message(uuid,text,text,timestamptz,text) to authenticated;
grant execute on function public.withdraw_platform_message(uuid,text) to authenticated;
grant execute on function public.list_platform_messages(integer,integer) to authenticated;
grant execute on function public.list_my_platform_messages(integer,integer,boolean) to authenticated;
grant execute on function public.mark_platform_message_read(uuid) to authenticated;
grant execute on function public.acknowledge_platform_message(uuid) to authenticated;

comment on table private.platform_messages is
  'Private durable administrator message metadata. Audience and identity snapshots survive later membership/account changes.';
comment on table private.platform_message_deliveries is
  'Private immutable recipient set with revision-aware delivered/read/acknowledged progress.';
comment on function public.preview_platform_message_audience(public.platform_message_audience_type,uuid,uuid,public.platform_message_type) is
  'Active-admin-only short-lived audience count/fingerprint used for deliberate send confirmation.';
comment on function public.send_platform_message(uuid,text,text,boolean,timestamptz,text,text) is
  'Active-admin-only, idempotent, set-based server fan-out. Never resolve recipients in the browser.';
comment on function public.list_my_platform_messages(integer,integer,boolean) is
  'Active account inbox. Withdrawn messages are hidden; expired NOTICE messages are optional archive rows; unread ALL notices drive a dismiss-once what-is-new modal.';

-- Extend the purpose-bounded moderation timeline now that a durable
-- communication source exists. The enum value itself was committed by the
-- immediately preceding migration.
do $$
declare
  v_constraint_name text;
begin
  select c.conname
  into v_constraint_name
  from pg_constraint c
  where c.conrelid = 'private.moderation_access_log'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%cardinality(activity_types)%'
  limit 1;

  if v_constraint_name is not null then
    execute format(
      'alter table private.moderation_access_log drop constraint %I',
      v_constraint_name
    );
  end if;
end;
$$;

alter table private.moderation_access_log
add constraint moderation_access_log_access_shape_check check (
  (
    access_kind = 'CASE_DETAIL'
    and case_id is not null
    and activity_types is null
    and expires_at is null
  )
  or (
    access_kind = 'ACTIVITY_TIMELINE'
    and activity_types is not null
    and cardinality(activity_types) between 1 and 6
    and expires_at is not null
    and expires_at > granted_at
    and expires_at <= granted_at + interval '15 minutes'
  )
);

create or replace function public.begin_moderation_activity_review(
  p_target_user_id uuid,
  p_access_reason text,
  p_case_id uuid default null,
  p_activity_types public.moderation_activity_type[] default array[
    'ACCOUNT'::public.moderation_activity_type,
    'WORKOUT'::public.moderation_activity_type,
    'GROUP_MEMBERSHIP'::public.moderation_activity_type,
    'GROUP_ACTIVITY'::public.moderation_activity_type,
    'REPORT'::public.moderation_activity_type,
    'COMMUNICATION'::public.moderation_activity_type
  ]
)
returns table (
  access_id uuid,
  target_user_id uuid,
  target_username text,
  target_display_name text,
  account_status public.platform_account_status,
  case_id uuid,
  activity_types public.moderation_activity_type[],
  granted_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_reason text := trim(coalesce(p_access_reason, ''));
  v_types public.moderation_activity_type[];
  v_access_id uuid;
  v_access private.moderation_access_log%rowtype;
begin
  v_actor := private.require_active_platform_admin();

  if p_target_user_id is null then
    raise exception 'Moderation review subject is required' using errcode = '22023';
  end if;
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Activity access reason must be between 3 and 500 characters' using errcode = '22023';
  end if;
  if p_activity_types is null
     or cardinality(p_activity_types) not between 1 and 6
     or array_position(p_activity_types, null) is not null then
    raise exception 'Choose between 1 and 6 supported activity types' using errcode = '22023';
  end if;

  select array_agg(distinct activity_type order by activity_type)
  into v_types
  from unnest(p_activity_types) activity_type;

  if not exists (
    select 1 from private.resolve_moderation_subject(p_target_user_id)
  ) then
    raise exception 'Moderation review subject not found' using errcode = '22023';
  end if;

  if p_case_id is not null and not exists (
    select 1
    from private.moderation_cases mc
    join private.user_reports ur on ur.id = mc.report_id
    where mc.id = p_case_id
      and ur.target_user_id = p_target_user_id
  ) then
    raise exception 'Moderation case does not concern this subject' using errcode = '42501';
  end if;

  v_access_id := private.append_moderation_access(
    v_actor,
    p_target_user_id,
    p_case_id,
    'ACTIVITY_TIMELINE',
    v_reason,
    v_types,
    now() + interval '15 minutes'
  );

  select * into v_access
  from private.moderation_access_log mal
  where mal.id = v_access_id;

  return query
  select
    v_access.id,
    v_access.target_user_id,
    v_access.target_username_snapshot,
    v_access.target_display_name_snapshot,
    subject.account_status,
    v_access.case_id,
    v_access.activity_types,
    v_access.granted_at,
    v_access.expires_at
  from private.resolve_moderation_subject(v_access.target_user_id) subject;
end;
$$;

alter function public.list_moderation_activity_review(uuid,timestamptz,text,integer)
rename to list_moderation_activity_review_base;
alter function public.list_moderation_activity_review_base(uuid,timestamptz,text,integer)
set schema private;
revoke all on function private.list_moderation_activity_review_base(uuid,timestamptz,text,integer)
from public, anon, authenticated;

create or replace function public.list_moderation_activity_review(
  p_access_id uuid,
  p_before_occurred_at timestamptz default null,
  p_before_activity_key text default null,
  p_page_size integer default 25
)
returns table (
  activity_type public.moderation_activity_type,
  activity_key text,
  title text,
  detail text,
  occurred_at timestamptz,
  source_case_id uuid,
  metadata jsonb,
  has_more boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_access private.moderation_access_log%rowtype;
begin
  v_actor := private.require_active_platform_admin();
  if p_page_size < 1 or p_page_size > 50 then
    raise exception 'Activity page size must be between 1 and 50' using errcode = '22023';
  end if;
  if (p_before_occurred_at is null) <> (p_before_activity_key is null) then
    raise exception 'Activity cursor timestamp and key must be provided together' using errcode = '22023';
  end if;

  select * into v_access
  from private.moderation_access_log mal
  where mal.id = p_access_id;

  if not found
     or v_access.access_kind <> 'ACTIVITY_TIMELINE'
     or v_access.actor_user_id <> v_actor
     or v_access.expires_at <= now() then
    raise exception 'Active moderation activity access is required' using errcode = '42501';
  end if;

  return query
  with candidates as (
    select
      base.activity_type,
      base.activity_key,
      base.title,
      base.detail,
      base.occurred_at,
      base.source_case_id,
      base.metadata,
      base.has_more as source_has_more
    from private.list_moderation_activity_review_base(
      p_access_id,
      p_before_occurred_at,
      p_before_activity_key,
      50
    ) base

    union all

    select
      'COMMUNICATION'::public.moderation_activity_type,
      'COMMUNICATION:' || pm.id::text,
      pmr.subject,
      format(
        '%s · %s · %s',
        initcap(replace(pm.message_type::text, '_', ' ')),
        initcap(lower(pm.status::text)),
        case
          when pm.created_by = v_access.target_user_id then 'Sent by administrator'
          else 'Delivered to account'
        end
      ),
      pm.sent_at,
      null::uuid,
      jsonb_strip_nulls(jsonb_build_object(
        'messageId', pm.id,
        'relationship', case
          when pm.created_by = v_access.target_user_id then 'SENDER'
          else 'RECIPIENT'
        end,
        'messageType', pm.message_type,
        'audienceType', pm.audience_type,
        'audienceLabel', pm.audience_label_snapshot,
        'status', pm.status,
        'revision', pm.current_revision,
        'body', pmr.body,
        'acknowledgementRequired', pm.acknowledgement_required,
        'deliveryState', case
          when pmd.acknowledged_revision = pm.current_revision then 'ACKNOWLEDGED'
          when pmd.read_revision = pm.current_revision then 'READ'
          when pmd.recipient_user_id is not null then 'DELIVERED'
          else null
        end,
        'expiresAt', pmr.expires_at,
        'editedAt', pm.edited_at,
        'withdrawnAt', pm.withdrawn_at
      )),
      false
    from private.platform_messages pm
    join private.platform_message_revisions pmr
      on pmr.message_id = pm.id
     and pmr.revision = pm.current_revision
    left join private.platform_message_deliveries pmd
      on pmd.message_id = pm.id
     and pmd.recipient_user_id = v_access.target_user_id
    where 'COMMUNICATION'::public.moderation_activity_type = any(v_access.activity_types)
      and (
        pm.created_by = v_access.target_user_id
        or pmd.recipient_user_id = v_access.target_user_id
      )
      and (
        p_before_occurred_at is null
        or (
          pm.sent_at,
          'COMMUNICATION:' || pm.id::text
        ) < (p_before_occurred_at, p_before_activity_key)
      )
  ), ranked as (
    select
      c.*,
      (
        count(*) over() > p_page_size
        or coalesce(bool_or(c.source_has_more) over(), false)
      ) as combined_has_more
    from candidates c
  ), bounded as (
    select *
    from ranked
    order by occurred_at desc, activity_key desc
    limit p_page_size
  )
  select
    b.activity_type,
    b.activity_key,
    b.title,
    b.detail,
    b.occurred_at,
    b.source_case_id,
    b.metadata,
    b.combined_has_more
  from bounded b
  order by b.occurred_at desc, b.activity_key desc;
end;
$$;

revoke all on function public.begin_moderation_activity_review(uuid,text,uuid,public.moderation_activity_type[])
from public, anon, authenticated;
revoke all on function public.list_moderation_activity_review(uuid,timestamptz,text,integer)
from public, anon, authenticated;
grant execute on function public.begin_moderation_activity_review(uuid,text,uuid,public.moderation_activity_type[])
to authenticated;
grant execute on function public.list_moderation_activity_review(uuid,timestamptz,text,integer)
to authenticated;

comment on function public.list_moderation_activity_review(uuid,timestamptz,text,integer) is
  'Purpose-bound moderation timeline including retained administrator communication activity without exposing recipient lists.';
