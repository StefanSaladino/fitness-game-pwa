begin;
create extension if not exists pgtap with schema extensions;
select plan(68);

select has_table('private', 'platform_account_deletion_jobs', 'private deletion coordination state exists');
select has_column('private', 'platform_account_deletion_jobs', 'deletion_mode', 'deletion job stores ADMIN or SELF mode');
select has_column('private', 'platform_account_deletion_jobs', 'revision', 'deletion job stores a monotonic revision');
select has_column('private', 'platform_account_deletion_jobs', 'status', 'deletion job stores lifecycle status');
select has_column('private', 'platform_account_deletion_jobs', 'storage_cleared_at', 'deletion job records Storage cleanup');
select has_column('private', 'platform_account_deletion_jobs', 'auth_delete_started_at', 'deletion job records Auth deletion start');
select has_column('private', 'platform_account_deletion_jobs', 'completed_at', 'deletion job records completion');
select has_column('private', 'platform_account_deletion_jobs', 'last_error_code', 'deletion job stores stable failure codes');

select has_function(
  'public',
  'request_own_platform_account_deletion',
  array[]::text[],
  'self-service first-step deletion request exists'
);
select has_function(
  'public',
  'cancel_own_platform_account_deletion',
  array['uuid','text'],
  'service-only self-deletion cancellation exists'
);
select has_function(
  'public',
  'prepare_platform_account_deletion',
  array['uuid','uuid','text','text'],
  'service-only irreversible preparation exists'
);
select has_function(
  'public',
  'mark_platform_account_deletion_storage_cleared',
  array['uuid','uuid','bigint'],
  'service-only Storage completion exists'
);
select has_function(
  'public',
  'record_platform_account_deletion_failure',
  array['uuid','uuid','bigint','text'],
  'service-only failure recording exists'
);

select results_eq(
  $$select count(*)::bigint from pg_trigger
    where tgname = 'auth_users_begin_platform_account_delete' and not tgisinternal$$,
  array[1::bigint],
  'Auth deletion has a fail-closed preparation trigger'
);
select results_eq(
  $$select count(*)::bigint from pg_trigger
    where tgname = 'profiles_finalize_platform_account_delete' and not tgisinternal$$,
  array[1::bigint],
  'profile deletion has an Auth-coordination finalizer trigger'
);

select is(
  has_table_privilege('authenticated', 'private.platform_account_deletion_jobs', 'select'),
  false,
  'browser role cannot read private deletion jobs'
);
select is(
  has_function_privilege('authenticated', 'public.request_own_platform_account_deletion()', 'execute'),
  true,
  'authenticated users can request their own deletion'
);
select is(
  has_function_privilege('anon', 'public.request_own_platform_account_deletion()', 'execute'),
  false,
  'anonymous callers cannot request self-deletion'
);
select is(
  has_function_privilege('authenticated', 'public.prepare_platform_account_deletion(uuid,uuid,text,text)', 'execute'),
  false,
  'browser role cannot prepare irreversible deletion'
);
select is(
  has_function_privilege('service_role', 'public.prepare_platform_account_deletion(uuid,uuid,text,text)', 'execute'),
  true,
  'service role can prepare irreversible deletion'
);
select is(
  has_function_privilege('authenticated', 'public.cancel_own_platform_account_deletion(uuid,text)', 'execute'),
  false,
  'pending browser account cannot bypass the server cancellation boundary'
);
select is(
  has_function_privilege('service_role', 'public.cancel_own_platform_account_deletion(uuid,text)', 'execute'),
  true,
  'service role can coordinate self-deletion cancellation'
);
select is(
  has_function_privilege('service_role', 'public.mark_platform_account_deletion_storage_cleared(uuid,uuid,bigint)', 'execute'),
  true,
  'service role can mark Storage cleanup complete'
);
select is(
  has_function_privilege('service_role', 'public.record_platform_account_deletion_failure(uuid,uuid,bigint,text)', 'execute'),
  true,
  'service role can record stable deletion failures'
);

