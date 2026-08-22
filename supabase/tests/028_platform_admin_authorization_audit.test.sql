begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

select has_type('public', 'platform_account_status', 'platform account status enum exists');
select has_table('private', 'platform_account_state', 'private platform account state exists');
select has_table('private', 'platform_admins', 'private platform admin membership exists');
select has_table('private', 'platform_admin_audit_log', 'private immutable admin audit log exists');
select has_function('private', 'bootstrap_platform_admin', array['uuid','text'], 'operator-only bootstrap function exists');
select has_function('public', 'get_my_platform_access', array[]::text[], 'self platform-access RPC exists');
select has_function('public', 'grant_platform_admin', array['uuid','text'], 'platform-admin grant RPC exists');
select has_function('public', 'revoke_platform_admin', array['uuid','text'], 'platform-admin revoke RPC exists');
select is(
  has_function_privilege('authenticated', 'public.get_my_platform_access()', 'execute'),
  true,
  'authenticated role can execute self platform-access RPC'
);
select is(
  has_function_privilege('anon', 'public.get_my_platform_access()', 'execute'),
  false,
  'anonymous role cannot execute self platform-access RPC'
);
select is(
  has_function_privilege('authenticated', 'public.grant_platform_admin(uuid,text)', 'execute'),
  true,
  'authenticated role can reach guarded admin-grant RPC'
);
select is(
  has_function_privilege('anon', 'public.grant_platform_admin(uuid,text)', 'execute'),
  false,
  'anonymous role cannot execute admin-grant RPC'
);
select is(
  has_function_privilege('authenticated', 'public.revoke_platform_admin(uuid,text)', 'execute'),
  true,
  'authenticated role can reach guarded admin-revoke RPC'
);
select is(
  has_function_privilege('anon', 'public.revoke_platform_admin(uuid,text)', 'execute'),
  false,
  'anonymous role cannot execute admin-revoke RPC'
);
select is(
  has_schema_privilege('authenticated', 'private', 'usage'),
  false,
  'authenticated role has no direct access to private operational schema'
);
select is(
  has_function_privilege('authenticated', 'private.bootstrap_platform_admin(uuid,text)', 'execute'),
  false,
  'authenticated role cannot bootstrap a platform administrator'
);

insert into auth.users (id, email) values
  ('15111111-1111-4111-8111-111111111111', 'platform-admin@test.local'),
  ('15222222-2222-4222-8222-222222222222', 'platform-second@test.local'),
  ('15333333-3333-4333-8333-333333333333', 'platform-normal@test.local'),
  ('15444444-4444-4444-8444-444444444444', 'platform-other@test.local');

-- Group ownership is deliberately orthogonal to platform administration.
insert into public.groups (id, name, created_by) values
  ('15000000-0000-4000-8000-000000000001', 'Phase 15 Group Owner Fixture', '15333333-3333-4333-8333-333333333333');

select lives_ok(
  $$select private.bootstrap_platform_admin('15111111-1111-4111-8111-111111111111'::uuid, 'Initial Phase 15 test administrator')$$,
  'first platform administrator can be bootstrapped by the database operator'
);
select results_eq(
  $$select count(*) from private.platform_admins$$,
  array[1::bigint],
  'bootstrap creates exactly one platform administrator'
);
select results_eq(
  $$select count(*) from private.platform_admin_audit_log where action = 'PLATFORM_ADMIN_BOOTSTRAPPED'$$,
  array[1::bigint],
  'bootstrap creates an immutable audit record'
);
select throws_ok(
  $$select private.bootstrap_platform_admin('15222222-2222-4222-8222-222222222222'::uuid, 'Second bootstrap attempt')$$,
  '42501',
  'Platform administrator already bootstrapped',
  'bootstrap cannot be reused after the first platform administrator exists'
);

set local role authenticated;
set local request.jwt.claim.sub = '15111111-1111-4111-8111-111111111111';
select results_eq(
  $$select account_status::text || '|' || is_platform_admin::text from public.get_my_platform_access()$$,
  array['ACTIVE|true'::text],
  'active platform administrator sees active admin access'
);
select lives_ok(
  $$select public.grant_platform_admin('15222222-2222-4222-8222-222222222222'::uuid, 'Second trusted platform operator')$$,
  'active platform administrator can grant another active account'
);
reset role;
select results_eq(
  $$select count(*) from private.platform_admin_audit_log where action = 'PLATFORM_ADMIN_GRANTED' and actor_user_id = '15111111-1111-4111-8111-111111111111'::uuid and target_user_id = '15222222-2222-4222-8222-222222222222'::uuid$$,
  array[1::bigint],
  'admin grant records actor and target in audit history'
);

