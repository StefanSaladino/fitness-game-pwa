begin;
create extension if not exists pgtap with schema extensions;
select plan(52);

select has_table('private', 'platform_auth_coordination', 'private Auth coordination state exists');
select has_column('private', 'platform_auth_coordination', 'desired_banned', 'coordination stores desired Auth ban state');
select has_column('private', 'platform_auth_coordination', 'revision', 'coordination stores monotonic revision');
select has_column('private', 'platform_auth_coordination', 'last_error_code', 'coordination stores stable failure code');
select has_function('api_hooks', 'is_current_account_session_active', array[]::text[], 'non-exposed current session activity helper exists');
select has_function('api_hooks', 'enforce_active_account_request', array[]::text[], 'non-exposed PostgREST active-account guard exists');
select has_function(
  'public',
  'prepare_platform_account_auth_transition',
  array['uuid','uuid','text','text','timestamp with time zone'],
  'service-only transition preparation RPC exists'
);
select has_function(
  'public',
  'complete_platform_account_auth_transition',
  array['uuid','uuid','bigint','boolean','text'],
  'service-only transition completion RPC exists'
);

select is(
  has_table_privilege('authenticated', 'private.platform_auth_coordination', 'select'),
  false,
  'browser role cannot read private Auth coordination state'
);
select is(
  has_function_privilege('authenticated', 'public.suspend_platform_account(uuid,text,timestamp with time zone)', 'execute'),
  false,
  'browser role cannot bypass suspension Auth coordination'
);
select is(
  has_function_privilege('authenticated', 'public.restore_platform_account(uuid,text)', 'execute'),
  false,
  'browser role cannot bypass restore Auth coordination'
);
select is(
  has_function_privilege('authenticated', 'public.prepare_platform_account_auth_transition(uuid,uuid,text,text,timestamp with time zone)', 'execute'),
  false,
  'browser role cannot prepare privileged Auth transitions'
);
select is(
  has_function_privilege('service_role', 'public.prepare_platform_account_auth_transition(uuid,uuid,text,text,timestamp with time zone)', 'execute'),
  true,
  'service role can prepare privileged Auth transitions'
);
select is(
  has_function_privilege('service_role', 'public.complete_platform_account_auth_transition(uuid,uuid,bigint,boolean,text)', 'execute'),
  true,
  'service role can complete privileged Auth transitions'
);
select is(
  has_function_privilege('authenticated', 'api_hooks.is_current_account_session_active()', 'execute'),
  true,
  'authenticated Storage policies can call the bounded session helper'
);
select is(
  has_function_privilege('anon', 'api_hooks.is_current_account_session_active()', 'execute'),
  false,
  'anonymous role cannot call the session helper'
);

select results_eq(
  $$select count(*)::bigint
    from pg_roles
    where rolname = 'authenticator'
      and array_to_string(rolconfig, ',') like '%pgrst.db_pre_request=api_hooks.enforce_active_account_request%'$$,
  array[1::bigint],
  'authenticator role config installs the PostgREST pre-request boundary'
);

select results_eq(
  $$select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'profile_pictures_select_own',
        'profile_pictures_insert_own',
        'profile_pictures_delete_own'
      )
      and concat(coalesce(qual, ''), coalesce(with_check, '')) like '%is_current_account_session_active%'$$,
  array[3::bigint],
  'all profile-picture mutation policies enforce active session state'
);

insert into auth.users (id, email, last_sign_in_at) values
  ('15320100-0000-4000-8000-000000000001', 'admin-153b@test.local', now()),
  ('15320200-0000-4000-8000-000000000002', 'target-153b@test.local', now()),
  ('15320300-0000-4000-8000-000000000003', 'stale-153b@test.local', now()),
  ('15320400-0000-4000-8000-000000000004', 'pending-153b@test.local', now()),
  ('15320500-0000-4000-8000-000000000005', 'expired-153b@test.local', now());