insert into auth.users (id, email, last_sign_in_at) values
  ('15330100-0000-4000-8000-000000000001', 'admin-153c@test.local', now()),
  ('15330200-0000-4000-8000-000000000002', 'target-153c@test.local', now()),
  ('15330300-0000-4000-8000-000000000003', 'self-153c@test.local', now()),
  ('15330400-0000-4000-8000-000000000004', 'owner-153c@test.local', now()),
  ('15330500-0000-4000-8000-000000000005', 'cancel-153c@test.local', now()),
  ('15330600-0000-4000-8000-000000000006', 'direct-153c@test.local', now());

update public.profiles
set username = case id
  when '15330100-0000-4000-8000-000000000001'::uuid then 'admin153c'
  when '15330200-0000-4000-8000-000000000002'::uuid then 'target153c'
  when '15330300-0000-4000-8000-000000000003'::uuid then 'self153c'
  when '15330400-0000-4000-8000-000000000004'::uuid then 'owner153c'
  when '15330500-0000-4000-8000-000000000005'::uuid then 'cancel153c'
  when '15330600-0000-4000-8000-000000000006'::uuid then 'direct153c'
end,
display_name = case id
  when '15330100-0000-4000-8000-000000000001'::uuid then 'Admin 153C'
  when '15330200-0000-4000-8000-000000000002'::uuid then 'Target 153C'
  when '15330300-0000-4000-8000-000000000003'::uuid then 'Self 153C'
  when '15330400-0000-4000-8000-000000000004'::uuid then 'Owner 153C'
  when '15330500-0000-4000-8000-000000000005'::uuid then 'Cancel 153C'
  when '15330600-0000-4000-8000-000000000006'::uuid then 'Direct 153C'
end
where id in (
  '15330100-0000-4000-8000-000000000001',
  '15330200-0000-4000-8000-000000000002',
  '15330300-0000-4000-8000-000000000003',
  '15330400-0000-4000-8000-000000000004',
  '15330500-0000-4000-8000-000000000005',
  '15330600-0000-4000-8000-000000000006'
);

insert into private.platform_admins (user_id, granted_by, grant_reason)
values (
  '15330100-0000-4000-8000-000000000001',
  null,
  'Phase 15.3C transactional administrator'
);

insert into public.groups (id, name, created_by)
values (
  '15334000-0000-4000-8000-000000000004',
  'Phase 15.3C ownership blocker',
  '15330400-0000-4000-8000-000000000004'
);

insert into public.group_members (group_id, user_id, role, status, removed_at)
values (
  '15334000-0000-4000-8000-000000000004',
  '15330200-0000-4000-8000-000000000002',
  'MEMBER',
  'REMOVED',
  now()
);

set local role authenticated;
set local request.jwt.claim.sub = '15330100-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.request_platform_account_deletion(
      '15330400-0000-4000-8000-000000000004',
      'Owner deletion must fail without an eligible successor'
    )$$,
  '42501',
  'Owned group has no active successor; transfer ownership or remove the group before account deletion',
  'administrator deletion fails closed when an owned group has no eligible active successor'
);

select lives_ok(
  $$select public.request_platform_account_deletion(
      '15330200-0000-4000-8000-000000000002',
      'Administrator confirmed first destructive step'
    )$$,
  'administrator can place a non-admin non-owner account into deletion pending'
);

reset role;
select results_eq(
  $$select status::text from private.platform_account_state
    where user_id = '15330200-0000-4000-8000-000000000002'$$,
  array['DELETION_PENDING'::text],
  'administrator deletion request makes target DELETION_PENDING'
);

set local role service_role;
select throws_ok(
  $$select * from public.prepare_platform_account_deletion(
      '15330100-0000-4000-8000-000000000001',
      '15330200-0000-4000-8000-000000000002',
      'ADMIN',
      'DELETE wrong-user'
    )$$,
  '22023',
  'Deletion confirmation does not match',
  'server rejects a confirmation that does not exactly match the target username'
);

