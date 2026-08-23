-- Fitness Game PWA — Phase 15.3E user reports + moderation-case foundation
-- Keeps reporter identity and case evidence private while exposing only guarded,
-- purpose-built RPCs to active accounts and active platform administrators.

create type public.user_report_category as enum (
  'HARASSMENT',
  'SPAM',
  'ABUSIVE_CONTENT',
  'IMPERSONATION',
  'CHEATING',
  'SAFETY',
  'OTHER'
);

create type public.user_report_reference_type as enum (
  'GROUP',
  'WORKOUT',
  'SOCIAL_ACTIVITY'
);

create type public.moderation_case_status as enum (
  'NEW',
  'IN_REVIEW',
  'RESOLVED',
  'DISMISSED'
);

create table private.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null,
  reporter_username_snapshot text not null,
  reporter_display_name_snapshot text not null,
  target_user_id uuid not null,
  target_username_snapshot text not null,
  target_display_name_snapshot text not null,
  category public.user_report_category not null,
  reason text not null check (char_length(reason) between 10 and 2000),
  reference_type public.user_report_reference_type,
  reference_group_id uuid,
  reference_id text,
  reference_label_snapshot text,
  incident_fingerprint text not null check (incident_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  check (reporter_user_id <> target_user_id),
  check (char_length(reporter_username_snapshot) between 3 and 32),
  check (char_length(reporter_display_name_snapshot) between 1 and 80),
  check (char_length(target_username_snapshot) between 3 and 32),
  check (char_length(target_display_name_snapshot) between 1 and 80),
  check (
    (
      reference_type is null
      and reference_group_id is null
      and reference_id is null
      and reference_label_snapshot is null
    )
    or (
      reference_type = 'GROUP'::public.user_report_reference_type
      and reference_group_id is not null
      and reference_id is null
      and char_length(reference_label_snapshot) between 1 and 160
    )
    or (
      reference_type in (
        'WORKOUT'::public.user_report_reference_type,
        'SOCIAL_ACTIVITY'::public.user_report_reference_type
      )
      and reference_group_id is not null
      and char_length(reference_id) between 8 and 240
      and char_length(reference_label_snapshot) between 1 and 160
    )
  )
);

create table private.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references private.user_reports(id) on delete restrict,
  status public.moderation_case_status not null default 'NEW',
  assigned_to uuid,
  assigned_at timestamptz,
  resolution_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  retention_until timestamptz,
  check (
    (assigned_to is null and assigned_at is null)
    or (assigned_to is not null and assigned_at is not null)
  ),
  check (
    (
      status in (
        'NEW'::public.moderation_case_status,
        'IN_REVIEW'::public.moderation_case_status
      )
      and resolution_reason is null
      and closed_at is null
      and retention_until is null
    )
    or (
      status in (
        'RESOLVED'::public.moderation_case_status,
        'DISMISSED'::public.moderation_case_status
      )
      and char_length(resolution_reason) between 3 and 500
      and closed_at is not null
      and retention_until >= closed_at + interval '2 years'
    )
  )
);

create table private.moderation_case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references private.moderation_cases(id) on delete restrict,
  author_user_id uuid not null,
  author_username_snapshot text not null,
  author_display_name_snapshot text not null,
  body text not null check (char_length(body) between 3 and 2000),
  created_at timestamptz not null default now()
);

create table private.moderation_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references private.moderation_cases(id) on delete restrict,
  actor_user_id uuid not null,
  actor_username_snapshot text not null,
  actor_display_name_snapshot text not null,
  action text not null check (action in (
    'REPORT_SUBMITTED',
    'CASE_ASSIGNED',
    'CASE_UNASSIGNED',
    'NOTE_ADDED',
    'STATUS_CHANGED'
  )),
  reason text check (reason is null or char_length(reason) between 3 and 500),
  before_state jsonb not null default '{}'::jsonb check (jsonb_typeof(before_state) = 'object'),
  after_state jsonb not null default '{}'::jsonb check (jsonb_typeof(after_state) = 'object'),
  created_at timestamptz not null default now()
);

