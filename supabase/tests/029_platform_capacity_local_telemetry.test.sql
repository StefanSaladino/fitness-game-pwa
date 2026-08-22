begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

select has_table('private', 'platform_capacity_allowances', 'private capacity allowances table exists');
select has_table('private', 'platform_capacity_snapshots', 'private capacity snapshot headers exist');
select has_table('private', 'platform_capacity_snapshot_metrics', 'private normalized capacity snapshot metrics exist');
select has_function('private', 'read_database_local_capacity_metrics', array[]::text[], 'private local capacity collector exists');
select has_function('public', 'get_platform_capacity_current', array[]::text[], 'guarded current capacity RPC exists');
select has_function('public', 'capture_platform_capacity_snapshot', array[]::text[], 'guarded capacity capture RPC exists');
select has_function('public', 'get_platform_capacity_history', array['integer'], 'guarded capacity history RPC exists');

select is(has_function_privilege('authenticated', 'public.get_platform_capacity_current()', 'execute'), true, 'authenticated role can reach guarded current capacity RPC');
select is(has_function_privilege('anon', 'public.get_platform_capacity_current()', 'execute'), false, 'anonymous role cannot execute current capacity RPC');
select is(has_function_privilege('authenticated', 'public.capture_platform_capacity_snapshot()', 'execute'), true, 'authenticated role can reach guarded capacity capture RPC');
select is(has_function_privilege('anon', 'public.capture_platform_capacity_snapshot()', 'execute'), false, 'anonymous role cannot execute capacity capture RPC');
select is(has_function_privilege('authenticated', 'public.get_platform_capacity_history(integer)', 'execute'), true, 'authenticated role can reach guarded capacity history RPC');
select is(has_function_privilege('anon', 'public.get_platform_capacity_history(integer)', 'execute'), false, 'anonymous role cannot execute capacity history RPC');
select is(has_schema_privilege('authenticated', 'private', 'usage'), false, 'authenticated role still has no private schema usage');
select is(has_function_privilege('authenticated', 'private.read_database_local_capacity_metrics()', 'execute'), false, 'browser role cannot execute private capacity collector');
select is(has_table_privilege('authenticated', 'private.platform_capacity_allowances', 'select'), false, 'browser role cannot read private capacity allowances');
select is(has_table_privilege('authenticated', 'private.platform_capacity_snapshots', 'select'), false, 'browser role cannot read private snapshot headers');
select is(has_table_privilege('authenticated', 'private.platform_capacity_snapshot_metrics', 'select'), false, 'browser role cannot read private snapshot metrics');

insert into auth.users (id, email, last_sign_in_at) values
  ('16111111-1111-4111-8111-111111111111', 'capacity-admin@test.local', now()),
  ('16222222-2222-4222-8222-222222222222', 'capacity-suspended@test.local', now()),
  ('16333333-3333-4333-8333-333333333333', 'capacity-owner@test.local', now()),
  ('16444444-4444-4444-8444-444444444444', 'capacity-group-admin@test.local', now());

insert into public.groups (id, name, created_by) values
  ('16000000-0000-4000-8000-000000000001', 'Capacity owner fixture', '16333333-3333-4333-8333-333333333333');

insert into public.group_members (group_id, user_id, role, status, joined_at)
values (
  '16000000-0000-4000-8000-000000000001',
  '16444444-4444-4444-8444-444444444444',
  'ADMIN',
  'ACTIVE',
  now()
)
on conflict (group_id, user_id) do update set role = 'ADMIN', status = 'ACTIVE', removed_at = null;

select lives_ok(
  $$select private.bootstrap_platform_admin('16111111-1111-4111-8111-111111111111'::uuid, 'Capacity telemetry test administrator')$$,
  'operator can bootstrap the capacity test platform administrator'
);
select lives_ok(
  $$
    set local role authenticated;
    set local request.jwt.claim.sub = '16111111-1111-4111-8111-111111111111';
    select public.grant_platform_admin('16222222-2222-4222-8222-222222222222'::uuid, 'Capacity suspended-admin fixture');
    reset role;
  $$,
  'active platform administrator can grant the secondary capacity test administrator'
);

insert into private.platform_capacity_allowances (
  source, metric_code, unit, limit_value, note, updated_by
) values (
  'DATABASE_LOCAL',
  'database_bytes',
  'bytes',
  524288000,
  'Free-plan database-size operational allowance fixture',
  '16111111-1111-4111-8111-111111111111'
);

set local role authenticated;
set local request.jwt.claim.sub = '16111111-1111-4111-8111-111111111111';

