-- Fitness Game PWA — member-only group chat
-- Persistent content is read and mutated only through membership-guarded RPCs.
-- Realtime carries a private invalidation signal, never message content.

create table public.group_chat_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by_user_id uuid,
  deletion_reason text,
  constraint group_chat_messages_group_id_id_unique unique (group_id, id),
  constraint group_chat_messages_body_check check (char_length(trim(body)) between 1 and 1000),
  constraint group_chat_messages_deletion_check check (
    (deleted_at is null and deleted_by_user_id is null and deletion_reason is null)
    or
    (deleted_at is not null and deleted_by_user_id is not null and deletion_reason in ('SELF', 'MODERATION'))
  )
);

create table public.group_chat_reactions (
  group_id uuid not null,
  message_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (message_id, user_id),
  constraint group_chat_reactions_message_fkey
    foreign key (group_id, message_id)
    references public.group_chat_messages(group_id, id)
    on delete cascade,
  constraint group_chat_reactions_type_check
    check (reaction_type in ('FIRE', 'STRONG', 'CLAP', 'HEART', 'LAUGH'))
);

create index group_chat_messages_group_created_idx
  on public.group_chat_messages(group_id, created_at desc, id desc);
create index group_chat_messages_author_created_idx
  on public.group_chat_messages(author_user_id, created_at desc);
create index group_chat_reactions_message_type_idx
  on public.group_chat_reactions(message_id, reaction_type);
create index group_chat_reactions_group_user_idx
  on public.group_chat_reactions(group_id, user_id);

alter table public.group_chat_messages enable row level security;
alter table public.group_chat_reactions enable row level security;

-- Browser clients do not read or mutate these tables directly. This remains
-- explicit even on projects that automatically expose new public tables.
revoke all on table public.group_chat_messages from public, anon, authenticated;
revoke all on table public.group_chat_reactions from public, anon, authenticated;

create trigger group_chat_reactions_touch_updated_at
before update on public.group_chat_reactions
for each row execute function public.touch_updated_at();

create or replace function public.group_chat_topic_group_id(p_topic text)
returns uuid
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if p_topic is null or p_topic !~ '^group-chat:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return substring(p_topic from 12)::uuid;
end;
$$;

revoke all on function public.group_chat_topic_group_id(text) from public, anon, authenticated;
grant execute on function public.group_chat_topic_group_id(text) to authenticated;

drop policy if exists "group chat members can receive change signals" on realtime.messages;
create policy "group chat members can receive change signals"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and public.is_active_group_member(
    public.group_chat_topic_group_id((select realtime.topic()))
  )
);