create index user_reports_reporter_created_idx
  on private.user_reports(reporter_user_id, created_at desc);
create index user_reports_target_created_idx
  on private.user_reports(target_user_id, created_at desc);
create index user_reports_dedupe_idx
  on private.user_reports(reporter_user_id, target_user_id, incident_fingerprint, created_at desc);
create index moderation_cases_queue_idx
  on private.moderation_cases(status, updated_at desc, id);
create index moderation_cases_assignee_idx
  on private.moderation_cases(assigned_to, status, updated_at desc)
  where assigned_to is not null;
create index moderation_case_notes_case_idx
  on private.moderation_case_notes(case_id, created_at, id);
create index moderation_case_events_case_idx
  on private.moderation_case_events(case_id, created_at, id);

alter table private.user_reports enable row level security;
alter table private.moderation_cases enable row level security;
alter table private.moderation_case_notes enable row level security;
alter table private.moderation_case_events enable row level security;

revoke all on table private.user_reports from public, anon, authenticated;
revoke all on table private.moderation_cases from public, anon, authenticated;
revoke all on table private.moderation_case_notes from public, anon, authenticated;
revoke all on table private.moderation_case_events from public, anon, authenticated;

create or replace function private.reject_moderation_immutable_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Moderation evidence and history are immutable' using errcode = '42501';
end;
$$;

create trigger user_reports_immutable
before update or delete on private.user_reports
for each row execute function private.reject_moderation_immutable_mutation();

create trigger moderation_case_notes_immutable
before update or delete on private.moderation_case_notes
for each row execute function private.reject_moderation_immutable_mutation();

create trigger moderation_case_events_immutable
before update or delete on private.moderation_case_events
for each row execute function private.reject_moderation_immutable_mutation();

