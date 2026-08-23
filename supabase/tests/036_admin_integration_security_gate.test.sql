begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

select results_eq(
  $$select count(*)::bigint
    from pg_default_acl d
    cross join lateral aclexplode(d.defaclacl) acl
    join pg_roles grantee on grantee.oid = acl.grantee
    where d.defaclrole = 'postgres'::regrole
      and d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype = 'f'
      and acl.privilege_type = 'EXECUTE'
      and grantee.rolname = 'anon'$$,
  array[0::bigint],
  'new public functions are not executable by anonymous callers by default'
);
select results_eq(
  $$select count(*)::bigint
    from pg_default_acl d
    cross join lateral aclexplode(d.defaclacl) acl
    join pg_roles grantee on grantee.oid = acl.grantee
    where d.defaclrole = 'postgres'::regrole
      and d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype = 'f'
      and acl.privilege_type = 'EXECUTE'
      and grantee.rolname = 'authenticated'$$,
  array[0::bigint],
  'new public functions require an explicit authenticated grant'
);
select results_eq(
  $$select count(*)::bigint
    from pg_default_acl d
    cross join lateral aclexplode(d.defaclacl) acl
    join pg_roles grantee on grantee.oid = acl.grantee
    where d.defaclrole = 'postgres'::regrole
      and d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype = 'f'
      and acl.privilege_type = 'EXECUTE'
      and grantee.rolname = 'service_role'$$,
  array[1::bigint],
  'service-role default function execution remains available for trusted backend coordination'
);

select results_eq(
  $$select count(*)::bigint
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f'
      and has_function_privilege('anon',p.oid,'EXECUTE')$$,
  array[0::bigint],
  'anonymous callers cannot execute any existing public function'
);
select results_eq(
  $$select count(*)::bigint
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f'
      and has_function_privilege('public',p.oid,'EXECUTE')$$,
  array[0::bigint],
  'PUBLIC has no implicit execution path to existing Data API functions'
);
select results_eq(
  $$select count(*)::bigint
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f'
      and pg_get_function_result(p.oid)='trigger'
      and has_function_privilege('authenticated',p.oid,'EXECUTE')$$,
  array[0::bigint],
  'authenticated callers cannot invoke trigger-only functions as RPCs'
);
select results_eq(
  $$select count(*)::bigint
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f' and p.prosecdef and p.proacl is null$$,
  array[0::bigint],
  'every public security-definer function has an explicit ACL'
);
select results_eq(
  $$select count(*)::bigint
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f' and p.prosecdef
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig,'{}'::text[])) setting
        where setting like 'search_path=%'
      )$$,
  array[0::bigint],
  'every public security-definer function pins its search path'
);

select is(has_function_privilege('authenticated','public.complete_onboarding(text,text,text,smallint)','execute'),true,'authenticated onboarding RPC remains explicitly reachable');
select is(has_function_privilege('authenticated','public.current_group_role(uuid)','execute'),true,'authenticated group policy helper remains explicitly reachable');
select is(has_function_privilege('authenticated','public.get_my_platform_access()','execute'),true,'authenticated self-access RPC remains explicitly reachable');
select is(has_function_privilege('authenticated','public.list_my_platform_messages(integer,integer,boolean)','execute'),true,'authenticated inbox RPC remains explicitly reachable');
select is(has_function_privilege('authenticated','public.submit_user_report(uuid,public.user_report_category,text,public.user_report_reference_type,uuid,text)','execute'),true,'authenticated reporting RPC remains explicitly reachable');
select is(has_function_privilege('authenticated','public.suspend_platform_account(uuid,text,timestamp with time zone)','execute'),false,'browser role cannot bypass the service-coordinated suspension boundary');
select is(has_function_privilege('authenticated','public.handle_new_auth_user()','execute'),false,'browser role cannot invoke the Auth profile trigger helper');
select is(has_function_privilege('service_role','public.suspend_platform_account(uuid,text,timestamp with time zone)','execute'),false,'historical direct suspension RPC remains sealed from every runtime role');
select is(has_schema_privilege('authenticated','private','usage'),false,'browser role retains no direct private operational-schema access');

