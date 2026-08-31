begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select is(
  (select limit_value from private.platform_capacity_allowances
   where source = 'DATABASE_LOCAL' and metric_code = 'database_bytes'),
  524288000::numeric,
  'database size allowance is 500 MB per project'
);

select ok(
  position('Verified 2026-08-30' in (
    select note from private.platform_capacity_allowances
    where source = 'DATABASE_LOCAL' and metric_code = 'database_bytes'
  )) > 0,
  'database allowance records its verification date'
);

select is(
  (select count(*)::integer from private.platform_capacity_allowances
   where source = 'SUPABASE_MANAGEMENT'),
  0,
  'unmeasurable provider allowances are not configured as dashboard telemetry'
);

select is(
  (select count(*)::integer from private.platform_capacity_allowances
   where source = 'DATABASE_LOCAL' and metric_code = 'storage_bytes'),
  0,
  'organization Storage allowance is not misapplied to project-local storage'
);

select ok(
  current_setting('max_connections')::integer > 0,
  'Postgres connection ceiling is available directly from the live database'
);

select is(
  (select count(*)::integer
   from private.read_database_local_capacity_metrics()
   where metric_code in ('database_bytes', 'storage_bytes', 'postgres_connections')
     and available = true),
  3,
  'the three dashboard capacity signals are authoritatively measurable'
);

select * from finish();
rollback;
