begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

select has_column(
  'public',
  'training_program_profiles',
  'goal',
  'program goal is persisted'
);
select has_column(
  'public',
  'training_program_profiles',
  'sessions_per_week',
  'program frequency is persisted'
);
select has_function(
  'public',
  'update_my_training_program_generation_preferences',
  array['text','integer','bigint'],
  'program preference update RPC exists'
);
select has_function(
  'public',
  'get_my_training_program_candidate_catalog',
  array[]::text[],
  'program candidate catalogue RPC exists'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.update_my_training_program_generation_preferences(text,integer,bigint)',
    'execute'
  ),
  true,
  'authenticated users can update generation preferences'
);
select is(
  has_function_privilege(
    'anon',
    'public.update_my_training_program_generation_preferences(text,integer,bigint)',
    'execute'
  ),
  false,
  'anonymous users cannot update generation preferences'
);
select is(
  has_function_privilege(
    'public',
    'public.update_my_training_program_generation_preferences(text,integer,bigint)',
    'execute'
  ),
  false,
  'PUBLIC has no implicit preference RPC access'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.get_my_training_program_candidate_catalog()',
    'execute'
  ),
  true,
  'authenticated users can load generator candidates'
);
select is(
  has_function_privilege(
    'anon',
    'public.get_my_training_program_candidate_catalog()',
    'execute'
  ),
  false,
  'anonymous users cannot load generator candidates'
);
select is(
  has_function_privilege(
    'public',
    'public.get_my_training_program_candidate_catalog()',
    'execute'
  ),
  false,
  'PUBLIC has no implicit candidate RPC access'
);

insert into auth.users(id,email,last_sign_in_at) values
  ('20200100-0000-4000-8000-000000000001','phase202-owner@test.local',now()),
  ('20200200-0000-4000-8000-000000000002','phase202-no-profile@test.local',now()),
  ('20200300-0000-4000-8000-000000000003','phase202-suspended@test.local',now());

update public.profiles
set username = case id
      when '20200100-0000-4000-8000-000000000001'::uuid then 'phase202_owner'
      when '20200200-0000-4000-8000-000000000002'::uuid then 'phase202_none'
      else 'phase202_suspended'
    end,
    display_name='Phase 20.2 fixture',
    timezone='America/Toronto',
    weekly_workout_target=4,
    onboarding_completed_at=now()
where id in (
  '20200100-0000-4000-8000-000000000001',
  '20200200-0000-4000-8000-000000000002',
  '20200300-0000-4000-8000-000000000003'
);

insert into public.training_program_profiles(
  user_id,
  access_mode,
  equipment_keys,
  revision
)
values
  (
    '20200100-0000-4000-8000-000000000001',
    'CUSTOM',
    array['DUMBBELLS','BENCH']::text[],
    1
  ),
  (
    '20200300-0000-4000-8000-000000000003',
    'CUSTOM',
    array['DUMBBELLS']::text[],
    1
  );

set local role authenticated;
set local request.jwt.claim.sub='20200100-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.update_my_training_program_generation_preferences(' hypertrophy ',4,1)$$,
  'active user can save explicit program goal and frequency'
);
select is(
  (
    select goal='HYPERTROPHY'
      and sessions_per_week=4
      and revision=2
    from public.training_program_profiles
    where user_id='20200100-0000-4000-8000-000000000001'
  ),
  true,
  'goal and frequency normalize and increment the shared profile revision'
);
select throws_ok(
  $$select public.update_my_training_program_generation_preferences('BALANCED',3,1)$$,
  '40001',
  'Training program profile changed. Reload and try again.',
  'stale generation preference revisions fail closed'
);
select throws_ok(
  $$select public.update_my_training_program_generation_preferences('POWER',3,2)$$,
  '22023',
  'Training program goal must be STRENGTH, HYPERTROPHY, or BALANCED',
  'unsupported goals fail closed'
);
select throws_ok(
  $$select public.update_my_training_program_generation_preferences('BALANCED',7,2)$$,
  '22023',
  'Training program sessions per week must be between 1 and 6',
  'unsupported weekly frequency fails closed'
);

select results_eq(
  $$select count(*)::bigint from public.get_my_training_program_candidate_catalog()$$,
  array[512::bigint],
  'candidate read model exposes the locked 512 active normally loggable exercises'
);
select results_eq(
  $$select count(*)::bigint
    from public.get_my_training_program_candidate_catalog()
    where volume_eligible$$,
  array[418::bigint],
  'candidate read model preserves the locked 418 muscle-volume-v1 eligible exercises'
);
select results_eq(
  $$select count(*)::bigint
    from public.get_my_training_program_candidate_catalog()
    where volume_eligible
      and pg_catalog.jsonb_array_length(contributions)=0$$,
  array[0::bigint],
  'every volume eligible candidate carries reviewed muscle contributions'
);
select results_eq(
  $$select count(*)::bigint
    from public.get_my_training_program_candidate_catalog()
    where measurement_type not in ('WEIGHT_REPS','BODYWEIGHT_REPS')$$,
  array[0::bigint],
  'candidate RPC excludes deferred DURATION and OTHER logging types'
);

set local request.jwt.claim.sub='20200200-0000-4000-8000-000000000002';

select throws_ok(
  $$select public.update_my_training_program_generation_preferences('BALANCED',3,1)$$,
  '22023',
  'Configure training equipment access before program preferences',
  'generation preferences cannot silently create an equipment profile'
);

reset role;

update private.platform_account_state
set status='SUSPENDED',
    status_reason='Phase 20.2 suspension fixture'
where user_id='20200300-0000-4000-8000-000000000003';

set local role authenticated;
set local request.jwt.claim.sub='20200300-0000-4000-8000-000000000003';

select throws_ok(
  $$select public.update_my_training_program_generation_preferences('BALANCED',3,1)$$,
  '42501',
  'Account is not active',
  'suspended users cannot update generation preferences'
);
select throws_ok(
  $$select count(*) from public.get_my_training_program_candidate_catalog()$$,
  '42501',
  'Account is not active',
  'suspended users cannot load generator candidates'
);

reset role;

select is(
  (
    select prosecdef
    from pg_proc
    where oid='public.update_my_training_program_generation_preferences(text,integer,bigint)'::regprocedure
  ),
  true,
  'preference RPC is an intentional security definer boundary'
);
select is(
  (
    select proconfig=array['search_path=""']
    from pg_proc
    where oid='public.update_my_training_program_generation_preferences(text,integer,bigint)'::regprocedure
  ),
  true,
  'preference RPC pins an empty search path'
);
select is(
  (
    select prosecdef
    from pg_proc
    where oid='public.get_my_training_program_candidate_catalog()'::regprocedure
  ),
  true,
  'candidate RPC is an intentional security definer boundary'
);
select is(
  (
    select proconfig=array['search_path=""']
    from pg_proc
    where oid='public.get_my_training_program_candidate_catalog()'::regprocedure
  ),
  true,
  'candidate RPC pins an empty search path'
);

select results_eq(
  $$select count(*)::bigint
    from public.training_program_profiles
    where goal is null
      and sessions_per_week is not null$$,
  array[0::bigint],
  'profile never stores frequency without a goal'
);
select results_eq(
  $$select count(*)::bigint
    from public.training_program_profiles
    where goal is not null
      and sessions_per_week is null$$,
  array[0::bigint],
  'profile never stores goal without frequency'
);

select * from finish();
rollback;