select throws_ok(
  $$select * from public.prepare_platform_account_deletion(
      '15330200-0000-4000-8000-000000000002',
      '15330200-0000-4000-8000-000000000002',
      'ADMIN',
      'DELETE target153c'
    )$$,
  '42501',
  'Platform administrator cannot delete own account',
  'administrator-mode destructive boundary rejects self-removal'
);

select lives_ok(
  $$select * from public.prepare_platform_account_deletion(
      '15330100-0000-4000-8000-000000000001',
      '15330200-0000-4000-8000-000000000002',
      'ADMIN',
      'DELETE target153c'
    )$$,
  'exact administrator confirmation prepares irreversible deletion'
);

reset role;
select results_eq(
  $$select (deletion_mode = 'ADMIN' and revision = 1 and status = 'PREPARED')::text
    from private.platform_account_deletion_jobs
    where target_user_id = '15330200-0000-4000-8000-000000000002'$$,
  array['true'::text],
  'administrator preparation creates a revisioned private job'
);
select results_eq(
  $$select count(*)::bigint from private.platform_admin_audit_log
    where target_user_id = '15330200-0000-4000-8000-000000000002'
      and action = 'ACCOUNT_DELETION_CONFIRMED'$$,
  array[1::bigint],
  'first exact confirmation appends one audit record'
);

set local role service_role;
select lives_ok(
  $$select * from public.prepare_platform_account_deletion(
      '15330100-0000-4000-8000-000000000001',
      '15330200-0000-4000-8000-000000000002',
      'ADMIN',
      'DELETE target153c'
    )$$,
  'same actor and mode may safely retry preparation'
);
reset role;
select results_eq(
  $$select revision from private.platform_account_deletion_jobs
    where target_user_id = '15330200-0000-4000-8000-000000000002'$$,
  array[2::bigint],
  'preparation retry increments the deletion revision'
);
select results_eq(
  $$select count(*)::bigint from private.platform_admin_audit_log
    where target_user_id = '15330200-0000-4000-8000-000000000002'
      and action = 'ACCOUNT_DELETION_CONFIRMED'$$,
  array[1::bigint],
  'preparation retry does not duplicate confirmation audit'
);

set local role authenticated;
set local request.jwt.claim.sub = '15330100-0000-4000-8000-000000000001';
select throws_ok(
  $$select public.cancel_platform_account_deletion(
      '15330200-0000-4000-8000-000000000002',
      'Too late to cancel after confirmation'
    )$$,
  '42501',
  'Deletion confirmation already accepted; retry irreversible deletion',
  'administrator cannot cancel after irreversible confirmation is accepted'
);

reset role;
select throws_ok(
  $$delete from auth.users where id = '15330200-0000-4000-8000-000000000002'$$,
  '42501',
  'Storage cleanup required before Auth user deletion',
  'hard Auth deletion is blocked before Storage cleanup completes'
);

reset role;
set local role service_role;
select lives_ok(
  $$select public.record_platform_account_deletion_failure(
      '15330100-0000-4000-8000-000000000001',
      '15330200-0000-4000-8000-000000000002',
      2,
      'STORAGE_CLEANUP_FAILED'
    )$$,
  'server can record a stable Storage cleanup failure'
);
reset role;
select results_eq(
  $$select last_error_code from private.platform_account_deletion_jobs
    where target_user_id = '15330200-0000-4000-8000-000000000002'$$,
  array['STORAGE_CLEANUP_FAILED'::text],
  'deletion failure remains retryable and inspectable without provider details'
);

set local role service_role;
select throws_ok(
  $$select public.mark_platform_account_deletion_storage_cleared(
      '15330100-0000-4000-8000-000000000001',
      '15330200-0000-4000-8000-000000000002',
      1
    )$$,
  '40001',
  'Stale or invalid account deletion job',
  'stale Storage completion cannot advance a newer deletion revision'
);
select lives_ok(
  $$select public.mark_platform_account_deletion_storage_cleared(
      '15330100-0000-4000-8000-000000000001',
      '15330200-0000-4000-8000-000000000002',
      2
    )$$,
  'current revision may record completed Storage cleanup'
);
reset role;
select results_eq(
  $$select (status = 'STORAGE_CLEARED' and storage_cleared_at is not null and last_error_code is null)::text
    from private.platform_account_deletion_jobs
    where target_user_id = '15330200-0000-4000-8000-000000000002'$$,
  array['true'::text],
  'Storage completion advances the job and clears prior failure state'
);

