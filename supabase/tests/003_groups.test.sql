begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values
  ('61111111-1111-4111-8111-111111111111', 'g-owner@test.local'),
  ('62222222-2222-4222-8222-222222222222', 'g-member@test.local'),
  ('63333333-3333-4333-8333-333333333333', 'g-third@test.local');

insert into public.groups (id, name, created_by)
values ('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Expandable Group', '61111111-1111-4111-8111-111111111111');

select results_eq(
  $$select count(*) from public.group_members where group_id='6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and role='OWNER' and status='ACTIVE'$$,
  array[1::bigint], 'group creator automatically becomes the single active owner'
);

-- Add eight more users directly to prove the schema/group has no four-member assumption.
insert into auth.users (id, email)
select md5('extra-' || g)::uuid, 'extra-' || g || '@test.local'
from generate_series(1, 8) g;

insert into public.group_members (group_id, user_id, role, status)
select '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', md5('extra-' || g)::uuid, 'MEMBER', 'ACTIVE'
from generate_series(1, 8) g;

select results_eq(
  $$select count(*) from public.group_members where group_id='6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and status='ACTIVE'$$,
  array[9::bigint], 'group accepts more than four members before invite join'
);

insert into public.group_invites (id, group_id, created_by, token, max_uses)
values ('6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '61111111-1111-4111-8111-111111111111', '6ccccccc-cccc-4ccc-8ccc-cccccccccccc', 25);

set local role authenticated;
set local request.jwt.claim.sub = '62222222-2222-4222-8222-222222222222';
select lives_ok($$select public.join_group_by_invite('6ccccccc-cccc-4ccc-8ccc-cccccccccccc')$$, 'member can join with valid invite');
select results_eq(
  $$select count(*) from public.group_members where group_id='6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and user_id='62222222-2222-4222-8222-222222222222' and status='ACTIVE'$$,
  array[1::bigint], 'invite creates one active membership'
);
select lives_ok($$select public.join_group_by_invite('6ccccccc-cccc-4ccc-8ccc-cccccccccccc')$$, 'reusing invite while already active is idempotent');

set local request.jwt.claim.sub = '61111111-1111-4111-8111-111111111111';
select results_eq(
  $$select use_count from public.group_invites where id='6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  array[1], 'idempotent rejoin does not consume another invite use'
);
select results_eq(
  $$select count(*) from public.group_members where group_id='6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and status='ACTIVE'$$,
  array[10::bigint], 'invited member expands group to ten active members'
);
set local request.jwt.claim.sub = '63333333-3333-4333-8333-333333333333';
select throws_ok(
  $$select public.set_group_member_role('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','62222222-2222-4222-8222-222222222222','ADMIN')$$,
  '42501', 'Only the owner can change roles', 'outsider cannot change group roles'
);
select throws_ok(
  $$select public.transfer_group_ownership('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','62222222-2222-4222-8222-222222222222')$$,
  '42501', 'Only the owner can transfer ownership', 'outsider cannot transfer ownership'
);

set local request.jwt.claim.sub = '61111111-1111-4111-8111-111111111111';
select lives_ok($$select public.set_group_member_role('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','62222222-2222-4222-8222-222222222222','ADMIN')$$, 'owner can promote member to admin');

set local request.jwt.claim.sub = '62222222-2222-4222-8222-222222222222';
select throws_ok(
  $$select public.remove_group_member('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','61111111-1111-4111-8111-111111111111')$$,
  '42501', 'Owner cannot be removed', 'admin cannot remove owner'
);

set local request.jwt.claim.sub = '61111111-1111-4111-8111-111111111111';
select lives_ok($$select public.transfer_group_ownership('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','62222222-2222-4222-8222-222222222222')$$, 'owner can transfer ownership');
select results_eq(
  $$select count(*) from public.group_members where group_id='6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and role='OWNER' and status='ACTIVE'$$,
  array[1::bigint], 'ownership transfer preserves exactly one active owner'
);

select * from finish();
rollback;
