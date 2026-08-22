-- Fitness Game PWA — Phase 15.2B database-local capacity telemetry + historical snapshots

create table private.platform_capacity_allowances (
  source text not null check (source in ('DATABASE_LOCAL', 'SUPABASE_MANAGEMENT', 'NETLIFY_API')),
  metric_code text not null check (char_length(trim(metric_code)) between 3 and 100),
  unit text not null check (unit in ('bytes', 'count', 'credits')),
  limit_value numeric not null check (limit_value > 0),
  note text check (note is null or char_length(trim(note)) between 3 and 500),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (source, metric_code)
);

create table private.platform_capacity_snapshots (
  id bigint generated always as identity primary key,
  source text not null check (source in ('DATABASE_LOCAL', 'SUPABASE_MANAGEMENT', 'NETLIFY_API')),
  captured_at timestamptz not null default now(),
  captured_by uuid
);

create table private.platform_capacity_snapshot_metrics (
  snapshot_id bigint not null references private.platform_capacity_snapshots(id) on delete cascade,
  metric_code text not null check (char_length(trim(metric_code)) between 3 and 100),
  unit text not null check (unit in ('bytes', 'count', 'credits')),
  value numeric,
  limit_value numeric,
  available boolean not null,
  note text check (note is null or char_length(trim(note)) between 3 and 500),
  primary key (snapshot_id, metric_code),
  check (value is null or value >= 0),
  check (limit_value is null or limit_value > 0),
  check ((available and value is not null) or (not available and value is null))
);

create index platform_capacity_snapshots_source_captured_idx
  on private.platform_capacity_snapshots(source, captured_at desc);

alter table private.platform_capacity_allowances enable row level security;
alter table private.platform_capacity_snapshots enable row level security;
alter table private.platform_capacity_snapshot_metrics enable row level security;

revoke all on table
  private.platform_capacity_allowances,
  private.platform_capacity_snapshots,
  private.platform_capacity_snapshot_metrics
from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;

create or replace function private.reject_platform_capacity_snapshot_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Platform capacity snapshots are immutable' using errcode = '42501';
end;
$$;

create trigger platform_capacity_snapshots_immutable
before update or delete on private.platform_capacity_snapshots
for each row execute function private.reject_platform_capacity_snapshot_mutation();

create trigger platform_capacity_snapshot_metrics_immutable
before update or delete on private.platform_capacity_snapshot_metrics
for each row execute function private.reject_platform_capacity_snapshot_mutation();

create or replace function private.read_database_local_capacity_metrics()
returns table (
  metric_code text,
  unit text,
  value numeric,
  limit_value numeric,
  available boolean,
  note text
)
language sql
stable
security definer
set search_path = ''
as $$
  with allowances as (
    select
      a.metric_code,
      a.unit,
      a.limit_value
    from private.platform_capacity_allowances a
    where a.source = 'DATABASE_LOCAL'
  ),
  local_metrics(metric_code, unit, value, system_limit, note) as (
    values
      (
        'database_bytes'::text,
        'bytes'::text,
        pg_database_size(current_database())::numeric,
        null::numeric,
        'PostgreSQL database size; provider disk/WAL usage is separate.'::text
      ),
      (
        'storage_bytes'::text,
        'bytes'::text,
        (
          select coalesce(sum(coalesce((o.metadata->>'size')::numeric, 0)), 0)
          from storage.objects o
        ),
        null::numeric,
        'Storage object bytes derived from trusted storage.objects metadata.'::text
      ),
      (
        'storage_objects'::text,
        'count'::text,
        (select count(*)::numeric from storage.objects),
        null::numeric,
        'Storage object count derived from trusted storage.objects metadata.'::text
      ),
      (
        'postgres_connections'::text,
        'count'::text,
        (
          select count(*)::numeric
          from pg_catalog.pg_stat_activity a
          where a.datname = current_database()
        ),
        current_setting('max_connections')::numeric,
        'Current PostgreSQL connections compared with the database max_connections setting.'::text
      ),
      (
        'auth_users_total'::text,
        'count'::text,
        (select count(*)::numeric from auth.users),
        null::numeric,
        'Local Auth user count; this is not a provider billing metric.'::text
      ),
      (
        'auth_users_30d'::text,
        'count'::text,
        (
          select count(*)::numeric
          from auth.users u
          where u.last_sign_in_at >= now() - interval '30 days'
        ),
        null::numeric,
        'Local recent-sign-in count; this is not Supabase billable monthly active users.'::text
      )
  )
  select
    lm.metric_code,
    lm.unit,
    lm.value,
    coalesce(lm.system_limit, a.limit_value) as limit_value,
    true as available,
    lm.note
  from local_metrics lm
  left join allowances a
    on a.metric_code = lm.metric_code
   and a.unit = lm.unit;
