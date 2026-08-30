-- Phase 17.4: verified Supabase Free-plan capacity allowances.
-- Verified against official Supabase billing/usage documentation on 2026-08-29.
-- Values remain server-owned in private.platform_capacity_allowances.

insert into private.platform_capacity_allowances
  (source, metric_code, unit, limit_value, note, updated_at, updated_by)
values
  ('DATABASE_LOCAL', 'database_bytes', 'bytes', 524288000,
   'Supabase Free database size limit: 500 MB per project. Verified 2026-08-29.', now(), null),
  ('SUPABASE_MANAGEMENT', 'supabase_monthly_active_users', 'count', 50000,
   'Supabase Free monthly active users allowance: 50,000 per organization. Verified 2026-08-29.', now(), null),
  ('SUPABASE_MANAGEMENT', 'supabase_storage_bytes', 'bytes', 1073741824,
   'Supabase Free Storage allowance: 1 GB per organization; billing usage is cycle-average GB-hours, so project-local storage bytes are not substituted. Verified 2026-08-29.', now(), null),
  ('SUPABASE_MANAGEMENT', 'supabase_egress_bytes', 'bytes', 5368709120,
   'Supabase Free uncached egress allowance: 5 GB per organization. Verified 2026-08-29.', now(), null),
  ('SUPABASE_MANAGEMENT', 'supabase_cached_egress_bytes', 'bytes', 5368709120,
   'Supabase Free cached egress allowance: 5 GB per organization. Verified 2026-08-29.', now(), null),
  ('SUPABASE_MANAGEMENT', 'supabase_edge_function_invocations', 'count', 500000,
   'Supabase Free Edge Function invocation allowance: 500,000 per organization. Verified 2026-08-29.', now(), null),
  ('SUPABASE_MANAGEMENT', 'supabase_realtime_messages', 'count', 2000000,
   'Supabase Free Realtime message allowance: 2,000,000 per organization. Verified 2026-08-29.', now(), null),
  ('SUPABASE_MANAGEMENT', 'supabase_realtime_peak_connections', 'count', 200,
   'Supabase Free Realtime peak connection allowance: 200 per organization. Verified 2026-08-29.', now(), null)
on conflict (source, metric_code) do update
set unit = excluded.unit,
    limit_value = excluded.limit_value,
    note = excluded.note,
    updated_at = now(),
    updated_by = null;

-- Deliberately do not attach the organization Storage allowance to DATABASE_LOCAL/storage_bytes.
-- That local metric is an instantaneous project measurement while Supabase bills organization
-- Storage as average GB-hours over the billing cycle.

create or replace function public.get_platform_capacity_allowances(p_source text)
returns table (
  metric_code text,
  unit text,
  limit_value numeric,
  note text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  perform private.require_active_platform_admin();

  if p_source not in ('DATABASE_LOCAL', 'SUPABASE_MANAGEMENT', 'NETLIFY_API') then
    raise exception 'Unsupported capacity source' using errcode = '22023';
  end if;

  return query
  select
    a.metric_code,
    a.unit,
    a.limit_value,
    a.note,
    a.updated_at
  from private.platform_capacity_allowances a
  where a.source = p_source
  order by a.metric_code;
end;
$$;

revoke all on function public.get_platform_capacity_allowances(text) from public, anon, authenticated;
grant execute on function public.get_platform_capacity_allowances(text) to authenticated;

comment on function public.get_platform_capacity_allowances(text) is
  'Active-platform-admin-only read of server-owned provider allowance configuration.';
