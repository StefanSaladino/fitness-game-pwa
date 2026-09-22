begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

select has_table('public','training_program_profiles','training program profile table exists');
select has_column('public','training_program_profiles','user_id','training program profile is user-owned');
select has_column('public','training_program_profiles','access_mode','training access mode is persisted');
select has_column('public','training_program_profiles','equipment_keys','explicit equipment keys are persisted');
select has_column('public','training_program_profiles','revision','profile revision supports conflict-safe updates');
select is((select relrowsecurity from pg_class where oid='public.training_program_profiles'::regclass),true,'training program profiles enforce RLS');
select is(has_table_privilege('authenticated','public.training_program_profiles','select'),true,'authenticated callers can read their RLS-scoped profile');
select is(has_table_privilege('authenticated','public.training_program_profiles','insert'),false,'authenticated callers cannot insert program profiles directly');
select is(has_table_privilege('authenticated','public.training_program_profiles','update'),false,'authenticated callers cannot update program profiles directly');
select is(has_table_privilege('anon','public.training_program_profiles','select'),false,'anonymous callers cannot read program profiles');
select has_function(
  'public',
  'update_my_training_program_access_profile',
  array['text','text[]','bigint'],
  'self-only training program access RPC exists'
);
select is(
  has_function_privilege('authenticated','public.update_my_training_program_access_profile(text,text[],bigint)','execute'),
  true,
  'authenticated users can execute the access-profile RPC'
);
select is(
  has_function_privilege('anon','public.update_my_training_program_access_profile(text,text[],bigint)','execute'),
  false,
  'anonymous callers cannot execute the access-profile RPC'
);
select is(
  has_function_privilege('public','public.update_my_training_program_access_profile(text,text[],bigint)','execute'),
  false,
  'PUBLIC receives no implicit access-profile RPC execution'
);

insert into auth.users (id,email,last_sign_in_at) values
  ('20100100-0000-4000-8000-000000000001','phase201-owner@test.local',now()),
  ('20100200-0000-4000-8000-000000000002','phase201-other@test.local',now());

update public.profiles
set username = case id
      when '20100100-0000-4000-8000-000000000001'::uuid then 'phase201_owner'
      else 'phase201_other'
    end,
    display_name = 'Phase 20.1 fixture',
    timezone = 'America/Toronto',
    weekly_workout_target = 3,
    onboarding_completed_at = now()
where id in (
  '20100100-0000-4000-8000-000000000001',
  '20100200-0000-4000-8000-000000000002'
);

insert into public.training_program_profiles(user_id,access_mode,equipment_keys)
values (
  '20100200-0000-4000-8000-000000000002',
  'CUSTOM',
  array['DUMBBELLS']::text[]
);

select results_eq(
  $$select count(*)::bigint from public.training_program_profiles where user_id='20100100-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'no access profile is silently created before the user configures it'
);

set local role authenticated;
set local request.jwt.claim.sub = '20100100-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.update_my_training_program_access_profile(' custom ',array['bands','DUMBBELLS','bands'],0)$$,
  'active user can create an explicit custom equipment profile'
);
select is(
  (select access_mode='CUSTOM'
      and equipment_keys=array['BANDS','DUMBBELLS']::text[]
      and revision=1
    from public.training_program_profiles
    where user_id='20100100-0000-4000-8000-000000000001'),
  true,
  'server normalizes and deduplicates equipment keys with revision one'
);
select results_eq(
  $$select count(*)::bigint from public.training_program_profiles$$,
  array[1::bigint],
  'RLS exposes only the current users training program profile'
);
select results_eq(
  $$select count(*)::bigint from public.training_program_profiles where user_id='20100200-0000-4000-8000-000000000002'$$,
  array[0::bigint],
  'RLS hides another users training program profile'
);
select lives_ok(
  $$select public.update_my_training_program_access_profile('COMMERCIAL_GYM','{}'::text[],1)$$,
  'current revision can switch the profile to commercial-gym access'
);
select is(
  (select access_mode='COMMERCIAL_GYM'
      and equipment_keys='{}'::text[]
      and revision=2
    from public.training_program_profiles
    where user_id='20100100-0000-4000-8000-000000000001'),
  true,
  'commercial-gym mode stores no custom equipment keys and increments revision'
);
select throws_ok(
  $$select public.update_my_training_program_access_profile('CUSTOM',array['DUMBBELLS'],1)$$,
  '40001',
  'Training program access profile changed. Reload and try again.',
  'stale revisions fail closed'
);
select throws_ok(
  $$select public.update_my_training_program_access_profile('CUSTOM',array['ALIEN_MACHINE'],2)$$,
  '22023',
  'Training program equipment selection contains an unsupported key',
  'unknown equipment keys fail closed'
);
select throws_ok(
  $$select public.update_my_training_program_access_profile('COMMERCIAL_GYM',array['DUMBBELLS'],2)$$,
  '22023',
  'Commercial gym access must not store custom equipment selections',
  'commercial-gym mode cannot carry an explicit custom list'
);

reset role;

update private.platform_account_state
set status='SUSPENDED',status_reason='Phase 20.1 suspension fixture'
where user_id='20100100-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claim.sub = '20100100-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.update_my_training_program_access_profile('CUSTOM',array['DUMBBELLS'],2)$$,
  '42501',
  'Account is not active',
  'suspended users cannot update training program access'
);

reset role;

select is(
  (select prosecdef
   from pg_proc
   where oid='public.update_my_training_program_access_profile(text,text[],bigint)'::regprocedure),
  true,
  'access-profile RPC is an intentional security-definer boundary'
);
select is(
  (select proconfig = array['search_path=""']
   from pg_proc
   where oid='public.update_my_training_program_access_profile(text,text[],bigint)'::regprocedure),
  true,
  'access-profile RPC pins an empty search path'
);

select * from finish();
rollback;