update public.profiles
set username = case id
  when '15320100-0000-4000-8000-000000000001'::uuid then 'admin153b'
  when '15320200-0000-4000-8000-000000000002'::uuid then 'target153b'
  when '15320300-0000-4000-8000-000000000003'::uuid then 'stale153b'
  when '15320400-0000-4000-8000-000000000004'::uuid then 'pending153b'
  when '15320500-0000-4000-8000-000000000005'::uuid then 'expired153b'
end,
display_name = case id
  when '15320100-0000-4000-8000-000000000001'::uuid then 'Admin 153B'
  when '15320200-0000-4000-8000-000000000002'::uuid then 'Target 153B'
  when '15320300-0000-4000-8000-000000000003'::uuid then 'Stale 153B'
  when '15320400-0000-4000-8000-000000000004'::uuid then 'Pending 153B'
  when '15320500-0000-4000-8000-000000000005'::uuid then 'Expired 153B'
end
where id in (
  '15320100-0000-4000-8000-000000000001',
  '15320200-0000-4000-8000-000000000002',
  '15320300-0000-4000-8000-000000000003',
  '15320400-0000-4000-8000-000000000004',
  '15320500-0000-4000-8000-000000000005'
);

insert into private.platform_admins (user_id, granted_by, grant_reason)
values (
  '15320100-0000-4000-8000-000000000001',
  null,
  'Phase 15.3B transactional administrator'
);

insert into auth.sessions (id, user_id, created_at, updated_at, not_after) values
  (
    '15321100-0000-4000-8000-000000000001',
    '15320100-0000-4000-8000-000000000001',
    now(),
    now(),
    null
  ),
  (
    '15321200-0000-4000-8000-000000000002',
    '15320200-0000-4000-8000-000000000002',
    now(),
    now(),
    null
  ),
  (
    '15321400-0000-4000-8000-000000000004',
    '15320400-0000-4000-8000-000000000004',
    now(),
    now(),
    null
  ),
  (
    '15321500-0000-4000-8000-000000000005',
    '15320500-0000-4000-8000-000000000005',
    now(),
    now(),
    now() - interval '1 minute'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"15320100-0000-4000-8000-000000000001","role":"authenticated","session_id":"15321100-0000-4000-8000-000000000001"}',
  true
);