set local role authenticated;
set local request.jwt.claim.sub = '15333333-3333-4333-8333-333333333333';
select results_eq(
  $$select account_status::text || '|' || is_platform_admin::text from public.get_my_platform_access()$$,
  array['ACTIVE|false'::text],
  'normal user sees active account without platform-admin access'
);
select throws_ok(
  $$select public.grant_platform_admin('15444444-4444-4444-8444-444444444444'::uuid, 'Unauthorized promotion attempt')$$,
  '42501',
  'Platform administrator required',
  'normal user cannot grant platform-admin access'
);

reset role;
update private.platform_account_state
set status = 'SUSPENDED', updated_by = '15111111-1111-4111-8111-111111111111', status_reason = 'Phase 15 authorization fixture'
where user_id = '15222222-2222-4222-8222-222222222222';

set local role authenticated;
set local request.jwt.claim.sub = '15222222-2222-4222-8222-222222222222';
select results_eq(
  $$select account_status::text || '|' || is_platform_admin::text from public.get_my_platform_access()$$,
  array['SUSPENDED|false'::text],
  'suspended platform-admin member loses active platform-admin access'
);
select throws_ok(
  $$select public.revoke_platform_admin('15111111-1111-4111-8111-111111111111'::uuid, 'Suspended actor attempt')$$,
  '42501',
  'Active platform administrator required',
  'suspended platform administrator cannot perform privileged mutations'
);

set local request.jwt.claim.sub = '15111111-1111-4111-8111-111111111111';
select lives_ok(
  $$select public.revoke_platform_admin('15222222-2222-4222-8222-222222222222'::uuid, 'Remove suspended platform operator')$$,
  'active administrator can revoke a suspended secondary administrator'
);
select throws_ok(
  $$select public.revoke_platform_admin('15111111-1111-4111-8111-111111111111'::uuid, 'Would remove final administrator')$$,
  '42501',
  'Final platform administrator cannot be revoked',
  'final platform administrator cannot revoke their own last admin membership'
);

reset role;
select throws_ok(
  $$update private.platform_account_state set status = 'SUSPENDED', status_reason = 'Would suspend final admin' where user_id = '15111111-1111-4111-8111-111111111111'::uuid$$,
  '42501',
  'Final platform administrator must remain active',
  'final platform administrator cannot be suspended at the data boundary'
);
select throws_ok(
  $$delete from public.profiles where id = '15111111-1111-4111-8111-111111111111'::uuid$$,
  '42501',
  'Platform administrator must be revoked before account deletion',
  'platform administrator profile cannot be deleted before admin membership is revoked'
);
select throws_ok(
  $$update private.platform_admin_audit_log set reason = 'tampered' where id = (select min(id) from private.platform_admin_audit_log)$$,
  '42501',
  'Platform admin audit records are immutable',
  'admin audit records cannot be updated'
);
select throws_ok(
  $$delete from private.platform_admin_audit_log where id = (select min(id) from private.platform_admin_audit_log)$$,
  '42501',
  'Platform admin audit records are immutable',
  'admin audit records cannot be deleted'
);
select results_eq(
  $$select count(*) from private.platform_admin_audit_log$$,
  array[3::bigint],
  'only successful bootstrap/grant/revoke mutations create audit rows'
);
select results_eq(
  $$select (before_state->>'is_platform_admin') || '|' || (after_state->>'is_platform_admin') from private.platform_admin_audit_log where action = 'PLATFORM_ADMIN_GRANTED'$$,
  array['false|true'::text],
  'grant audit preserves relevant before and after state'
);
select results_eq(
  $$select count(*) from private.platform_admins pa join public.group_members gm on gm.user_id = pa.user_id where gm.role in ('OWNER','ADMIN')$$,
  array[0::bigint],
  'platform-admin authorization does not depend on group owner/admin membership'
);
select results_eq(
  $$select count(*) from private.platform_admins where user_id = '15111111-1111-4111-8111-111111111111'::uuid$$,
  array[1::bigint],
  'failed final-admin protections leave the last platform administrator intact'
);

select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select * from public.get_my_platform_access()$$,
  '42501',
  'Authentication required',
  'self platform-access RPC rejects unauthenticated callers'
);

select * from finish();
rollback;