$$;

create or replace function public.get_platform_capacity_current()
returns table (
  metric_code text,
  source text,
  unit text,
  value numeric,
  limit_value numeric,
  available boolean,
  note text,
  measured_at timestamptz
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
    m.metric_code,
    'DATABASE_LOCAL'::text,
    m.unit,
    m.value,
    m.limit_value,
    m.available,
    m.note,
    now()
  from private.read_database_local_capacity_metrics() m;
end;
$$;

create or replace function public.capture_platform_capacity_snapshot()
returns table (
  snapshot_id bigint,
  captured_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_snapshot_id bigint;
  v_captured_at timestamptz;
begin
  v_actor := private.require_active_platform_admin();

  insert into private.platform_capacity_snapshots (source, captured_by)
  values ('DATABASE_LOCAL', v_actor)
  returning id, platform_capacity_snapshots.captured_at
  into v_snapshot_id, v_captured_at;

  insert into private.platform_capacity_snapshot_metrics (
    snapshot_id,
    metric_code,
    unit,
    value,
    limit_value,
    available,
    note
  )
  select
    v_snapshot_id,
    m.metric_code,
    m.unit,
    m.value,
    m.limit_value,
    m.available,
    m.note
  from private.read_database_local_capacity_metrics() m;

  return query select v_snapshot_id, v_captured_at;
end;
$$;

create or replace function public.get_platform_capacity_history(p_snapshot_limit integer default 30)
returns table (
  snapshot_id bigint,
  captured_at timestamptz,
  source text,
  metric_code text,
  unit text,
  value numeric,
  limit_value numeric,
  available boolean,
  note text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_active_platform_admin();

  if p_snapshot_limit is null or p_snapshot_limit < 1 or p_snapshot_limit > 365 then
    raise exception 'Snapshot limit must be between 1 and 365' using errcode = '22023';
  end if;

  return query
  with selected_snapshots as (
    select s.id, s.captured_at, s.source
    from private.platform_capacity_snapshots s
    order by s.captured_at desc, s.id desc
    limit p_snapshot_limit
  )
  select
    s.id,
    s.captured_at,
    s.source,
    m.metric_code,
    m.unit,
    m.value,
    m.limit_value,
    m.available,
    m.note
  from selected_snapshots s
  join private.platform_capacity_snapshot_metrics m on m.snapshot_id = s.id
  order by s.captured_at desc, s.id desc, m.metric_code;
end;
$$;

revoke all on function private.reject_platform_capacity_snapshot_mutation() from public, anon, authenticated;
revoke all on function private.read_database_local_capacity_metrics() from public, anon, authenticated;

revoke all on function public.get_platform_capacity_current() from public, anon, authenticated;
revoke all on function public.capture_platform_capacity_snapshot() from public, anon, authenticated;
revoke all on function public.get_platform_capacity_history(integer) from public, anon, authenticated;

grant execute on function public.get_platform_capacity_current() to authenticated;
grant execute on function public.capture_platform_capacity_snapshot() to authenticated;
grant execute on function public.get_platform_capacity_history(integer) to authenticated;

comment on table private.platform_capacity_allowances is
  'Operator/server-managed capacity allowances. Never expose this table directly to browser roles.';
comment on table private.platform_capacity_snapshots is
  'Append-only operational capacity snapshot headers captured by an active platform administrator.';
comment on table private.platform_capacity_snapshot_metrics is
  'Append-only normalized capacity measurements retained for trend and growth calculations.';
comment on function public.get_platform_capacity_current() is
  'Active-platform-admin-only live database-local capacity telemetry.';
comment on function public.capture_platform_capacity_snapshot() is
  'Active-platform-admin-only capture of database-local capacity telemetry into private history.';
comment on function public.get_platform_capacity_history(integer) is
  'Active-platform-admin-only normalized capacity history; p_snapshot_limit is bounded to 1..365.';