select lives_ok(
  $$select api_hooks.enforce_active_account_request()$$,
  'ACTIVE account with a matching live Auth session passes the Data API boundary'
);
select results_eq(
  $$select api_hooks.is_current_account_session_active()::text$$,
  array['true'::text],
  'active-session helper accepts the matching active session'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"15320300-0000-4000-8000-000000000003","role":"authenticated","session_id":"15321300-0000-4000-8000-000000000003"}',
  true
);
select throws_ok(
  $$select api_hooks.enforce_active_account_request()$$,
  '42501',
  'Account or session is not active',
  'issued JWT without a matching auth.sessions row is rejected immediately'
);
select results_eq(
  $$select api_hooks.is_current_account_session_active()::text$$,
  array['false'::text],
  'session helper fails closed when the JWT session row is absent'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"15320500-0000-4000-8000-000000000005","role":"authenticated","session_id":"15321500-0000-4000-8000-000000000005"}',
  true
);
select throws_ok(
  $$select api_hooks.enforce_active_account_request()$$,
  '42501',
  'Account or session is not active',
  'session past not_after is rejected even while its row remains present'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select lives_ok(
  $$select api_hooks.enforce_active_account_request()$$,
  'anonymous requests retain their existing RLS boundary'
);

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select lives_ok(
  $$select api_hooks.enforce_active_account_request()$$,
  'trusted service-role requests bypass the ordinary-account pre-request check'
);

select lives_ok(
  $$select * from public.prepare_platform_account_auth_transition(
      '15320100-0000-4000-8000-000000000001',
      '15320200-0000-4000-8000-000000000002',
      'SUSPEND',
      'Phase 15.3B policy review',
      now() + interval '7 days'
    )$$,
  'service boundary prepares suspension and makes database state authoritative first'
);

reset role;
select results_eq(
  $$select status::text from private.platform_account_state
    where user_id = '15320200-0000-4000-8000-000000000002'$$,
  array['SUSPENDED'::text],
  'suspension preparation immediately blocks product access in database state'
);
select results_eq(
  $$select (desired_banned and revision = 1 and completed_at is null)::text
    from private.platform_auth_coordination
    where user_id = '15320200-0000-4000-8000-000000000002'$$,
  array['true'::text],
  'suspension preparation records pending desired ban state'
);
select results_eq(
  $$select count(*)::bigint from private.platform_admin_audit_log
    where target_user_id = '15320200-0000-4000-8000-000000000002'
      and action = 'ACCOUNT_SUSPENDED'$$,
  array[1::bigint],
  'initial suspension preparation appends one lifecycle audit record'
);

set local role service_role;
select lives_ok(
  $$select * from public.prepare_platform_account_auth_transition(
      '15320100-0000-4000-8000-000000000001',
      '15320200-0000-4000-8000-000000000002',
      'SUSPEND',
      'Retry Phase 15.3B Auth ban',
      null
    )$$,
  'suspension preparation is retryable while the account is already suspended'
);
reset role;
select results_eq(
  $$select revision from private.platform_auth_coordination
    where user_id = '15320200-0000-4000-8000-000000000002'$$,
  array[2::bigint],
  'retry increments the coordination revision'
);
select results_eq(
  $$select count(*)::bigint from private.platform_admin_audit_log
    where target_user_id = '15320200-0000-4000-8000-000000000002'
      and action = 'ACCOUNT_SUSPENDED'$$,
  array[1::bigint],
  'suspension retry does not duplicate the lifecycle audit record'
);

set local role service_role;
select results_eq(
  $$select public.complete_platform_account_auth_transition(
      '15320100-0000-4000-8000-000000000001',
      '15320200-0000-4000-8000-000000000002',
      2,
      false,
      'AUTH_ADMIN_UPDATE_FAILED'
    )::text$$,
  array['SUSPENDED'::text],
  'Auth ban failure leaves database suspension authoritative'
);
reset role;
select results_eq(
  $$select last_error_code from private.platform_auth_coordination
    where user_id = '15320200-0000-4000-8000-000000000002'$$,
  array['AUTH_ADMIN_UPDATE_FAILED'::text],
  'Auth ban failure is recorded with a stable non-provider error code'
);

set local role service_role;
select lives_ok(
  $$select * from public.prepare_platform_account_auth_transition(
      '15320100-0000-4000-8000-000000000001',
      '15320200-0000-4000-8000-000000000002',
      'SUSPEND',
      'Successful Auth ban retry',
      null
    )$$,
  'failed Auth ban can be prepared for another safe retry'
);
select results_eq(
  $$select public.complete_platform_account_auth_transition(
      '15320100-0000-4000-8000-000000000001',
      '15320200-0000-4000-8000-000000000002',
      3,
      true,
      null
    )::text$$,
  array['SUSPENDED'::text],
  'successful Auth ban completion keeps account suspended and closes coordination'
);
reset role;
select results_eq(
  $$select (completed_at is not null and last_error_code is null)::text
    from private.platform_auth_coordination
    where user_id = '15320200-0000-4000-8000-000000000002'$$,
  array['true'::text],
  'successful Auth ban completion clears failure state'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"15320200-0000-4000-8000-000000000002","role":"authenticated","session_id":"15321200-0000-4000-8000-000000000002"}',
  true
);
select throws_ok(
  $$select api_hooks.enforce_active_account_request()$$,
  '42501',
  'Account or session is not active',
  'suspended account is rejected even when its previously issued session row still exists'
);
select results_eq(
  $$select api_hooks.is_current_account_session_active()::text$$,
  array['false'::text],
  'Storage session helper rejects suspended account state'
);

reset role;
select results_eq(
  $$select count(*)::bigint from auth.sessions
    where id = '15321200-0000-4000-8000-000000000002'$$,
  array[1::bigint],
  'database enforcement does not falsely claim that Auth ban deleted issued sessions'
);

