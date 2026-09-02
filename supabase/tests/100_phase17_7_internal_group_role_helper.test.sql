begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select is(
  has_function_privilege('public', 'public.group_role_for_user(uuid,uuid)', 'execute'),
  false,
  'PUBLIC cannot execute the internal group-role helper'
);

select is(
  has_function_privilege('anon', 'public.group_role_for_user(uuid,uuid)', 'execute'),
  false,
  'anonymous callers cannot execute the internal group-role helper'
);

select is(
  has_function_privilege('authenticated', 'public.group_role_for_user(uuid,uuid)', 'execute'),
  false,
  'authenticated callers cannot invoke the RLS-bypassing internal group-role helper directly'
);

select is(
  has_function_privilege('service_role', 'public.group_role_for_user(uuid,uuid)', 'execute'),
  true,
  'trusted service-role execution remains unchanged'
);

select is(
  has_function_privilege('authenticated', 'public.remove_group_member(uuid,uuid)', 'execute'),
  true,
  'authenticated callers retain the guarded group-member administration RPC'
);

select is(
  has_function_privilege('authenticated', 'public.create_group_invite(uuid,text)', 'execute'),
  true,
  'authenticated callers retain the guarded group-invite RPC'
);

select * from finish();
rollback;
