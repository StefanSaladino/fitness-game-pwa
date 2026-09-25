begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_column(
  'public',
  'profiles',
  'tutorial_completed_version',
  'profiles persist the completed tutorial version'
);

select is(
  (select column_default::text
   from information_schema.columns
   where table_schema='public'
     and table_name='profiles'
     and column_name='tutorial_completed_version'),
  '0'::text,
  'tutorial completion defaults to zero'
);

select has_function(
  'public',
  'complete_my_tutorial',
  array['smallint'],
  'self-only tutorial completion RPC exists'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.complete_my_tutorial(smallint)',
    'execute'
  ),
  true,
  'authenticated users can complete their tutorial'
);

select is(
  has_function_privilege(
    'anon',
    'public.complete_my_tutorial(smallint)',
    'execute'
  ),
  false,
  'anonymous callers cannot complete tutorials'
);

select is(
  has_function_privilege(
    'public',
    'public.complete_my_tutorial(smallint)',
    'execute'
  ),
  false,
  'PUBLIC has no implicit tutorial-completion access'
);

select is(
  (select prosecdef
   from pg_proc
   where oid='public.complete_my_tutorial(smallint)'::regprocedure),
  true,
  'tutorial completion is an intentional security-definer boundary'
);

select is(
  (select proconfig = array['search_path=""']
   from pg_proc
   where oid='public.complete_my_tutorial(smallint)'::regprocedure),
  true,
  'tutorial RPC pins an empty search path'
);

insert into auth.users (id,email,last_sign_in_at) values
  ('20700000-0000-4000-8000-000000000001','phase207-tutorial@test.local',now());

update public.profiles
set username='phase207_tutorial',
    display_name='Phase 20.7 Tutorial',
    timezone='America/Toronto',
    weekly_workout_target=4,
    onboarding_completed_at=now()
where id='20700000-0000-4000-8000-000000000001';

select is(
  (select tutorial_completed_version
   from public.profiles
   where id='20700000-0000-4000-8000-000000000001'),
  0::smallint,
  'new/existing users begin with tutorial version zero'
);

set local role authenticated;
set local request.jwt.claim.sub='20700000-0000-4000-8000-000000000001';

select is(
  public.complete_my_tutorial(1::smallint),
  1::smallint,
  'active user can complete tutorial version one'
);

select is(
  public.complete_my_tutorial(1::smallint),
  1::smallint,
  'replaying/completing the same tutorial version is idempotent'
);

select throws_ok(
  $$select public.complete_my_tutorial(0::smallint)$$,
  '22023',
  'Tutorial version must be between 1 and 99',
  'invalid tutorial versions fail closed'
);

reset role;

select is(
  (select tutorial_completed_version
   from public.profiles
   where id='20700000-0000-4000-8000-000000000001'),
  1::smallint,
  'tutorial completion is persisted for the caller'
);

select * from finish();
rollback;
