-- Phase 17.4: measurable Supabase Free-plan capacity.
-- Verified against official Supabase billing documentation on 2026-08-30.
--
-- Only database_bytes receives a billing-plan allowance because it is both
-- authoritatively measurable by the project and directly comparable to a
-- documented Free per-project quota.
--
-- PostgreSQL connection capacity is read live from max_connections.
-- Organization Storage, MAU, egress, Edge Function and Realtime quotas are
-- intentionally not attached to project-local measurements.

insert into private.platform_capacity_allowances
  (source, metric_code, unit, limit_value, note, updated_at, updated_by)
values
  (
    'DATABASE_LOCAL',
    'database_bytes',
    'bytes',
    524288000,
    'Supabase Free database size allowance: 500 MB per project. Verified 2026-08-30.',
    now(),
    null
  )
on conflict (source, metric_code) do update
set unit = excluded.unit,
    limit_value = excluded.limit_value,
    note = excluded.note,
    updated_at = now(),
    updated_by = null;

delete from private.platform_capacity_allowances
where source = 'SUPABASE_MANAGEMENT'
  and metric_code in (
    'supabase_monthly_active_users',
    'supabase_storage_bytes',
    'supabase_egress_bytes',
    'supabase_cached_egress_bytes',
    'supabase_edge_function_invocations',
    'supabase_realtime_messages',
    'supabase_realtime_peak_connections'
  );