create or replace function private.users_share_active_group(
  p_group_id uuid,
  p_left_user_id uuid,
  p_right_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_group_id is not null
    and exists (
      select 1
      from public.group_members gm
      where gm.group_id = p_group_id
        and gm.user_id = p_left_user_id
        and gm.status = 'ACTIVE'::public.group_member_status
    )
    and exists (
      select 1
      from public.group_members gm
      where gm.group_id = p_group_id
        and gm.user_id = p_right_user_id
        and gm.status = 'ACTIVE'::public.group_member_status
    );
$$;

create or replace function private.group_social_activity_belongs_to_user(
  p_group_id uuid,
  p_activity_key text,
  p_target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with active_target as (
    select gm.user_id
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_target_user_id
      and gm.status = 'ACTIVE'::public.group_member_status
  ), pr_context as (
    select
      o.user_id,
      o.workout_id,
      o.exercise_id,
      o.metric_type,
      o.metric_value,
      max(o.metric_value) over (
        partition by o.user_id, o.exercise_id, o.metric_type
        order by o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as previous_best
    from public.exercise_progress_observations o
    join active_target at on at.user_id = o.user_id
    where o.valid
  )
  select exists (
    select 1
    from public.workout_sessions w
    join active_target at on at.user_id = w.user_id
    where w.source = 'IN_APP'::public.workout_source
      and w.category = 'STRENGTH'::public.workout_category
      and w.status = 'COMPLETED'::public.workout_status
      and w.qualifies_lifting
      and p_activity_key = public.group_social_activity_key('LIFT', w.id::text)

    union all

    select 1
    from pr_context p
    where p.previous_best is not null
      and p.metric_value > p.previous_best
      and p_activity_key = public.group_social_activity_key(
        'PR',
        p.user_id::text || ':' || p.exercise_id::text || ':' || p.metric_type || ':' || p.workout_id::text
      )

    union all

    select 1
    from public.user_badges ub
    join active_target at on at.user_id = ub.user_id
    where p_activity_key = public.group_social_activity_key(
      'BADGE',
      ub.user_id::text || ':' || ub.badge_key
    )

    union all

    select 1
    from public.weekly_lifting_snapshots wls
    join active_target at on at.user_id = wls.user_id
    where wls.achieved
      and p_activity_key = public.group_social_activity_key(
        'GOAL',
        wls.user_id::text || ':' || wls.week_start::text
      )
  );
$$;

create or replace function private.append_moderation_case_event(
  p_case_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_reason text default null,
  p_before_state jsonb default '{}'::jsonb,
  p_after_state jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_actor_username text;
  v_actor_display_name text;
begin
  select p.username, p.display_name
  into v_actor_username, v_actor_display_name
  from public.profiles p
  where p.id = p_actor_user_id;

  if not found then
    raise exception 'Moderation event actor not found' using errcode = '22023';
  end if;

  insert into private.moderation_case_events (
    case_id,
    actor_user_id,
    actor_username_snapshot,
    actor_display_name_snapshot,
    action,
    reason,
    before_state,
    after_state
  ) values (
    p_case_id,
    p_actor_user_id,
    v_actor_username,
    v_actor_display_name,
    p_action,
    p_reason,
    coalesce(p_before_state, '{}'::jsonb),
    coalesce(p_after_state, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.submit_user_report(
  p_target_user_id uuid,
  p_category public.user_report_category,
  p_reason text,
  p_reference_type public.user_report_reference_type default null,
  p_reference_group_id uuid default null,
  p_reference_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reporter uuid;
  v_reason text := trim(coalesce(p_reason, ''));
  v_reference_id text := nullif(trim(coalesce(p_reference_id, '')), '');
  v_reference_label text;
  v_reporter_username text;
  v_reporter_display_name text;
  v_target_username text;
  v_target_display_name text;
  v_incident_fingerprint text;
  v_workout_id uuid;
  v_report_id uuid;
  v_case_id uuid;
begin
  v_reporter := private.require_active_account();

  if p_target_user_id is null then
    raise exception 'Target user is required' using errcode = '22023';
  end if;
  if v_reporter = p_target_user_id then
    raise exception 'Users cannot report themselves' using errcode = '42501';
  end if;
  if p_category is null then
    raise exception 'Report category is required' using errcode = '22023';
  end if;
  if char_length(v_reason) not between 10 and 2000 then
    raise exception 'Report reason must be between 10 and 2000 characters' using errcode = '22023';
  end if;

  select p.username, p.display_name
  into v_reporter_username, v_reporter_display_name
  from public.profiles p
  where p.id = v_reporter;

  select p.username, p.display_name
  into v_target_username, v_target_display_name
  from public.profiles p
  join private.platform_account_state pas on pas.user_id = p.id
  where p.id = p_target_user_id;

  if not found then
    raise exception 'Target account not found' using errcode = '22023';
  end if;

  if p_reference_type is null then
    if p_reference_group_id is not null or v_reference_id is not null then
      raise exception 'Evidence reference type is required' using errcode = '22023';
    end if;
  else
    if not private.users_share_active_group(p_reference_group_id, v_reporter, p_target_user_id) then
      raise exception 'Evidence reference is not available' using errcode = '42501';
    end if;

    if p_reference_type = 'GROUP'::public.user_report_reference_type then
      if v_reference_id is not null then
        raise exception 'Group evidence must not include a separate reference id' using errcode = '22023';
      end if;

      select g.name
      into v_reference_label
      from public.groups g
      where g.id = p_reference_group_id;

    elsif p_reference_type = 'WORKOUT'::public.user_report_reference_type then
      if v_reference_id is null then
        raise exception 'Workout evidence id is required' using errcode = '22023';
      end if;

      begin
        v_workout_id := v_reference_id::uuid;
      exception when invalid_text_representation then
        raise exception 'Evidence reference is not available' using errcode = '42501';
      end;

      select format('%s workout on %s', initcap(replace(w.category::text, '_', ' ')), w.scoring_date)
      into v_reference_label
      from public.workout_sessions w
      where w.id = v_workout_id
        and w.user_id = p_target_user_id
        and w.status = 'COMPLETED'::public.workout_status;

    elsif p_reference_type = 'SOCIAL_ACTIVITY'::public.user_report_reference_type then
      if v_reference_id is null
         or char_length(v_reference_id) not between 8 and 240
         or not private.group_social_activity_belongs_to_user(
           p_reference_group_id,
           v_reference_id,
           p_target_user_id
         ) then
        raise exception 'Evidence reference is not available' using errcode = '42501';
      end if;

      v_reference_label := format(
        '%s group activity',
        initcap(lower(split_part(v_reference_id, ':', 1)))
      );
    end if;

    if v_reference_label is null then
      raise exception 'Evidence reference is not available' using errcode = '42501';
    end if;
  end if;

  v_incident_fingerprint := encode(
    extensions.digest(
      concat_ws(
        E'\n',
        p_target_user_id::text,
        p_category::text,
        coalesce(p_reference_type::text, ''),
        coalesce(p_reference_group_id::text, ''),
        coalesce(v_reference_id, ''),
        lower(regexp_replace(v_reason, '\s+', ' ', 'g'))
      ),
      'sha256'
    ),
    'hex'
  );

  -- Serialize submissions per reporter so the rolling rate and duplicate checks
  -- remain deterministic under concurrent requests.
  perform pg_advisory_xact_lock(hashtextextended('user-report:' || v_reporter::text, 0));

  if (
    select count(*)
    from private.user_reports ur
    where ur.reporter_user_id = v_reporter
      and ur.created_at >= now() - interval '24 hours'
  ) >= 10 then
    raise exception 'Report submission limit reached; try again later' using errcode = '54000';
  end if;

  if exists (
    select 1
    from private.user_reports ur
    where ur.reporter_user_id = v_reporter
      and ur.target_user_id = p_target_user_id
      and ur.incident_fingerprint = v_incident_fingerprint
      and ur.created_at >= now() - interval '24 hours'
  ) then
    raise exception 'This incident was already reported recently' using errcode = '23505';
  end if;

  insert into private.user_reports (
    reporter_user_id,
    reporter_username_snapshot,
    reporter_display_name_snapshot,
    target_user_id,
    target_username_snapshot,
    target_display_name_snapshot,
    category,
    reason,
    reference_type,
    reference_group_id,
    reference_id,
    reference_label_snapshot,
    incident_fingerprint
  ) values (
    v_reporter,
    v_reporter_username,
    v_reporter_display_name,
    p_target_user_id,
    v_target_username,
    v_target_display_name,
    p_category,
    v_reason,
    p_reference_type,
    p_reference_group_id,
    v_reference_id,
    v_reference_label,
    v_incident_fingerprint
  )
  returning id into v_report_id;

  insert into private.moderation_cases (report_id)
  values (v_report_id)
  returning id into v_case_id;

  perform private.append_moderation_case_event(
    v_case_id,
    v_reporter,
    'REPORT_SUBMITTED',
    null,
    '{}'::jsonb,
    jsonb_build_object('status', 'NEW', 'category', p_category)
  );

  return v_case_id;
end;
$$;

create or replace function public.list_moderation_cases(
  p_status public.moderation_case_status default null,
  p_assigned_to uuid default null,
  p_page integer default 1,
  p_page_size integer default 25
)
returns table (
  case_id uuid,
  report_id uuid,
  status public.moderation_case_status,
  category public.user_report_category,
  reason_excerpt text,
  reporter_user_id uuid,
  reporter_username text,
  reporter_display_name text,
  target_user_id uuid,
  target_username text,
  target_display_name text,
  reference_type public.user_report_reference_type,
  reference_label text,
  assigned_to uuid,
  created_at timestamptz,
  updated_at timestamptz,
  closed_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
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
    mc.id,
    ur.id,
    mc.status,
    ur.category,
    left(ur.reason, 240),
    ur.reporter_user_id,
    ur.reporter_username_snapshot,
    ur.reporter_display_name_snapshot,
    ur.target_user_id,
    ur.target_username_snapshot,
    ur.target_display_name_snapshot,
    ur.reference_type,
    ur.reference_label_snapshot,
    mc.assigned_to,
    mc.created_at,
    mc.updated_at,
    mc.closed_at,
    count(*) over()::bigint
  from private.moderation_cases mc
  join private.user_reports ur on ur.id = mc.report_id
  where (p_status is null or mc.status = p_status)
    and (p_assigned_to is null or mc.assigned_to = p_assigned_to)
  order by
    case mc.status
      when 'NEW'::public.moderation_case_status then 0
      when 'IN_REVIEW'::public.moderation_case_status then 1
      else 2
    end,
    mc.updated_at desc,
    mc.id
  limit p_page_size
  offset ((p_page - 1) * p_page_size);
end;
$$;

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
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_active_platform_admin();

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

  if not found then
    raise exception 'Moderation case not found' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.list_moderation_case_notes(p_case_id uuid)
returns table (
  note_id uuid,
  author_user_id uuid,
  author_username text,
  author_display_name text,
  body text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_active_platform_admin();

  if not exists (select 1 from private.moderation_cases mc where mc.id = p_case_id) then
    raise exception 'Moderation case not found' using errcode = '22023';
  end if;

  return query
  select
    mcn.id,
    mcn.author_user_id,
    mcn.author_username_snapshot,
    mcn.author_display_name_snapshot,
    mcn.body,
    mcn.created_at
  from private.moderation_case_notes mcn
  where mcn.case_id = p_case_id
  order by mcn.created_at, mcn.id;
end;
$$;

create or replace function public.list_moderation_case_events(p_case_id uuid)
returns table (
  event_id uuid,
  actor_user_id uuid,
  actor_username text,
  actor_display_name text,
  action text,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_active_platform_admin();

  if not exists (select 1 from private.moderation_cases mc where mc.id = p_case_id) then
    raise exception 'Moderation case not found' using errcode = '22023';
  end if;

  return query
  select
    mce.id,
    mce.actor_user_id,
    mce.actor_username_snapshot,
    mce.actor_display_name_snapshot,
    mce.action,
    mce.reason,
    mce.before_state,
    mce.after_state,
    mce.created_at
  from private.moderation_case_events mce
  where mce.case_id = p_case_id
  order by mce.created_at, mce.id;
end;
$$;

create or replace function public.assign_moderation_case(
  p_case_id uuid,
  p_assignee_user_id uuid,
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
  v_before private.moderation_cases%rowtype;
  v_action text;
begin
  v_actor := private.require_active_platform_admin();

  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Assignment reason must be between 3 and 500 characters' using errcode = '22023';
  end if;
  if p_assignee_user_id is not null
     and not private.is_active_platform_admin(p_assignee_user_id) then
    raise exception 'Assignee must be an active platform administrator' using errcode = '42501';
  end if;

  select *
  into v_before
  from private.moderation_cases mc
  where mc.id = p_case_id
  for update;

  if not found then
    raise exception 'Moderation case not found' using errcode = '22023';
  end if;
  if v_before.status in (
    'RESOLVED'::public.moderation_case_status,
    'DISMISSED'::public.moderation_case_status
  ) then
    raise exception 'Closed moderation cases cannot be reassigned' using errcode = '22023';
  end if;
  if v_before.assigned_to is not distinct from p_assignee_user_id then
    raise exception 'Moderation case assignment is unchanged' using errcode = '22023';
  end if;

  update private.moderation_cases
  set
    assigned_to = p_assignee_user_id,
    assigned_at = case when p_assignee_user_id is null then null else now() end,
    updated_at = now()
  where id = p_case_id;

  v_action := case when p_assignee_user_id is null then 'CASE_UNASSIGNED' else 'CASE_ASSIGNED' end;
  perform private.append_moderation_case_event(
    p_case_id,
    v_actor,
    v_action,
    v_reason,
    jsonb_build_object('assigned_to', v_before.assigned_to),
    jsonb_build_object('assigned_to', p_assignee_user_id)
  );
end;
$$;

create or replace function public.add_moderation_case_note(
  p_case_id uuid,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_note text := trim(coalesce(p_note, ''));
  v_author_username text;
  v_author_display_name text;
  v_status public.moderation_case_status;
  v_note_id uuid;
begin
  v_actor := private.require_active_platform_admin();

  if char_length(v_note) not between 3 and 2000 then
    raise exception 'Moderator note must be between 3 and 2000 characters' using errcode = '22023';
  end if;

  select mc.status
  into v_status
  from private.moderation_cases mc
  where mc.id = p_case_id
  for update;

  if not found then
    raise exception 'Moderation case not found' using errcode = '22023';
  end if;
  if v_status in (
    'RESOLVED'::public.moderation_case_status,
    'DISMISSED'::public.moderation_case_status
  ) then
    raise exception 'Closed moderation cases cannot receive notes' using errcode = '22023';
  end if;

  select p.username, p.display_name
  into v_author_username, v_author_display_name
  from public.profiles p
  where p.id = v_actor;

  insert into private.moderation_case_notes (
    case_id,
    author_user_id,
    author_username_snapshot,
    author_display_name_snapshot,
    body
  ) values (
    p_case_id,
    v_actor,
    v_author_username,
    v_author_display_name,
    v_note
  )
  returning id into v_note_id;

  update private.moderation_cases
  set updated_at = now()
  where id = p_case_id;

  perform private.append_moderation_case_event(
    p_case_id,
    v_actor,
    'NOTE_ADDED',
    null,
    '{}'::jsonb,
    jsonb_build_object('note_id', v_note_id)
  );

  return v_note_id;
end;
$$;

create or replace function public.update_moderation_case_status(
  p_case_id uuid,
  p_status public.moderation_case_status,
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
  v_before private.moderation_cases%rowtype;
  v_closed_at timestamptz;
begin
  v_actor := private.require_active_platform_admin();

  if p_status is null or p_status = 'NEW'::public.moderation_case_status then
    raise exception 'Moderation case can only advance from NEW' using errcode = '22023';
  end if;
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'Status reason must be between 3 and 500 characters' using errcode = '22023';
  end if;

  select *
  into v_before
  from private.moderation_cases mc
  where mc.id = p_case_id
  for update;

  if not found then
    raise exception 'Moderation case not found' using errcode = '22023';
  end if;
  if v_before.status = p_status then
    raise exception 'Moderation case status is unchanged' using errcode = '22023';
  end if;
  if v_before.status in (
    'RESOLVED'::public.moderation_case_status,
    'DISMISSED'::public.moderation_case_status
  ) then
    raise exception 'Closed moderation cases cannot transition' using errcode = '22023';
  end if;
  if v_before.status = 'IN_REVIEW'::public.moderation_case_status
     and p_status = 'IN_REVIEW'::public.moderation_case_status then
    raise exception 'Moderation case status is unchanged' using errcode = '22023';
  end if;

  v_closed_at := case
    when p_status in (
      'RESOLVED'::public.moderation_case_status,
      'DISMISSED'::public.moderation_case_status
    ) then now()
    else null
  end;

  update private.moderation_cases
  set
    status = p_status,
    assigned_to = case
      when p_status = 'IN_REVIEW'::public.moderation_case_status and assigned_to is null then v_actor
      else assigned_to
    end,
    assigned_at = case
      when p_status = 'IN_REVIEW'::public.moderation_case_status and assigned_to is null then now()
      else assigned_at
    end,
    resolution_reason = case when v_closed_at is null then null else v_reason end,
    updated_at = now(),
    closed_at = v_closed_at,
    retention_until = case when v_closed_at is null then null else v_closed_at + interval '2 years' end
  where id = p_case_id;

  perform private.append_moderation_case_event(
    p_case_id,
    v_actor,
    'STATUS_CHANGED',
    v_reason,
    jsonb_build_object('status', v_before.status, 'assigned_to', v_before.assigned_to),
    jsonb_build_object(
      'status', p_status,
      'assigned_to', coalesce(v_before.assigned_to, case when p_status = 'IN_REVIEW' then v_actor end)
    )
  );
end;
$$;

revoke all on type public.user_report_category from public, anon, authenticated;
revoke all on type public.user_report_reference_type from public, anon, authenticated;
revoke all on type public.moderation_case_status from public, anon, authenticated;
grant usage on type public.user_report_category to authenticated;
grant usage on type public.user_report_reference_type to authenticated;
grant usage on type public.moderation_case_status to authenticated;

revoke all on function private.reject_moderation_immutable_mutation() from public, anon, authenticated;
revoke all on function private.users_share_active_group(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.group_social_activity_belongs_to_user(uuid, text, uuid) from public, anon, authenticated;
revoke all on function private.append_moderation_case_event(uuid, uuid, text, text, jsonb, jsonb) from public, anon, authenticated;

revoke all on function public.submit_user_report(uuid, public.user_report_category, text, public.user_report_reference_type, uuid, text) from public, anon, authenticated;
grant execute on function public.submit_user_report(uuid, public.user_report_category, text, public.user_report_reference_type, uuid, text) to authenticated;

revoke all on function public.list_moderation_cases(public.moderation_case_status, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.list_moderation_cases(public.moderation_case_status, uuid, integer, integer) to authenticated;
revoke all on function public.get_moderation_case_detail(uuid) from public, anon, authenticated;
grant execute on function public.get_moderation_case_detail(uuid) to authenticated;
revoke all on function public.list_moderation_case_notes(uuid) from public, anon, authenticated;
grant execute on function public.list_moderation_case_notes(uuid) to authenticated;
revoke all on function public.list_moderation_case_events(uuid) from public, anon, authenticated;
grant execute on function public.list_moderation_case_events(uuid) to authenticated;
revoke all on function public.assign_moderation_case(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.assign_moderation_case(uuid, uuid, text) to authenticated;
revoke all on function public.add_moderation_case_note(uuid, text) from public, anon, authenticated;
grant execute on function public.add_moderation_case_note(uuid, text) to authenticated;
revoke all on function public.update_moderation_case_status(uuid, public.moderation_case_status, text) from public, anon, authenticated;
grant execute on function public.update_moderation_case_status(uuid, public.moderation_case_status, text) to authenticated;

comment on table private.user_reports is
  'Private immutable user-submitted moderation evidence. Reporter identity is never exposed to the report target.';
comment on table private.moderation_cases is
  'Durable moderation queue. Closed cases and related evidence are retained for at least two years after closure; any later purge is operator-only and must honor legal or safety holds.';
comment on table private.moderation_case_notes is
  'Private append-only moderator notes. Notes cannot be added after a case closes.';
comment on table private.moderation_case_events is
  'Private append-only case action history with identity snapshots retained across account deletion.';
comment on function public.submit_user_report(uuid, public.user_report_category, text, public.user_report_reference_type, uuid, text) is
  'Creates a private NEW moderation case. Supports current GROUP, completed WORKOUT, and SOCIAL_ACTIVITY references; message references remain unsupported until messaging exists.';

notify pgrst, 'reload schema';