set local role service_role;
select throws_ok(
  $$delete from public.profiles where id = '15330200-0000-4000-8000-000000000002'$$,
  '42501',
  'Profile deletion must be coordinated through Auth',
  'direct profile deletion remains blocked even after Storage cleanup'
);

insert into public.scoring_events (user_id, scoring_date, event_type, amount)
values (
  '15330200-0000-4000-8000-000000000002',
  current_date,
  'LIFTING_WORKOUT',
  10
);

reset role;
select lives_ok(
  $$delete from auth.users where id = '15330200-0000-4000-8000-000000000002'$$,
  'prepared hard Auth deletion executes the profile/data cascade atomically'
);

reset role;
select results_eq(
  $$select count(*)::bigint from auth.users
    where id = '15330200-0000-4000-8000-000000000002'$$,
  array[0::bigint],
  'hard deletion removes the Auth user'
);
select results_eq(
  $$select count(*)::bigint from public.profiles
    where id = '15330200-0000-4000-8000-000000000002'$$,
  array[0::bigint],
  'Auth deletion cascades the public profile'
);
select results_eq(
  $$select count(*)::bigint from public.scoring_events
    where user_id = '15330200-0000-4000-8000-000000000002'$$,
  array[0::bigint],
  'authoritative scoring history follows the documented profile cascade'
);
select results_eq(
  $$select count(*)::bigint from public.group_members
    where user_id = '15330200-0000-4000-8000-000000000002'$$,
  array[0::bigint],
  'group membership and social visibility are removed by cascade'
);
select results_eq(
  $$select count(*)::bigint from public.groups
    where id = '15334000-0000-4000-8000-000000000004'$$,
  array[1::bigint],
  'deleting a member does not delete a group owned by someone else'
);
select results_eq(
  $$select count(*)::bigint from private.platform_account_state
    where user_id = '15330200-0000-4000-8000-000000000002'$$,
  array[0::bigint],
  'private account state follows the profile cascade'
);
select results_eq(
  $$select (status = 'COMPLETED' and completed_at is not null and auth_delete_started_at is not null)::text
    from private.platform_account_deletion_jobs
    where target_user_id = '15330200-0000-4000-8000-000000000002'$$,
  array['true'::text],
  'UUID-only deletion coordination is retained as completed'
);
select results_eq(
  $$select count(*)::bigint from private.platform_admin_audit_log
    where target_user_id = '15330200-0000-4000-8000-000000000002'
      and action = 'ACCOUNT_DELETED'$$,
  array[1::bigint],
  'append-only deletion audit survives profile/Auth deletion'
);
select results_eq(
  $$select (actor_user_id = '15330100-0000-4000-8000-000000000001'::uuid
      and target_user_id = '15330200-0000-4000-8000-000000000002'::uuid)::text
    from private.platform_admin_audit_log
    where target_user_id = '15330200-0000-4000-8000-000000000002'
      and action = 'ACCOUNT_DELETED'$$,
  array['true'::text],
  'retained audit keeps stable actor and target UUIDs without profile foreign keys'
);

set local role authenticated;
set local request.jwt.claim.sub = '15330400-0000-4000-8000-000000000004';
select throws_ok(
  $$select public.request_own_platform_account_deletion()$$,
  '42501',
  'Group ownership must be transferred before account deletion',
  'self-service deletion also requires group ownership transfer first'
);

select set_config('request.jwt.claim.sub', '15330100-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.request_own_platform_account_deletion()$$,
  '42501',
  'Platform administrator must be revoked before account deletion',
  'platform administrators cannot use self-deletion to bypass admin protection'
);

