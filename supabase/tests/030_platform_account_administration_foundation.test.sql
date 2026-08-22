begin;
create extension if not exists pgtap with schema extensions;
select plan(68);

select has_column('private', 'platform_account_state', 'suspension_review_at', 'account state stores optional suspension review date');
select has_column('private', 'platform_account_state', 'deletion_requested_at', 'account state stores deletion request time');
select has_column('private', 'platform_account_state', 'deletion_requested_by', 'account state stores deletion request actor');
select has_column('private', 'platform_account_state', 'deletion_previous_status', 'account state preserves pre-deletion status');
select has_column('private', 'platform_account_state', 'deletion_previous_reason', 'account state preserves pre-deletion reason');
select has_column('private', 'platform_account_state', 'deletion_previous_review_at', 'account state preserves pre-deletion review date');

select has_function('private', 'require_active_account', array[]::text[], 'private ordinary-account activity guard exists');
select has_function('public', 'list_platform_accounts', array['text','platform_account_status','integer','integer'], 'guarded account directory RPC exists');
select has_function('public', 'get_platform_account_detail', array['uuid'], 'guarded account detail RPC exists');
select has_function('public', 'suspend_platform_account', array['uuid','text','timestamp with time zone'], 'guarded suspension RPC exists');
select has_function('public', 'restore_platform_account', array['uuid','text'], 'guarded restore RPC exists');
select has_function('public', 'request_platform_account_deletion', array['uuid','text'], 'guarded deletion-request RPC exists');
select has_function('public', 'cancel_platform_account_deletion', array['uuid','text'], 'guarded deletion-cancel RPC exists');

select is(has_schema_privilege('authenticated', 'private', 'usage'), false, 'authenticated role has no private schema usage');
select is(has_table_privilege('authenticated', 'private.platform_account_state', 'select'), false, 'browser role cannot read private account state directly');
select is(has_table_privilege('authenticated', 'private.platform_admin_audit_log', 'select'), false, 'browser role cannot read private audit history directly');
select is(has_function_privilege('authenticated', 'private.require_active_account()', 'execute'), false, 'browser role cannot execute private active-account guard directly');
select is(has_function_privilege('authenticated', 'public.list_platform_accounts(text, public.platform_account_status, integer, integer)', 'execute'), true, 'authenticated role can reach guarded directory RPC');
select is(has_function_privilege('anon', 'public.list_platform_accounts(text, public.platform_account_status, integer, integer)', 'execute'), false, 'anonymous role cannot execute directory RPC');
select is(has_function_privilege('authenticated', 'public.suspend_platform_account(uuid, text, timestamp with time zone)', 'execute'), false, 'authenticated role cannot bypass server-coordinated suspension');
select is(has_function_privilege('anon', 'public.suspend_platform_account(uuid, text, timestamp with time zone)', 'execute'), false, 'anonymous role cannot execute suspension RPC');

-- Phase 15.3B removes browser execution from the historical state-only
-- suspension/restore functions. Grant them only inside this rollback-safe test
-- so the original 15.3A lifecycle behavior remains covered without reopening
-- the production bypass.
grant execute on function public.suspend_platform_account(uuid, text, timestamptz) to authenticated;
grant execute on function public.restore_platform_account(uuid, text) to authenticated;

select results_eq(
  $$select (pg_get_constraintdef(oid) like '%ACCOUNT_SUSPENDED%'
        and pg_get_constraintdef(oid) like '%ACCOUNT_RESTORED%'
        and pg_get_constraintdef(oid) like '%ACCOUNT_DELETION_REQUESTED%'
        and pg_get_constraintdef(oid) like '%ACCOUNT_DELETION_CANCELLED%')::text
    from pg_constraint
    where conrelid = 'private.platform_admin_audit_log'::regclass
      and conname = 'platform_admin_audit_log_action_check'$$,
  array['true'::text],
  'audit action constraint accepts the Phase 15.3 lifecycle actions'
);

insert into auth.users (id, email, last_sign_in_at) values
  ('15310100-0000-4000-8000-000000000001', 'admin-one-153a@test.local', now()),
  ('15310200-0000-4000-8000-000000000002', 'admin-two-153a@test.local', now()),
  ('15310300-0000-4000-8000-000000000003', 'target-153a@test.local', now()),
  ('15310400-0000-4000-8000-000000000004', 'other-153a@test.local', null),
  ('15310500-0000-4000-8000-000000000005', 'group-owner-153a@test.local', now());

