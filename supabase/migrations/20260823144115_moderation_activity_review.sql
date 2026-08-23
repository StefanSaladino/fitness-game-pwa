-- Fitness Game PWA — Phase 15.3F privacy-bounded moderation activity review
-- Sensitive review access is explicit, short-lived, purpose-limited, and audited.
-- The returned timeline is read-only and deliberately excludes workout notes/sets,
-- Auth identities/providers, sessions, tokens, IP/device data, and unrelated users.

create type public.moderation_activity_type as enum (
  'ACCOUNT',
  'WORKOUT',
  'GROUP_MEMBERSHIP',
  'GROUP_ACTIVITY',
  'REPORT'
);

create table private.moderation_access_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_username_snapshot text not null,
  actor_display_name_snapshot text not null,
  target_user_id uuid not null,
  target_username_snapshot text not null,
  target_display_name_snapshot text not null,
  case_id uuid,
  access_kind text not null check (access_kind in ('CASE_DETAIL', 'ACTIVITY_TIMELINE')),
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  activity_types public.moderation_activity_type[],
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  retention_until timestamptz not null default (now() + interval '2 years'),
  check (char_length(actor_username_snapshot) between 3 and 32),
  check (char_length(actor_display_name_snapshot) between 1 and 80),
  check (char_length(target_username_snapshot) between 3 and 32),
  check (char_length(target_display_name_snapshot) between 1 and 80),
  check (
    (
      access_kind = 'CASE_DETAIL'
      and case_id is not null
      and activity_types is null
      and expires_at is null
    )
    or (
      access_kind = 'ACTIVITY_TIMELINE'
      and activity_types is not null
      and cardinality(activity_types) between 1 and 5
      and expires_at is not null
      and expires_at > granted_at
      and expires_at <= granted_at + interval '15 minutes'
    )
  ),
  check (retention_until >= granted_at + interval '2 years')
);

create index moderation_access_actor_granted_idx
  on private.moderation_access_log(actor_user_id, granted_at desc);
create index moderation_access_target_granted_idx
  on private.moderation_access_log(target_user_id, granted_at desc);
create index moderation_access_case_granted_idx
  on private.moderation_access_log(case_id, granted_at desc)
  where case_id is not null;

create index if not exists platform_admin_audit_target_review_idx
  on private.platform_admin_audit_log(target_user_id, occurred_at desc, id);
create index if not exists group_members_user_review_idx
  on public.group_members(user_id, joined_at desc, group_id);
create index if not exists group_activity_reactions_user_review_idx
  on public.group_activity_reactions(user_id, created_at desc, group_id, activity_key);

alter table private.moderation_access_log enable row level security;
revoke all on table private.moderation_access_log from public, anon, authenticated;

create trigger moderation_access_log_immutable
before update or delete on private.moderation_access_log
for each row execute function private.reject_moderation_immutable_mutation();