create or replace function private.broadcast_group_chat_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  v_group_id := case when tg_op = 'DELETE' then old.group_id else new.group_id end;

  perform realtime.send(
    jsonb_build_object(
      'groupId', v_group_id,
      'entity', tg_table_name,
      'changedAt', now()
    ),
    'group_chat_changed',
    'group-chat:' || v_group_id::text,
    true
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.broadcast_group_chat_change() from public, anon, authenticated;

create trigger group_chat_messages_broadcast_change
after insert or update or delete on public.group_chat_messages
for each row execute function private.broadcast_group_chat_change();

create trigger group_chat_reactions_broadcast_change
after insert or update or delete on public.group_chat_reactions
for each row execute function private.broadcast_group_chat_change();

create or replace function public.list_group_chat_messages(
  p_group_id uuid,
  p_limit integer default 30,
  p_before_created_at timestamptz default null,
  p_before_message_id uuid default null
)
returns table (
  message_id uuid,
  author_user_id uuid,
  username text,
  display_name text,
  profile_picture_path text,
  body text,
  created_at timestamptz,
  deleted_at timestamptz,
  can_delete boolean,
  fire_count bigint,
  strong_count bigint,
  clap_count bigint,
  heart_count bigint,
  laugh_count bigint,
  my_reaction text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role public.group_role;
begin
  v_user_id := private.require_active_platform_user();
  if p_group_id is null then
    raise exception 'Group id is required' using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 50 then
    raise exception 'Chat page size must be between 1 and 50' using errcode = '22023';
  end if;
  if (p_before_created_at is null) <> (p_before_message_id is null) then
    raise exception 'Chat cursor requires both timestamp and message id' using errcode = '22023';
  end if;

  select gm.role
  into v_role
  from public.group_members gm
  where gm.group_id = p_group_id
    and gm.user_id = v_user_id
    and gm.status = 'ACTIVE'::public.group_member_status;

  if not found then
    raise exception 'Active group membership required' using errcode = '42501';
  end if;

  return query
  with page as (
    select m.*
    from public.group_chat_messages m
    where m.group_id = p_group_id
      and (
        p_before_created_at is null
        or (m.created_at, m.id) < (p_before_created_at, p_before_message_id)
      )
    order by m.created_at desc, m.id desc
    limit p_limit
  )
  select
    m.id,
    m.author_user_id,
    p.username,
    p.display_name,
    p.profile_picture_path,
    case when m.deleted_at is null then m.body else null end,
    m.created_at,
    m.deleted_at,
    m.deleted_at is null and (
      m.author_user_id = v_user_id
      or v_role in ('OWNER'::public.group_role, 'ADMIN'::public.group_role)
    ),
    count(r.user_id) filter (where r.reaction_type = 'FIRE')::bigint,
    count(r.user_id) filter (where r.reaction_type = 'STRONG')::bigint,
    count(r.user_id) filter (where r.reaction_type = 'CLAP')::bigint,
    count(r.user_id) filter (where r.reaction_type = 'HEART')::bigint,
    count(r.user_id) filter (where r.reaction_type = 'LAUGH')::bigint,
    max(r.reaction_type) filter (where r.user_id = v_user_id)
  from page m
  join public.profiles p on p.id = m.author_user_id
  left join public.group_chat_reactions r
    on r.message_id = m.id
   and r.group_id = m.group_id
   and m.deleted_at is null
   and exists (
     select 1
     from public.group_members reacting_member
     where reacting_member.group_id = m.group_id
       and reacting_member.user_id = r.user_id
       and reacting_member.status = 'ACTIVE'::public.group_member_status
   )
  group by m.id, m.author_user_id, m.body, m.created_at, m.deleted_at,
           p.username, p.display_name, p.profile_picture_path
  order by m.created_at desc, m.id desc;
end;
$$;

create or replace function public.post_group_chat_message(p_group_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_body text := trim(coalesce(p_body, ''));
  v_message_id uuid;
begin
  v_user_id := private.require_active_platform_user();
  if p_group_id is null then
    raise exception 'Group id is required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = v_user_id
      and gm.status = 'ACTIVE'::public.group_member_status
  ) then
    raise exception 'Active group membership required' using errcode = '42501';
  end if;
  if char_length(v_body) not between 1 and 1000 then
    raise exception 'Group message must be between 1 and 1000 characters' using errcode = '22023';
  end if;
  if (
    select count(*)
    from public.group_chat_messages m
    where m.author_user_id = v_user_id
      and m.created_at > now() - interval '1 minute'
  ) >= 10 then
    raise exception 'Group chat rate limit reached; try again shortly' using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.group_chat_messages m
    where m.group_id = p_group_id
      and m.author_user_id = v_user_id
      and m.body = v_body
      and m.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'This group message was already posted' using errcode = '22023';
  end if;

  insert into public.group_chat_messages(group_id, author_user_id, body)
  values (p_group_id, v_user_id, v_body)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

create or replace function public.set_group_chat_reaction(
  p_group_id uuid,
  p_message_id uuid,
  p_reaction_type text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_reaction text := upper(nullif(trim(p_reaction_type), ''));
begin
  v_user_id := private.require_active_platform_user();
  if p_group_id is null or p_message_id is null then
    raise exception 'Group and message ids are required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = v_user_id
      and gm.status = 'ACTIVE'::public.group_member_status
  ) then
    raise exception 'Active group membership required' using errcode = '42501';
  end if;

  if v_reaction is null then
    delete from public.group_chat_reactions
    where group_id = p_group_id
      and message_id = p_message_id
      and user_id = v_user_id;
    return;
  end if;
  if v_reaction not in ('FIRE', 'STRONG', 'CLAP', 'HEART', 'LAUGH') then
    raise exception 'Unsupported group chat reaction' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.group_chat_messages m
    where m.group_id = p_group_id
      and m.id = p_message_id
      and m.deleted_at is null
  ) then
    raise exception 'Group message is not available' using errcode = '22023';
  end if;

  insert into public.group_chat_reactions(group_id, message_id, user_id, reaction_type)
  values (p_group_id, p_message_id, v_user_id, v_reaction)
  on conflict (message_id, user_id) do update
    set reaction_type = excluded.reaction_type,
        updated_at = now();
end;
$$;

create or replace function public.delete_group_chat_message(p_group_id uuid, p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role public.group_role;
  v_author_user_id uuid;
  v_deleted_at timestamptz;
  v_reason text;
begin
  v_user_id := private.require_active_platform_user();
  if p_group_id is null or p_message_id is null then
    raise exception 'Group and message ids are required' using errcode = '22023';
  end if;

  select gm.role
  into v_role
  from public.group_members gm
  where gm.group_id = p_group_id
    and gm.user_id = v_user_id
    and gm.status = 'ACTIVE'::public.group_member_status;
  if not found then
    raise exception 'Active group membership required' using errcode = '42501';
  end if;

  select m.author_user_id, m.deleted_at
  into v_author_user_id, v_deleted_at
  from public.group_chat_messages m
  where m.group_id = p_group_id
    and m.id = p_message_id
  for update;
  if not found then
    raise exception 'Group message is not available' using errcode = '22023';
  end if;
  if v_deleted_at is not null then
    return;
  end if;
  if v_author_user_id <> v_user_id
     and v_role not in ('OWNER'::public.group_role, 'ADMIN'::public.group_role) then
    raise exception 'Only the author or a group administrator can delete this message' using errcode = '42501';
  end if;

  v_reason := case when v_author_user_id = v_user_id then 'SELF' else 'MODERATION' end;
  update public.group_chat_messages
  set
    deleted_at = now(),
    deleted_by_user_id = v_user_id,
    deletion_reason = v_reason
  where group_id = p_group_id
    and id = p_message_id
    and deleted_at is null;
end;
$$;

revoke all on function public.list_group_chat_messages(uuid,integer,timestamptz,uuid) from public, anon, authenticated;
revoke all on function public.post_group_chat_message(uuid,text) from public, anon, authenticated;
revoke all on function public.set_group_chat_reaction(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.delete_group_chat_message(uuid,uuid) from public, anon, authenticated;

grant execute on function public.list_group_chat_messages(uuid,integer,timestamptz,uuid) to authenticated;
grant execute on function public.post_group_chat_message(uuid,text) to authenticated;
grant execute on function public.set_group_chat_reaction(uuid,uuid,text) to authenticated;
grant execute on function public.delete_group_chat_message(uuid,uuid) to authenticated;

comment on table public.group_chat_messages is
  'Persistent member-authored group conversation. Deleted messages retain a private moderation tombstone while list RPCs suppress the body.';
comment on table public.group_chat_reactions is
  'One bounded emoji reaction per active member and group chat message. Reactions never affect XP.';
comment on function public.list_group_chat_messages(uuid,integer,timestamptz,uuid) is
  'Membership-guarded cursor page with current member identity, bounded reaction aggregates, and deleted-message tombstones.';
comment on function public.post_group_chat_message(uuid,text) is
  'Posts sanitized plain text for the active caller group with duplicate and rolling rate limits.';

notify pgrst, 'reload schema';
