begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select is(
  (select count(*)::integer from private.platform_capacity_allowances
   where source in ('DATABASE_LOCAL','SUPABASE_MANAGEMENT')
     and metric_code in (
       'database_bytes',
       'supabase_monthly_active_users',
       'supabase_storage_bytes',
       'supabase_egress_bytes',
       'supabase_cached_egress_bytes',
       'supabase_edge_function_invocations',
       'supabase_realtime_messages',
       'supabase_realtime_peak_connections'
     )),
  8,
  'Phase 17.4 seeds exactly the eight verified Free-plan allowances'
);

select is((select limit_value from private.platform_capacity_allowances where source='DATABASE_LOCAL' and metric_code='database_bytes'), 524288000::numeric, 'database limit is 500 MB per project');
select is((select limit_value from private.platform_capacity_allowances where source='SUPABASE_MANAGEMENT' and metric_code='supabase_monthly_active_users'), 50000::numeric, 'MAU limit is 50,000');
select is((select limit_value from private.platform_capacity_allowances where source='SUPABASE_MANAGEMENT' and metric_code='supabase_storage_bytes'), 1073741824::numeric, 'Storage allowance is 1 GB');
select is((select limit_value from private.platform_capacity_allowances where source='SUPABASE_MANAGEMENT' and metric_code='supabase_egress_bytes'), 5368709120::numeric, 'uncached egress allowance is 5 GB');
select is((select limit_value from private.platform_capacity_allowances where source='SUPABASE_MANAGEMENT' and metric_code='supabase_cached_egress_bytes'), 5368709120::numeric, 'cached egress allowance is 5 GB');
select is((select limit_value from private.platform_capacity_allowances where source='SUPABASE_MANAGEMENT' and metric_code='supabase_edge_function_invocations'), 500000::numeric, 'Edge Function invocation allowance is 500,000');
select is((select limit_value from private.platform_capacity_allowances where source='SUPABASE_MANAGEMENT' and metric_code='supabase_realtime_messages'), 2000000::numeric, 'Realtime message allowance is 2,000,000');
select is((select limit_value from private.platform_capacity_allowances where source='SUPABASE_MANAGEMENT' and metric_code='supabase_realtime_peak_connections'), 200::numeric, 'Realtime peak connections allowance is 200');

select is(
  (select count(*)::integer from private.platform_capacity_allowances where source='DATABASE_LOCAL' and metric_code='storage_bytes'),
  0,
  'organization Storage allowance is not misapplied to the project-local instantaneous storage metric'
);

select has_function('public', 'get_platform_capacity_allowances', array['text'], 'admin allowance reader exists');
select is(has_function_privilege('authenticated', 'public.get_platform_capacity_allowances(text)', 'execute'), true, 'authenticated role can reach guarded allowance reader');
select is(has_function_privilege('anon', 'public.get_platform_capacity_allowances(text)', 'execute'), false, 'anon cannot execute allowance reader');
select ok(
  not exists(
    select 1 from private.platform_capacity_allowances
    where source in ('DATABASE_LOCAL','SUPABASE_MANAGEMENT')
      and metric_code in (
        'database_bytes',
        'supabase_monthly_active_users',
        'supabase_storage_bytes',
        'supabase_egress_bytes',
        'supabase_cached_egress_bytes',
        'supabase_edge_function_invocations',
        'supabase_realtime_messages',
        'supabase_realtime_peak_connections'
      )
      and note not like '%Verified 2026-08-29%'
  ),
  'every Phase 17.4 allowance records its verification date'
);

select * from finish();
rollback;