select set_config('request.jwt.claim.sub', '15330300-0000-4000-8000-000000000003', true);
select results_eq(
  $$select public.request_own_platform_account_deletion()$$,
  array['DELETE self153c'::text],
  'self-service first step returns the exact server-derived confirmation phrase'
);

reset role;
select results_eq(
  $$select (status = 'DELETION_PENDING'::public.platform_account_status
      and deletion_requested_by = user_id)::text
    from private.platform_account_state
    where user_id = '15330300-0000-4000-8000-000000000003'$$,
  array['true'::text],
  'self-service request records the caller as requester and blocks product access'
);

set local role service_role;
select lives_ok(
  $$select * from public.prepare_platform_account_deletion(
      '15330300-0000-4000-8000-000000000003',
      '15330300-0000-4000-8000-000000000003',
      'SELF',
      'DELETE self153c'
    )$$,
  'self-service exact confirmation prepares the same deletion engine'
);
select throws_ok(
  $$select public.cancel_own_platform_account_deletion(
      '15330300-0000-4000-8000-000000000003',
      'User tried cancelling after confirmation'
    )$$,
  '42501',
  'Deletion confirmation already accepted; retry irreversible deletion',
  'self-deletion cannot be cancelled after irreversible confirmation'
);
select lives_ok(
  $$select public.mark_platform_account_deletion_storage_cleared(
      '15330300-0000-4000-8000-000000000003',
      '15330300-0000-4000-8000-000000000003',
      1
    )$$,
  'self-service flow records Storage cleanup through the same boundary'
);
reset role;
select lives_ok(
  $$delete from auth.users where id = '15330300-0000-4000-8000-000000000003'$$,
  'self-service flow performs the same hard Auth/profile deletion'
);

reset role;
select results_eq(
  $$select (deletion_mode = 'SELF' and status = 'COMPLETED')::text
    from private.platform_account_deletion_jobs
    where target_user_id = '15330300-0000-4000-8000-000000000003'$$,
  array['true'::text],
  'self-service completion is retained without duplicating a deletion mechanism'
);
select results_eq(
  $$select count(*)::bigint from private.platform_admin_audit_log
    where target_user_id = '15330300-0000-4000-8000-000000000003'
      and action = 'ACCOUNT_DELETED'$$,
  array[1::bigint],
  'self-service hard deletion retains the same append-only audit event'
);

set local role authenticated;
set local request.jwt.claim.sub = '15330500-0000-4000-8000-000000000005';
select results_eq(
  $$select public.request_own_platform_account_deletion()$$,
  array['DELETE cancel153c'::text],
  'a user can begin a cancellable first-step self-deletion request'
);

reset role;
set local role service_role;
select results_eq(
  $$select public.cancel_own_platform_account_deletion(
      '15330500-0000-4000-8000-000000000005',
      'User cancelled account deletion'
    )::text$$,
  array['ACTIVE'::text],
  'server boundary can cancel self-deletion before exact confirmation'
);

reset role;
select results_eq(
  $$select (status = 'ACTIVE'::public.platform_account_status
      and deletion_requested_at is null
      and deletion_requested_by is null)::text
    from private.platform_account_state
    where user_id = '15330500-0000-4000-8000-000000000005'$$,
  array['true'::text],
  'self-cancellation restores a clean ACTIVE account'
);
select results_eq(
  $$select count(*)::bigint from private.platform_admin_audit_log
    where target_user_id = '15330500-0000-4000-8000-000000000005'
      and action = 'ACCOUNT_DELETION_CANCELLED'$$,
  array[1::bigint],
  'self-cancellation is append-only audited'
);

reset role;
select throws_ok(
  $$delete from auth.users where id = '15330600-0000-4000-8000-000000000006'$$,
  '42501',
  'Prepared account deletion required before Auth user deletion',
  'direct hard Auth deletion cannot bypass pending-state and preparation checks'
);

reset role;
select * from finish();
rollback;