insert into auth.users (id,email,last_sign_in_at) values
  ('15500100-0000-4000-8000-000000000001','active-admin-155@test.local',now()),
  ('15500200-0000-4000-8000-000000000002','suspended-admin-155@test.local',now()),
  ('15500300-0000-4000-8000-000000000003','ordinary-155@test.local',now()),
  ('15500400-0000-4000-8000-000000000004','group-owner-155@test.local',now());

update public.profiles
set username = case id
  when '15500100-0000-4000-8000-000000000001'::uuid then 'activeadmin155'
  when '15500200-0000-4000-8000-000000000002'::uuid then 'suspendedadmin155'
  when '15500300-0000-4000-8000-000000000003'::uuid then 'ordinary155'
  when '15500400-0000-4000-8000-000000000004'::uuid then 'groupowner155'
end
where id in (
  '15500100-0000-4000-8000-000000000001',
  '15500200-0000-4000-8000-000000000002',
  '15500300-0000-4000-8000-000000000003',
  '15500400-0000-4000-8000-000000000004'
);

insert into private.platform_admins(user_id,granted_by,grant_reason) values
  ('15500100-0000-4000-8000-000000000001',null,'Phase 15.5 active integration administrator'),
  ('15500200-0000-4000-8000-000000000002','15500100-0000-4000-8000-000000000001','Phase 15.5 suspended integration administrator');

insert into public.groups(id,name,created_by) values(
  '15500000-0000-4000-8000-000000000099',
  'Phase 15.5 Group Owner Fixture',
  '15500400-0000-4000-8000-000000000004'
);

update private.platform_account_state
set status='SUSPENDED',status_reason='Phase 15.5 suspension integration fixture'
where user_id='15500200-0000-4000-8000-000000000002';

insert into auth.sessions(id,user_id,created_at,updated_at,not_after) values(
  '15501200-0000-4000-8000-000000000002',
  '15500200-0000-4000-8000-000000000002',
  now(),now(),null
);

set local role authenticated;
set local request.jwt.claim.sub='15500300-0000-4000-8000-000000000003';
select throws_ok($$select * from public.get_platform_capacity_current()$$,'42501','Platform administrator required','ordinary user cannot read platform capacity');
select throws_ok($$select * from public.list_platform_accounts(null,null,1,25)$$,'42501','Platform administrator required','ordinary user cannot enumerate platform accounts');
select throws_ok($$select * from public.list_moderation_cases(null,null,1,25)$$,'42501','Platform administrator required','ordinary user cannot read the moderation queue');
select throws_ok($$select * from public.list_platform_messages(1,25)$$,'42501','Platform administrator required','ordinary user cannot read administrator message history');
select throws_ok($$select * from public.preview_platform_message_audience('ALL',null,null,'NOTICE')$$,'42501','Platform administrator required','ordinary user cannot resolve the global message audience');

set local request.jwt.claim.sub='15500400-0000-4000-8000-000000000004';
select throws_ok($$select * from public.get_platform_capacity_current()$$,'42501','Platform administrator required','group ownership does not grant platform administration');

set local request.jwt.claim.sub='15500200-0000-4000-8000-000000000002';
select results_eq(
  $$select account_status::text || '|' || is_platform_admin::text from public.get_my_platform_access()$$,
  array['SUSPENDED|false'::text],
  'suspended administrator is no longer authorized as a platform administrator'
);
select throws_ok(
  $$select * from public.list_platform_messages(1,25)$$,
  '42501','Active platform administrator required',
  'suspended administrator cannot read administrator message history'
);
select set_config(
  'request.jwt.claims',
  '{"sub":"15500200-0000-4000-8000-000000000002","role":"authenticated","session_id":"15501200-0000-4000-8000-000000000002"}',
  true
);
select throws_ok(
  $$select api_hooks.enforce_active_account_request()$$,
  '42501','Account or session is not active',
  'global Data API pre-request guard blocks a suspended account across every feature RPC'
);

set local request.jwt.claim.sub='15500100-0000-4000-8000-000000000001';
select lives_ok(
  $$select * from public.list_platform_messages(1,25)$$,
  'active platform administrator retains the integrated messaging boundary'
);

select * from finish();
rollback;