select results_eq(
  $$select count(*)::bigint from public.get_platform_capacity_current()$$,
  array[6::bigint],
  'active platform administrator receives six database-local metrics'
);
select results_eq(
  $$select count(*)::bigint from public.get_platform_capacity_current() where source = 'DATABASE_LOCAL'$$,
  array[6::bigint],
  'all Phase 15.2B current metrics identify DATABASE_LOCAL as their source'
);
select results_eq(
  $$select (value > 0)::text from public.get_platform_capacity_current() where metric_code = 'database_bytes'$$,
  array['true'::text],
  'database size is measured as a positive byte count'
);
select results_eq(
  $$select limit_value::bigint from public.get_platform_capacity_current() where metric_code = 'postgres_connections'$$,
  array[(current_setting('max_connections')::bigint)],
  'connection capacity uses the live max_connections setting rather than a client constant'
);
select results_eq(
  $$select limit_value::bigint from public.get_platform_capacity_current() where metric_code = 'database_bytes'$$,
  array[524288000::bigint],
  'database measurement merges the trusted private configured allowance'
);
select results_eq(
  $$select (value >= 4)::text from public.get_platform_capacity_current() where metric_code = 'auth_users_total'$$,
  array['true'::text],
  'local total Auth user count includes the transactional fixtures'
);
select results_eq(
  $$select (note ilike '%not Supabase billable monthly active users%')::text from public.get_platform_capacity_current() where metric_code = 'auth_users_30d'$$,
  array['true'::text],
  '30-day recent-sign-in telemetry is explicitly not labeled as provider billable MAU'
);
select lives_ok(
  $$select * from public.capture_platform_capacity_snapshot()$$,
  'active platform administrator can capture a private telemetry snapshot'
);

reset role;

select results_eq(
  $$select count(*)::bigint from private.platform_capacity_snapshots$$,
  array[1::bigint],
  'one snapshot header is persisted'
);
select results_eq(
  $$select count(*)::bigint from private.platform_capacity_snapshot_metrics$$,
  array[6::bigint],
  'one normalized metric row is persisted for each database-local measurement'
);
select results_eq(
  $$select captured_by::text from private.platform_capacity_snapshots$$,
  array['16111111-1111-4111-8111-111111111111'::text],
  'snapshot history records the active platform administrator who captured it'
);
select results_eq(
  $$select limit_value::bigint from private.platform_capacity_snapshot_metrics where metric_code = 'database_bytes'$$,
  array[524288000::bigint],
  'snapshot freezes the database allowance that applied at capture time'
);

set local role authenticated;
set local request.jwt.claim.sub = '16111111-1111-4111-8111-111111111111';

select results_eq(
  $$select count(*)::bigint from public.get_platform_capacity_history(1)$$,
  array[6::bigint],
  'history RPC returns the normalized rows from the requested latest snapshot'
);
select throws_ok(
  $$select * from public.get_platform_capacity_history(0)$$,
  '22023',
  'Snapshot limit must be between 1 and 365',
  'history RPC rejects a zero snapshot limit'
);

reset role;

select throws_ok(
  $$update private.platform_capacity_snapshots set source = 'NETLIFY_API' where id = (select min(id) from private.platform_capacity_snapshots)$$,
  '42501',
  'Platform capacity snapshots are immutable',
  'snapshot headers cannot be updated'
);
select throws_ok(
  $$delete from private.platform_capacity_snapshot_metrics where snapshot_id = (select min(id) from private.platform_capacity_snapshots)$$,
  '42501',
  'Platform capacity snapshots are immutable',
  'snapshot metric history cannot be deleted'
);

set local role authenticated;
set local request.jwt.claim.sub = '16333333-3333-4333-8333-333333333333';

select throws_ok(
  $$select * from public.get_platform_capacity_current()$$,
  '42501',
  'Platform administrator required',
  'group OWNER cannot read platform capacity telemetry'
);
select throws_ok(
  $$select * from public.capture_platform_capacity_snapshot()$$,
  '42501',
  'Platform administrator required',
  'group OWNER cannot capture platform capacity telemetry'
);

set local request.jwt.claim.sub = '16444444-4444-4444-8444-444444444444';

select throws_ok(
  $$select * from public.get_platform_capacity_history(30)$$,
  '42501',
  'Platform administrator required',
  'group ADMIN cannot read platform capacity history'
);

reset role;

update private.platform_account_state
set
  status = 'SUSPENDED',
  updated_by = '16111111-1111-4111-8111-111111111111',
  status_reason = 'Capacity telemetry suspended-admin fixture'
where user_id = '16222222-2222-4222-8222-222222222222';

set local role authenticated;
set local request.jwt.claim.sub = '16222222-2222-4222-8222-222222222222';

select throws_ok(
  $$select * from public.get_platform_capacity_current()$$,
  '42501',
  'Active platform administrator required',
  'suspended platform administrator cannot read current capacity telemetry'
);
select throws_ok(
  $$select * from public.capture_platform_capacity_snapshot()$$,
  '42501',
  'Active platform administrator required',
  'suspended platform administrator cannot capture telemetry snapshots'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);

select throws_ok(
  $$select * from public.get_platform_capacity_current()$$,
  '42501',
  'Authentication required',
  'unauthenticated caller cannot read capacity telemetry'
);

select * from finish();
rollback;