create or replace function private.resolve_moderation_subject(
  p_target_user_id uuid
)
returns table (
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
  return query
  select p.username, p.display_name, pas.status
  from public.profiles p
  left join private.platform_account_state pas on pas.user_id = p.id
  where p.id = p_target_user_id;

  if found then
    return;
  end if;

  -- Moderation identity snapshots intentionally outlive profile deletion. This
  -- fallback supports retained case review after profile-linked product rows
  -- have been removed by the account-deletion cascade.
  return query
  select snapshots.username, snapshots.display_name, null::public.platform_account_status
  from (
    select
      ur.target_username_snapshot as username,
      ur.target_display_name_snapshot as display_name,
      ur.created_at
    from private.user_reports ur
    where ur.target_user_id = p_target_user_id

    union all

    select
      ur.reporter_username_snapshot,
      ur.reporter_display_name_snapshot,
      ur.created_at
    from private.user_reports ur
    where ur.reporter_user_id = p_target_user_id
  ) snapshots
  order by snapshots.created_at desc
  limit 1;
end;
$$;

create or replace function private.append_moderation_access(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_case_id uuid,
  p_access_kind text,
  p_reason text,
  p_activity_types public.moderation_activity_type[] default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_access_id uuid;
  v_actor_username text;
  v_actor_display_name text;
  v_target_username text;
  v_target_display_name text;
begin
  select p.username, p.display_name
  into v_actor_username, v_actor_display_name
  from public.profiles p
  where p.id = p_actor_user_id;

  if not found then
    raise exception 'Moderation access actor not found' using errcode = '22023';
  end if;

  select subject.username, subject.display_name
  into v_target_username, v_target_display_name
  from private.resolve_moderation_subject(p_target_user_id) subject;

  if not found then
    raise exception 'Moderation review subject not found' using errcode = '22023';
  end if;

  insert into private.moderation_access_log (
    actor_user_id,
    actor_username_snapshot,
    actor_display_name_snapshot,
    target_user_id,
    target_username_snapshot,
    target_display_name_snapshot,
    case_id,
    access_kind,
    reason,
    activity_types,
    expires_at
  ) values (
    p_actor_user_id,
    v_actor_username,
    v_actor_display_name,
    p_target_user_id,
    v_target_username,
    v_target_display_name,
    p_case_id,
    p_access_kind,
    trim(p_reason),
    p_activity_types,
    p_expires_at
  )
  returning id into v_access_id;

  return v_access_id;
end;
$$;

create or replace function public.begin_moderation_activity_review(
  p_target_user_id uuid,
  p_access_reason text,
  p_case_id uuid default null,
  p_activity_types public.moderation_activity_type[] default array[
    'ACCOUNT'::public.moderation_activity_type,
    'WORKOUT'::public.moderation_activity_type,
    'GROUP_MEMBERSHIP'::public.moderation_activity_type,
    'GROUP_ACTIVITY'::public.moderation_activity_type,
    'REPORT'::public.moderation_activity_type
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
     or cardinality(p_activity_types) not between 1 and 5
     or array_position(p_activity_types, null) is not null then
    raise exception 'Choose between 1 and 5 supported activity types' using errcode = '22023';
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

  select *
  into v_access
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

  select *
  into v_access
  from private.moderation_access_log mal
  where mal.id = p_access_id;

  if not found
     or v_access.access_kind <> 'ACTIVITY_TIMELINE'
     or v_access.actor_user_id <> v_actor
     or v_access.expires_at <= now() then
    raise exception 'Active moderation activity access is required' using errcode = '42501';
  end if;

  return query
  with activity as (
    select
      'ACCOUNT'::public.moderation_activity_type as activity_type,
      'ACCOUNT:' || paal.id::text as activity_key,
      case paal.action
        when 'ACCOUNT_SUSPENDED' then 'Account suspended'
        when 'ACCOUNT_RESTORED' then 'Account restored'
        when 'ACCOUNT_DELETION_REQUESTED' then 'Account deletion requested'
        when 'ACCOUNT_DELETION_CANCELLED' then 'Account deletion cancelled'
        when 'ACCOUNT_DELETION_CONFIRMED' then 'Account deletion confirmed'
        when 'ACCOUNT_DELETED' then 'Account deleted'
        when 'PLATFORM_ADMIN_GRANTED' then 'Platform administrator access granted'
        when 'PLATFORM_ADMIN_REVOKED' then 'Platform administrator access revoked'
        when 'PLATFORM_ADMIN_BOOTSTRAPPED' then 'Platform administrator access bootstrapped'
        else 'Account lifecycle event'
      end as title,
      'Audited account lifecycle action'::text as detail,
      paal.occurred_at,
      null::uuid as source_case_id,
      jsonb_strip_nulls(jsonb_build_object(
        'action', paal.action,
        'reason', paal.reason,
        'beforeStatus', paal.before_state ->> 'account_status',
        'afterStatus', paal.after_state ->> 'account_status'
      )) as metadata
    from private.platform_admin_audit_log paal
    where paal.target_user_id = v_access.target_user_id
      and 'ACCOUNT'::public.moderation_activity_type = any(v_access.activity_types)

    union all

    select
      'WORKOUT'::public.moderation_activity_type,
      'WORKOUT:' || w.id::text,
      format('%s workout', initcap(replace(w.category::text, '_', ' '))),
      format('%s · %s', initcap(lower(w.status::text)), initcap(lower(w.source::text))),
      coalesce(w.ended_at, w.started_at),
      null::uuid,
      jsonb_strip_nulls(jsonb_build_object(
        'workoutId', w.id,
        'category', w.category,
        'subtype', nullif(trim(coalesce(w.subtype, '')), ''),
        'status', w.status,
        'source', w.source,
        'startedAt', w.started_at,
        'endedAt', w.ended_at,
        'durationSeconds', w.active_duration_seconds,
        'scoringDate', w.scoring_date,
        'qualifies', case
          when w.category = 'STRENGTH'::public.workout_category then w.qualifies_lifting
          else w.qualifies_cardio_bonus
        end,
        'needsReview', w.needs_review
      ))
    from public.workout_sessions w
    where w.user_id = v_access.target_user_id
      and 'WORKOUT'::public.moderation_activity_type = any(v_access.activity_types)

    union all

    select
      'GROUP_MEMBERSHIP'::public.moderation_activity_type,
      'GROUP_JOINED:' || gm.group_id::text,
      'Joined group',
      g.name,
      gm.joined_at,
      null::uuid,
      jsonb_build_object(
        'groupId', gm.group_id,
        'groupName', g.name,
        'role', gm.role,
        'currentStatus', gm.status
      )
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where gm.user_id = v_access.target_user_id
      and 'GROUP_MEMBERSHIP'::public.moderation_activity_type = any(v_access.activity_types)

    union all

    select
      'GROUP_MEMBERSHIP'::public.moderation_activity_type,
      'GROUP_REMOVED:' || gm.group_id::text,
      'Removed from group',
      g.name,
      gm.removed_at,
      null::uuid,
      jsonb_build_object(
        'groupId', gm.group_id,
        'groupName', g.name,
        'role', gm.role,
        'currentStatus', gm.status
      )
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where gm.user_id = v_access.target_user_id
      and gm.removed_at is not null
      and 'GROUP_MEMBERSHIP'::public.moderation_activity_type = any(v_access.activity_types)

    union all

    select
      'GROUP_ACTIVITY'::public.moderation_activity_type,
      'GROUP_REACTION:' || gar.group_id::text || ':' || gar.activity_key,
      'Reacted to group activity',
      g.name,
      gar.created_at,
      null::uuid,
      jsonb_build_object(
        'groupId', gar.group_id,
        'groupName', g.name,
        'activityKey', gar.activity_key,
        'reactionType', gar.reaction_type
      )
    from public.group_activity_reactions gar
    join public.groups g on g.id = gar.group_id
    where gar.user_id = v_access.target_user_id
      and 'GROUP_ACTIVITY'::public.moderation_activity_type = any(v_access.activity_types)

    union all

    select
      'REPORT'::public.moderation_activity_type,
      'REPORT:' || mc.id::text,
      case
        when ur.target_user_id = v_access.target_user_id then 'Report received'
        else 'Report submitted'
      end,
      format('%s · %s', initcap(replace(ur.category::text, '_', ' ')), initcap(replace(mc.status::text, '_', ' '))),
      ur.created_at,
      mc.id,
      jsonb_strip_nulls(jsonb_build_object(
        'caseId', mc.id,
        'relationship', case
          when ur.target_user_id = v_access.target_user_id then 'TARGET'
          else 'REPORTER'
        end,
        'category', ur.category,
        'status', mc.status,
        'referenceType', ur.reference_type,
        'referenceLabel', ur.reference_label_snapshot
      ))
    from private.user_reports ur
    join private.moderation_cases mc on mc.report_id = ur.id
    where (
        ur.target_user_id = v_access.target_user_id
        or ur.reporter_user_id = v_access.target_user_id
      )
      and 'REPORT'::public.moderation_activity_type = any(v_access.activity_types)
  ), filtered as (
    select
      a.activity_type,
      a.activity_key,
      a.title,
      a.detail,
      a.occurred_at,
      a.source_case_id,
      a.metadata
    from activity a
    where a.occurred_at is not null
      and (
        p_before_occurred_at is null
        or (a.occurred_at, a.activity_key) < (p_before_occurred_at, p_before_activity_key)
      )
  ), bounded as (
    select
      f.*,
      count(*) over() > p_page_size as has_more
    from filtered f
    order by f.occurred_at desc, f.activity_key desc
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
    b.has_more
  from bounded b
  order by b.occurred_at desc, b.activity_key desc;
end;
$$;

-- Case detail exposes reporter identity and full reason. Record the access once
-- when the detail boundary opens; the subordinate note/event reads remain tied
-- to that case-detail load and do not create duplicate audit noise.
create or replace function public.get_moderation_case_detail(p_case_id uuid)
returns table (
  case_id uuid,
  report_id uuid,
  status public.moderation_case_status,
  category public.user_report_category,
  reason text,
  reporter_user_id uuid,
  reporter_username text,
  reporter_display_name text,
  target_user_id uuid,
  target_username text,
  target_display_name text,
  reference_type public.user_report_reference_type,
  reference_group_id uuid,
  reference_id text,
  reference_label text,
  assigned_to uuid,
  assigned_at timestamptz,
  resolution_reason text,
  created_at timestamptz,
  updated_at timestamptz,
  closed_at timestamptz,
  retention_until timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_target_user_id uuid;
begin
  v_actor := private.require_active_platform_admin();

  select ur.target_user_id
  into v_target_user_id
  from private.moderation_cases mc
  join private.user_reports ur on ur.id = mc.report_id
  where mc.id = p_case_id;

  if not found then
    raise exception 'Moderation case not found' using errcode = '22023';
  end if;

  perform private.append_moderation_access(
    v_actor,
    v_target_user_id,
    p_case_id,
    'CASE_DETAIL',
    'Opened moderation case detail'
  );

  return query
  select
    mc.id,
    ur.id,
    mc.status,
    ur.category,
    ur.reason,
    ur.reporter_user_id,
    ur.reporter_username_snapshot,
    ur.reporter_display_name_snapshot,
    ur.target_user_id,
    ur.target_username_snapshot,
    ur.target_display_name_snapshot,
    ur.reference_type,
    ur.reference_group_id,
    ur.reference_id,
    ur.reference_label_snapshot,
    mc.assigned_to,
    mc.assigned_at,
    mc.resolution_reason,
    mc.created_at,
    mc.updated_at,
    mc.closed_at,
    mc.retention_until
  from private.moderation_cases mc
  join private.user_reports ur on ur.id = mc.report_id
  where mc.id = p_case_id;
end;
$$;

revoke all on type public.moderation_activity_type from public, anon, authenticated;
grant usage on type public.moderation_activity_type to authenticated;

revoke all on function private.resolve_moderation_subject(uuid) from public, anon, authenticated;
revoke all on function private.append_moderation_access(uuid, uuid, uuid, text, text, public.moderation_activity_type[], timestamptz) from public, anon, authenticated;

revoke all on function public.begin_moderation_activity_review(uuid, text, uuid, public.moderation_activity_type[]) from public, anon, authenticated;
grant execute on function public.begin_moderation_activity_review(uuid, text, uuid, public.moderation_activity_type[]) to authenticated;
revoke all on function public.list_moderation_activity_review(uuid, timestamptz, text, integer) from public, anon, authenticated;
grant execute on function public.list_moderation_activity_review(uuid, timestamptz, text, integer) to authenticated;

-- Re-assert the guarded case-detail grant after replacing the function.
revoke all on function public.get_moderation_case_detail(uuid) from public, anon, authenticated;
grant execute on function public.get_moderation_case_detail(uuid) to authenticated;

comment on table private.moderation_access_log is
  'Append-only sensitive moderation-access audit. Activity grants expire after 15 minutes; audit records and identity snapshots are retained for at least two years.';
comment on function public.begin_moderation_activity_review(uuid, text, uuid, public.moderation_activity_type[]) is
  'Creates an audited 15-minute review grant for one subject, one declared purpose, and an explicit set of minimum-data activity sources.';
comment on function public.list_moderation_activity_review(uuid, timestamptz, text, integer) is
  'Returns a cursor-paginated, read-only moderation timeline. Excludes workout notes/sets, Auth/session/token data, IP/device telemetry, and communication history until a real messaging source exists.';

notify pgrst, 'reload schema';
