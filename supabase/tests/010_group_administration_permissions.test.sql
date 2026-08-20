begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select is(has_function_privilege('authenticated','public.create_group_invite(uuid,text)','execute'),true,'authenticated can execute create_group_invite');
select is(has_function_privilege('anon','public.create_group_invite(uuid,text)','execute'),false,'anon cannot execute create_group_invite');
select is(has_function_privilege('authenticated','public.remove_group_member(uuid,uuid)','execute'),true,'authenticated can execute remove_group_member');
select is(has_function_privilege('anon','public.remove_group_member(uuid,uuid)','execute'),false,'anon cannot execute remove_group_member');
select is(has_function_privilege('authenticated','public.set_group_member_role(uuid,uuid,public.group_role)','execute'),true,'authenticated can execute set_group_member_role');
select is(has_function_privilege('anon','public.set_group_member_role(uuid,uuid,public.group_role)','execute'),false,'anon cannot execute set_group_member_role');
select is(has_function_privilege('authenticated','public.transfer_group_ownership(uuid,uuid)','execute'),true,'authenticated can execute transfer_group_ownership');
select is(has_function_privilege('anon','public.transfer_group_ownership(uuid,uuid)','execute'),false,'anon cannot execute transfer_group_ownership');
select is(has_function_privilege('authenticated','public.leave_group(uuid)','execute'),true,'authenticated can execute leave_group');
select is(has_function_privilege('anon','public.leave_group(uuid)','execute'),false,'anon cannot execute leave_group');
select * from finish();
rollback;