update public.profiles
set username = case id
  when '15310100-0000-4000-8000-000000000001'::uuid then 'admin153a1'
  when '15310200-0000-4000-8000-000000000002'::uuid then 'admin153a2'
  when '15310300-0000-4000-8000-000000000003'::uuid then 'target153a'
  when '15310400-0000-4000-8000-000000000004'::uuid then 'other153a'
  when '15310500-0000-4000-8000-000000000005'::uuid then 'owner153a'
end,
display_name = case id
  when '15310100-0000-4000-8000-000000000001'::uuid then 'Admin One 153A'
  when '15310200-0000-4000-8000-000000000002'::uuid then 'Admin Two 153A'
  when '15310300-0000-4000-8000-000000000003'::uuid then 'Target User 153A'
  when '15310400-0000-4000-8000-000000000004'::uuid then 'Other User 153A'
  when '15310500-0000-4000-8000-000000000005'::uuid then 'Group Owner 153A'
end
where id in (
  '15310100-0000-4000-8000-000000000001',
  '15310200-0000-4000-8000-000000000002',
  '15310300-0000-4000-8000-000000000003',
  '15310400-0000-4000-8000-000000000004',
  '15310500-0000-4000-8000-000000000005'
);

insert into public.groups (id, name, created_by)
values ('15310000-0000-4000-8000-000000000099', 'Phase 15.3A group-owner fixture', '15310500-0000-4000-8000-000000000005');

select lives_ok(
  $$insert into private.platform_admins (user_id, granted_by, grant_reason)
    values ('15310100-0000-4000-8000-000000000001'::uuid, null, 'Phase 15.3A transactional test administrator')$$,
  'transactional fixture can establish the primary account-administration test admin'
);

set local role authenticated;
set local request.jwt.claim.sub = '15310100-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.grant_platform_admin('15310200-0000-4000-8000-000000000002'::uuid, 'Phase 15.3A secondary administrator')$$,
  'active platform administrator can grant a secondary administrator'
);

select results_eq(
  $$select count(*)::bigint from public.list_platform_accounts('153a', null, 1, 25)$$,
  array[5::bigint],
  'active platform administrator can search the five fixture accounts'
);

select results_eq(
  $$select count(*)::bigint from public.list_platform_accounts('target153a', null, 1, 25)$$,
  array[1::bigint],
  'directory search matches canonical username'
);

select results_eq(
  $$select username from public.list_platform_accounts('15310300-0000-4000-8000-000000000003', null, 1, 25)$$,
  array['target153a'::text],
  'directory search supports exact stable user UUID'
);

select results_eq(
  $$select count(*)::bigint from public.list_platform_accounts('153a', 'ACTIVE'::public.platform_account_status, 1, 2)$$,
  array[2::bigint],
  'directory pagination limits the returned row count'
);

select results_eq(
  $$select min(total_count)::bigint from public.list_platform_accounts('153a', 'ACTIVE'::public.platform_account_status, 1, 2)$$,
  array[5::bigint],
  'directory rows carry the full matching total'
);

select results_eq(
  $$select account_status::text from public.get_platform_account_detail('15310300-0000-4000-8000-000000000003')$$,
  array['ACTIVE'::text],
  'account detail returns current ACTIVE status'
);

select results_eq(
  $$select is_platform_admin::text from public.get_platform_account_detail('15310200-0000-4000-8000-000000000002')$$,
  array['true'::text],
  'account detail identifies platform administrator role'
);

select throws_ok(
  $$select * from public.list_platform_accounts(null, null, 0, 25)$$,
  '22023',
  'Page must be at least 1',
  'directory rejects page zero'
);

select throws_ok(
  $$select * from public.list_platform_accounts(null, null, 1, 101)$$,
  '22023',
  'Page size must be between 1 and 100',
  'directory rejects oversized pages'
);

select throws_ok(
  $$select public.suspend_platform_account('15310100-0000-4000-8000-000000000001', 'Self suspension is forbidden', now() + interval '1 day')$$,
  '42501',
  'Platform administrator cannot suspend own account',
  'administrator cannot suspend their own account'
);

select throws_ok(
  $$select public.request_platform_account_deletion('15310100-0000-4000-8000-000000000001', 'Self deletion is forbidden')$$,
  '42501',
  'Platform administrator cannot request own account deletion',
  'administrator cannot request deletion of their own account'
);

