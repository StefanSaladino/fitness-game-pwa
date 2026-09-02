begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_function(
  'private',
  'set_group_owner_canonical',
  array['uuid','uuid','uuid'],
  'canonical private group-owner transition helper exists'
);

select has_function(
  'private',
  'reassign_owned_groups_for_admin_deletion',
  array['uuid'],
  'admin deletion ownership fallback helper exists'
);

select is(
  has_function_privilege(
    'authenticated',
    'private.reassign_owned_groups_for_admin_deletion(uuid)',
    'execute'
  ),
  false,
  'browser role cannot invoke the private admin-deletion ownership fallback'
);

select is(
  has_function_privilege(
    'service_role',
    'private.reassign_owned_groups_for_admin_deletion(uuid)',
    'execute'
  ),
  false,
  'service role cannot bypass the guarded public deletion boundary through the private helper'
);

insert into auth.users (id, email, last_sign_in_at) values
  ('17800100-0000-4000-8000-000000000001', 'admin-178@test.local', now()),
  ('17800200-0000-4000-8000-000000000002', 'delete-owner-178@test.local', now()),
  ('17800300-0000-4000-8000-000000000003', 'member-178@test.local', now()),
  ('17800400-0000-4000-8000-000000000004', 'admin-member-178@test.local', now()),
  ('17800500-0000-4000-8000-000000000005', 'sole-owner-178@test.local', now()),
  ('17800600-0000-4000-8000-000000000006', 'manual-owner-178@test.local', now()),
  ('17800700-0000-4000-8000-000000000007', 'manual-target-178@test.local', now());

update public.profiles
set username = case id
  when '17800100-0000-4000-8000-000000000001'::uuid then 'admin178'
  when '17800200-0000-4000-8000-000000000002'::uuid then 'deleteowner178'
  when '17800300-0000-4000-8000-000000000003'::uuid then 'member178'
  when '17800400-0000-4000-8000-000000000004'::uuid then 'adminmember178'
  when '17800500-0000-4000-8000-000000000005'::uuid then 'soleowner178'
  when '17800600-0000-4000-8000-000000000006'::uuid then 'manualowner178'
  when '17800700-0000-4000-8000-000000000007'::uuid then 'manualtarget178'
end
where id in (
  '17800100-0000-4000-8000-000000000001',
  '17800200-0000-4000-8000-000000000002',
  '17800300-0000-4000-8000-000000000003',
  '17800400-0000-4000-8000-000000000004',
  '17800500-0000-4000-8000-000000000005',
  '17800600-0000-4000-8000-000000000006',
  '17800700-0000-4000-8000-000000000007'
);

insert into private.platform_admins(user_id, granted_by, grant_reason)
values (
  '17800100-0000-4000-8000-000000000001',
  null,
  'Phase 17.8 deletion fallback administrator'
);

insert into public.groups(id, name, created_by) values
  (
    '17801000-0000-4000-8000-000000000010',
    'Phase 17.8 fallback group',
    '17800200-0000-4000-8000-000000000002'
  ),
  (
    '17801100-0000-4000-8000-000000000011',
    'Phase 17.8 sole-owner group',
    '17800500-0000-4000-8000-000000000005'
  ),
  (
    '17801200-0000-4000-8000-000000000012',
    'Phase 17.8 manual-transfer group',
    '17800600-0000-4000-8000-000000000006'
  );

insert into public.group_members(group_id, user_id, role, status, joined_at) values
  (
    '17801000-0000-4000-8000-000000000010',
    '17800300-0000-4000-8000-000000000003',
    'MEMBER',
    'ACTIVE',
    now() - interval '2 days'
  ),
  (
    '17801000-0000-4000-8000-000000000010',
    '17800400-0000-4000-8000-000000000004',
    'ADMIN',
    'ACTIVE',
    now() - interval '1 day'
  ),
  (
    '17801200-0000-4000-8000-000000000012',
    '17800700-0000-4000-8000-000000000007',
    'MEMBER',
    'ACTIVE',
    now()
  );

set local role authenticated;
set local request.jwt.claim.sub = '17800600-0000-4000-8000-000000000006';

select lives_ok(
  $$select public.transfer_group_ownership(
      '17801200-0000-4000-8000-000000000012',
      '17800700-0000-4000-8000-000000000007'
    )$$,
  'manual ownership transfer remains available to the current owner'
);

reset role;
select results_eq(
  $$select
      g.created_by::text || '|' ||
      previous.role::text || '|' ||
      successor.role::text
    from public.groups g
    join public.group_members previous
      on previous.group_id = g.id
     and previous.user_id = '17800600-0000-4000-8000-000000000006'
    join public.group_members successor
      on successor.group_id = g.id
     and successor.user_id = '17800700-0000-4000-8000-000000000007'
    where g.id = '17801200-0000-4000-8000-000000000012'$$,
  array[
    '17800700-0000-4000-8000-000000000007|ADMIN|OWNER'::text
  ],
  'manual transfer updates both role state and the canonical groups.created_by owner reference'
);

set local role authenticated;
set local request.jwt.claim.sub = '17800100-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.request_platform_account_deletion(
      '17800200-0000-4000-8000-000000000002',
      'Phase 17.8 admin deletion ownership fallback'
    )$$,
  'admin deletion automatically transfers owned groups when an eligible successor exists'
);

reset role;
select results_eq(
  $$select
      g.created_by::text || '|' ||
      previous.role::text || '|' ||
      successor.role::text
    from public.groups g
    join public.group_members previous
      on previous.group_id = g.id
     and previous.user_id = '17800200-0000-4000-8000-000000000002'
    join public.group_members successor
      on successor.group_id = g.id
     and successor.user_id = '17800400-0000-4000-8000-000000000004'
    where g.id = '17801000-0000-4000-8000-000000000010'$$,
  array[
    '17800400-0000-4000-8000-000000000004|ADMIN|OWNER'::text
  ],
  'fallback prefers an active ADMIN over an older MEMBER and updates the canonical owner reference'
);

select results_eq(
  $$select status::text
    from private.platform_account_state
    where user_id = '17800200-0000-4000-8000-000000000002'$$,
  array['DELETION_PENDING'::text],
  'owner account enters deletion pending only after ownership transfer succeeds'
);

select results_eq(
  $$select after_state ->> 'auto_transferred_group_count'
    from private.platform_admin_audit_log
    where target_user_id = '17800200-0000-4000-8000-000000000002'
      and action = 'ACCOUNT_DELETION_REQUESTED'$$,
  array['1'::text],
  'admin deletion audit records the number of automatically transferred groups'
);

set local role authenticated;
set local request.jwt.claim.sub = '17800100-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.request_platform_account_deletion(
      '17800500-0000-4000-8000-000000000005',
      'Sole owner must remain fail closed'
    )$$,
  '42501',
  'Owned group has no active successor; transfer ownership or remove the group before account deletion',
  'admin deletion remains blocked when no eligible active successor exists'
);

reset role;
select results_eq(
  $$select
      g.created_by::text || '|' || pas.status::text
    from public.groups g
    join private.platform_account_state pas
      on pas.user_id = g.created_by
    where g.id = '17801100-0000-4000-8000-000000000011'$$,
  array[
    '17800500-0000-4000-8000-000000000005|ACTIVE'::text
  ],
  'failed fallback leaves sole-owner group ownership and account state unchanged'
);

select * from finish();
rollback;