set local role service_role;
select lives_ok(
  $$select * from public.prepare_platform_account_auth_transition(
      '15320100-0000-4000-8000-000000000001',
      '15320200-0000-4000-8000-000000000002',
      'RESTORE',
      'Policy review completed',
      null
    )$$,
  'restore preparation records desired unban without activating the account'
);
reset role;
select results_eq(
  $$select status::text from private.platform_account_state
    where user_id = '15320200-0000-4000-8000-000000000002'$$,
  array['SUSPENDED'::text],
  'restore remains fail-closed until Auth unban completes'
);
set local role service_role;
select results_eq(
  $$select public.complete_platform_account_auth_transition(
      '15320100-0000-4000-8000-000000000001',
      '15320200-0000-4000-8000-000000000002',
      4,
      false,
      'AUTH_ADMIN_UPDATE_FAILED'
    )::text$$,
  array['SUSPENDED'::text],
  'Auth unban failure leaves the target suspended'
);

select lives_ok(
  $$select * from public.prepare_platform_account_auth_transition(
      '15320100-0000-4000-8000-000000000001',
      '15320200-0000-4000-8000-000000000002',
      'RESTORE',
      'Successful Auth unban retry',
      null
    )$$,
  'failed Auth unban can be retried safely'
);
select results_eq(
  $$select public.complete_platform_account_auth_transition(
      '15320100-0000-4000-8000-000000000001',
      '15320200-0000-4000-8000-000000000002',
      5,
      true,
      null
    )::text$$,
  array['ACTIVE'::text],
  'database account becomes ACTIVE only after Auth unban succeeds'
);
reset role;
select results_eq(
  $$select count(*)::bigint from private.platform_admin_audit_log
    where target_user_id = '15320200-0000-4000-8000-000000000002'
      and action = 'ACCOUNT_RESTORED'$$,
  array[1::bigint],
  'successful coordinated restore appends one lifecycle audit record'
);

set local role service_role;
select throws_ok(
  $$select * from public.complete_platform_account_auth_transition(
      '15320100-0000-4000-8000-000000000001',
      '15320200-0000-4000-8000-000000000002',
      4,
      true,
      null
    )$$,
  '40001',
  'Stale Auth coordination revision',
  'stale Edge Function completion cannot overwrite a newer transition'
);
select throws_ok(
  $$select * from public.prepare_platform_account_auth_transition(
      '15320300-0000-4000-8000-000000000003',
      '15320200-0000-4000-8000-000000000002',
      'SUSPEND',
      'Non-admin attempt',
      null
    )$$,
  '42501',
  'Platform administrator required',
  'service RPC still validates the represented actor as an ACTIVE platform administrator'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"15320100-0000-4000-8000-000000000001","role":"authenticated","session_id":"15321100-0000-4000-8000-000000000001"}',
  true
);
select lives_ok(
  $$select public.request_platform_account_deletion(
      '15320400-0000-4000-8000-000000000004',
      'Phase 15.3B pending-deletion enforcement'
    )$$,
  'existing reversible deletion request remains available to active platform admins'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"15320400-0000-4000-8000-000000000004","role":"authenticated","session_id":"15321400-0000-4000-8000-000000000004"}',
  true
);
select throws_ok(
  $$select api_hooks.enforce_active_account_request()$$,
  '42501',
  'Account or session is not active',
  'DELETION_PENDING account is rejected across the Data API boundary'
);
select results_eq(
  $$select api_hooks.is_current_account_session_active()::text$$,
  array['false'::text],
  'DELETION_PENDING account is rejected by Storage session policy helper'
);

reset role;
select results_eq(
  $$select count(*)::bigint from public.profiles
    where id in (
      '15320200-0000-4000-8000-000000000002',
      '15320400-0000-4000-8000-000000000004'
    )$$,
  array[2::bigint],
  '15.3B enforcement and coordination never physically delete user profiles'
);

select * from finish();
rollback;