select throws_ok(
  $$select public.suspend_platform_account('15310300-0000-4000-8000-000000000003', 'x', null)$$,
  '22023',
  'Admin reason must be between 3 and 500 characters',
  'suspension requires a meaningful reason'
);

select throws_ok(
  $$select public.suspend_platform_account('15310300-0000-4000-8000-000000000003', 'Past review date', now() - interval '1 minute')$$,
  '22023',
  'Suspension review date must be in the future',
  'suspension review date cannot be in the past'
);

select lives_ok(
  $$select public.suspend_platform_account('15310300-0000-4000-8000-000000000003', 'Policy review for target account', now() + interval '7 days')$$,
  'active platform administrator can suspend a normal account'
);

reset role;

select results_eq(
  $$select status::text from private.platform_account_state where user_id='15310300-0000-4000-8000-000000000003'$$,
  array['SUSPENDED'::text],
  'suspension persists SUSPENDED state'
);

select results_eq(
  $$select (status_reason = 'Policy review for target account' and suspension_review_at is not null)::text
    from private.platform_account_state where user_id='15310300-0000-4000-8000-000000000003'$$,
  array['true'::text],
  'suspension persists reason and review metadata'
);

select results_eq(
  $$select count(*)::bigint from private.platform_admin_audit_log
    where target_user_id='15310300-0000-4000-8000-000000000003' and action='ACCOUNT_SUSPENDED'$$,
  array[1::bigint],
  'suspension appends an audit record'
);

select set_config('request.jwt.claim.sub', '15310300-0000-4000-8000-000000000003', true);
select throws_ok(
  $$select private.require_active_account()$$,
  '42501',
  'Account is not active',
  'private active-account guard rejects suspended users'
);

set local role authenticated;
set local request.jwt.claim.sub = '15310100-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.restore_platform_account('15310300-0000-4000-8000-000000000003', 'Policy review completed')$$,
  'active platform administrator can restore a suspended account'
);

reset role;

select results_eq(
  $$select (status='ACTIVE'::public.platform_account_status and status_reason is null and suspension_review_at is null)::text
    from private.platform_account_state where user_id='15310300-0000-4000-8000-000000000003'$$,
  array['true'::text],
  'restore returns account to clean ACTIVE state'
);

select results_eq(
  $$select count(*)::bigint from private.platform_admin_audit_log
    where target_user_id='15310300-0000-4000-8000-000000000003' and action='ACCOUNT_RESTORED'$$,
  array[1::bigint],
  'restore appends an audit record'
);

set local role authenticated;
set local request.jwt.claim.sub = '15310100-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.suspend_platform_account('15310300-0000-4000-8000-000000000003', 'Second suspension before deletion review', now() + interval '3 days')$$,
  'target can be suspended again for deletion-state restoration coverage'
);

select lives_ok(
  $$select public.request_platform_account_deletion('15310300-0000-4000-8000-000000000003', 'First destructive deletion confirmation')$$,
  'deletion request moves a suspended account into DELETION_PENDING'
);

reset role;

select results_eq(
  $$select (status='DELETION_PENDING'::public.platform_account_status
      and deletion_previous_status='SUSPENDED'::public.platform_account_status
      and deletion_previous_reason='Second suspension before deletion review'
      and deletion_previous_review_at is not null
      and deletion_requested_at is not null
      and deletion_requested_by='15310100-0000-4000-8000-000000000001'::uuid)::text
    from private.platform_account_state where user_id='15310300-0000-4000-8000-000000000003'$$,
  array['true'::text],
  'deletion request preserves the exact previous suspended state'
);

select set_config('request.jwt.claim.sub', '15310300-0000-4000-8000-000000000003', true);
select throws_ok(
  $$select private.require_active_account()$$,
  '42501',
  'Account is not active',
  'private active-account guard rejects deletion-pending users'
);

set local role authenticated;
set local request.jwt.claim.sub = '15310100-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.cancel_platform_account_deletion('15310300-0000-4000-8000-000000000003', 'Deletion request cancelled after review')$$,
  'administrator can cancel pending deletion'
);

reset role;

select results_eq(
  $$select (status='SUSPENDED'::public.platform_account_status
      and status_reason='Second suspension before deletion review'
      and suspension_review_at is not null
      and deletion_requested_at is null
      and deletion_previous_status is null)::text
    from private.platform_account_state where user_id='15310300-0000-4000-8000-000000000003'$$,
  array['true'::text],
  'deletion cancellation losslessly restores prior suspended state'
);

