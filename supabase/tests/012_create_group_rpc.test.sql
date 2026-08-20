begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('a1111111-1111-4111-8111-111111111111', 'create-group-owner@test.local'),
  ('a2222222-2222-4222-8222-222222222222', 'create-group-other@test.local');

select ok(
  to_regprocedure('public.create_group(text)') is not null,
  'create_group RPC exists'
);

select ok(
  has_function_privilege('authenticated', 'public.create_group(text)', 'execute'),
  'authenticated can execute create_group'
);

select ok(
  not has_function_privilege('anon', 'public.create_group(text)', 'execute'),
  'anon cannot execute create_group'
);

select ok(
  not has_table_privilege('authenticated', 'public.groups', 'insert'),
  'authenticated cannot insert directly into groups'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a1111111-1111-4111-8111-111111111111';

select lives_ok(
  $$select public.create_group('  Heavy   Crew  ')$$,
  'authenticated user can create a group through the RPC'
);

reset role;

select results_eq(
  $$select count(*) from public.groups where created_by='a1111111-1111-4111-8111-111111111111' and name='Heavy Crew'$$,
  array[1::bigint],
  'RPC normalizes and creates exactly one group for the caller'
);

select results_eq(
  $$select count(*) from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where g.created_by='a1111111-1111-4111-8111-111111111111'
      and gm.user_id='a1111111-1111-4111-8111-111111111111'
      and gm.role='OWNER' and gm.status='ACTIVE'$$,
  array[1::bigint],
  'group creator becomes the active owner'
);

select results_eq(
  $$select count(*) from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where g.created_by='a1111111-1111-4111-8111-111111111111' and gm.status='ACTIVE'$$,
  array[1::bigint],
  'new group begins with exactly one active member'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a2222222-2222-4222-8222-222222222222';

select throws_ok(
  $$insert into public.groups (name, created_by) values ('Forbidden direct insert', 'a2222222-2222-4222-8222-222222222222')$$,
  '42501',
  null,
  'direct authenticated insert is denied'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a2222222-2222-4222-8222-222222222222';

select throws_ok(
  $$select public.create_group('   ')$$,
  '22023',
  'Group name must be between 1 and 80 characters',
  'create_group rejects an empty normalized group name'
);

select * from finish();
rollback;