select results_eq(
  $$select count(*)::bigint from private.platform_admin_audit_log
    where target_user_id='15310300-0000-4000-8000-000000000003' and action='ACCOUNT_DELETION_REQUESTED'$$,
  array[1::bigint],
  'deletion request appends an audit record'
);

select results_eq(
  $$select count(*)::bigint from private.platform_admin_audit_log
    where target_user_id='15310300-0000-4000-8000-000000000003' and action='ACCOUNT_DELETION_CANCELLED'$$,
  array[1::bigint],
  'deletion cancellation appends an audit record'
);

set local role authenticated;
set local request.jwt.claim.sub = '15310100-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.restore_platform_account('15310300-0000-4000-8000-000000000003', 'Restore target after deletion-cancel test')$$,
  'target can be restored after deletion cancellation'
);

select lives_ok(
  $$select public.request_platform_account_deletion('15310400-0000-4000-8000-000000000004', 'Active-account deletion request coverage')$$,
  'active account can enter the first deletion-confirmation state'
);

reset role;

select results_eq(
  $$select (status='DELETION_PENDING'::public.platform_account_status
      and deletion_previous_status='ACTIVE'::public.platform_account_status)::text
    from private.platform_account_state where user_id='15310400-0000-4000-8000-000000000004'$$,
  array['true'::text],
  'active-account deletion request records ACTIVE as prior state'
);

set local role authenticated;
set local request.jwt.claim.sub = '15310100-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.cancel_platform_account_deletion('15310400-0000-4000-8000-000000000004', 'Active-account deletion request cancelled')$$,
  'active-account deletion request can be cancelled'
);

select throws_ok(
  $$select public.request_platform_account_deletion('15310200-0000-4000-8000-000000000002', 'Admin deletion should be blocked')$$,
  '42501',
  'Platform administrator must be revoked before account deletion',
  'platform administrator must be revoked before deletion can be requested'
);

select throws_ok(
  $$select public.restore_platform_account('15310400-0000-4000-8000-000000000004', 'Cannot restore an active account')$$,
  '22023',
  'Target account must be suspended before restore',
  'restore rejects accounts that are already active'
);

select throws_ok(
  $$select public.cancel_platform_account_deletion('15310400-0000-4000-8000-000000000004', 'Nothing to cancel')$$,
  '22023',
  'Target account deletion is not pending',
  'cancel rejects accounts without a pending deletion'
);

select lives_ok(
  $$select public.suspend_platform_account('15310200-0000-4000-8000-000000000002', 'Suspend secondary admin while primary remains active', null)$$,
  'one active administrator can suspend another administrator while a final active admin remains'
);

set local request.jwt.claim.sub = '15310200-0000-4000-8000-000000000002';

select throws_ok(
  $$select * from public.list_platform_accounts(null, null, 1, 25)$$,
  '42501',
  'Active platform administrator required',
  'suspended platform administrator cannot read account directory'
);

reset role;

set local role authenticated;
set local request.jwt.claim.sub = '15310100-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.restore_platform_account('15310200-0000-4000-8000-000000000002', 'Restore secondary administrator')$$,
  'primary administrator can restore secondary administrator'
);

reset role;

set local role authenticated;
set local request.jwt.claim.sub = '15310500-0000-4000-8000-000000000005';

select throws_ok(
  $$select * from public.list_platform_accounts(null, null, 1, 25)$$,
  '42501',
  'Platform administrator required',
  'group OWNER cannot read platform account directory'
);

select throws_ok(
  $$select public.suspend_platform_account('15310300-0000-4000-8000-000000000003', 'Group owner cannot suspend')$$,
  '42501',
  'Platform administrator required',
  'group OWNER cannot suspend an account'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);

select throws_ok(
  $$select * from public.list_platform_accounts(null, null, 1, 25)$$,
  '42501',
  'Authentication required',
  'unauthenticated caller cannot read platform account directory'
);

select results_eq(
  $$select count(*)::bigint from public.profiles where id in (
    '15310300-0000-4000-8000-000000000003'::uuid,
    '15310400-0000-4000-8000-000000000004'::uuid
  )$$,
  array[2::bigint],
  '15.3A deletion flow never physically deletes profiles'
);

select results_eq(
  $$select count(*)::bigint from auth.users where id in (
    '15310300-0000-4000-8000-000000000003'::uuid,
    '15310400-0000-4000-8000-000000000004'::uuid
  )$$,
  array[2::bigint],
  '15.3A deletion flow never physically deletes Auth users'
);

select * from finish();
rollback;
