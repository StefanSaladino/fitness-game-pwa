begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

select has_table('public','training_program_constraints','constraint revision table exists');
select has_table('public','training_program_exercise_constraints','exercise constraint table exists');

select is(
  (select relrowsecurity from pg_class where oid='public.training_program_constraints'::regclass),
  true,
  'constraint revision table enforces RLS'
);
select is(
  (select relrowsecurity from pg_class where oid='public.training_program_exercise_constraints'::regclass),
  true,
  'exercise constraint table enforces RLS'
);

select is(has_table_privilege('authenticated','public.training_program_constraints','select'),true,'authenticated can read own constraint revision');
select is(has_table_privilege('authenticated','public.training_program_exercise_constraints','select'),true,'authenticated can read own exercise constraints');
select is(has_table_privilege('authenticated','public.training_program_constraints','insert'),false,'authenticated cannot insert constraint revision directly');
select is(has_table_privilege('authenticated','public.training_program_exercise_constraints','insert'),false,'authenticated cannot insert exercise constraints directly');
select is(has_table_privilege('authenticated','public.training_program_exercise_constraints','update'),false,'authenticated cannot update exercise constraints directly');
select is(has_table_privilege('authenticated','public.training_program_exercise_constraints','delete'),false,'authenticated cannot delete exercise constraints directly');

select has_function('public','get_my_training_program_constraints',array[]::text[],'constraint read RPC exists');
select has_function('public','replace_my_training_program_exercise_constraints',array['jsonb','bigint'],'constraint replace RPC exists');

select is(has_function_privilege('authenticated','public.get_my_training_program_constraints()','execute'),true,'authenticated can read constraint snapshot');
select is(has_function_privilege('anon','public.get_my_training_program_constraints()','execute'),false,'anon cannot read constraint snapshot');
select is(has_function_privilege('public','public.get_my_training_program_constraints()','execute'),false,'PUBLIC has no implicit read RPC access');

select is(has_function_privilege('authenticated','public.replace_my_training_program_exercise_constraints(jsonb,bigint)','execute'),true,'authenticated can replace constraints');
select is(has_function_privilege('anon','public.replace_my_training_program_exercise_constraints(jsonb,bigint)','execute'),false,'anon cannot replace constraints');
select is(has_function_privilege('public','public.replace_my_training_program_exercise_constraints(jsonb,bigint)','execute'),false,'PUBLIC has no implicit replace RPC access');

select ok(
  exists(
    select 1
    from pg_constraint
    where conrelid='public.training_program_exercise_constraints'::regclass
      and pg_get_constraintdef(oid) like '%FOREIGN KEY (exercise_id)%ON DELETE RESTRICT%'
  ),
  'exercise constraints do not cascade-delete when a catalogue exercise is removed'
);

select ok(
  exists(
    select 1
    from pg_constraint
    where conrelid='public.training_program_exercise_constraints'::regclass
      and conname='training_program_preference_reason_check'
  ),
  'preference reason check exists'
);

insert into auth.users(id,email,last_sign_in_at) values
  ('20300101-1111-4111-8111-111111111111','phase203-owner@test.local',now()),
  ('20300202-2222-4222-8222-222222222222','phase203-other@test.local',now()),
  ('20300303-3333-4333-8333-333333333333','phase203-suspended@test.local',now());

update public.profiles
set username = case id
      when '20300101-1111-4111-8111-111111111111'::uuid then 'phase203_owner'
      when '20300202-2222-4222-8222-222222222222'::uuid then 'phase203_other'
      else 'phase203_suspended'
    end,
    display_name='Phase 20.3 fixture',
    timezone='America/Toronto',
    weekly_workout_target=4,
    onboarding_completed_at=now()
where id in (
  '20300101-1111-4111-8111-111111111111',
  '20300202-2222-4222-8222-222222222222',
  '20300303-3333-4333-8333-333333333333'
);

insert into public.training_program_constraints(user_id,revision)
values ('20300202-2222-4222-8222-222222222222',1);

insert into public.training_program_exercise_constraints(
  user_id, exercise_id, constraint_kind, reason
)
select
  '20300202-2222-4222-8222-222222222222',
  id,
  'EXCLUDE',
  'OTHER'
from public.exercise_catalog
where canonical_name='Deadlift'
limit 1;

set local role authenticated;
set local request.jwt.claim.sub='20300101-1111-4111-8111-111111111111';

select is((public.get_my_training_program_constraints()->>'revision')::bigint,0::bigint,'missing constraint row reads as revision zero');
select is(pg_catalog.jsonb_array_length(public.get_my_training_program_constraints()->'entries'),0,'missing constraint row reads as empty entries');

select lives_ok(
  $test$
  select public.replace_my_training_program_exercise_constraints(
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'exerciseId',(select id from public.exercise_catalog where canonical_name='Lat Pulldown' limit 1),
        'kind','PREFER','reason','PREFERENCE'
      ),
      pg_catalog.jsonb_build_object(
        'exerciseId',(select id from public.exercise_catalog where canonical_name='Barbell Bench Press' limit 1),
        'kind','EXCLUDE','reason','PHYSICAL_LIMITATION'
      )
    ),
    0
  )
  $test$,
  'active user can create explicit constraint snapshot'
);

select is((public.get_my_training_program_constraints()->>'revision')::bigint,1::bigint,'first persisted snapshot starts at revision one');
select is(pg_catalog.jsonb_array_length(public.get_my_training_program_constraints()->'entries'),2,'snapshot returns both entries');

select results_eq(
  $$select count(*)::bigint from public.training_program_exercise_constraints where constraint_kind='PREFER' and reason='PREFERENCE'$$,
  array[1::bigint],
  'preferred exercise is visible to owner'
);

select results_eq(
  $$select count(*)::bigint from public.training_program_exercise_constraints where constraint_kind='EXCLUDE' and reason='PHYSICAL_LIMITATION'$$,
  array[1::bigint],
  'physical limitation persists only as bounded exclusion intent'
);

select results_eq(
  $$select count(*)::bigint from public.training_program_exercise_constraints where user_id='20300202-2222-4222-8222-222222222222'$$,
  array[0::bigint],
  'RLS hides another users constraints'
);

select throws_ok(
  $$select public.replace_my_training_program_exercise_constraints('[]'::jsonb,0)$$,
  '40001',
  'Training program constraints changed. Reload and try again.',
  'stale revision fails closed'
);

select throws_ok(
  $test$
  select public.replace_my_training_program_exercise_constraints(
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'exerciseId',(select id from public.exercise_catalog where canonical_name='Back Squat' limit 1),
        'kind','EXCLUDE','reason','OTHER'
      ),
      pg_catalog.jsonb_build_object(
        'exerciseId',(select id from public.exercise_catalog where canonical_name='Back Squat' limit 1),
        'kind','PREFER','reason','PREFERENCE'
      )
    ),
    1
  )
  $test$,
  '22023',
  'Training program constraints cannot repeat an exercise',
  'duplicate exercise constraints fail closed'
);

select throws_ok(
  $test$
  select public.replace_my_training_program_exercise_constraints(
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'exerciseId',(select id from public.exercise_catalog where canonical_name='Back Squat' limit 1),
        'kind','PREFER','reason','PHYSICAL_LIMITATION'
      )
    ),
    1
  )
  $test$,
  '22023',
  'Training program constraints contain an invalid entry',
  'soft preference cannot carry physical-limitation reason'
);

select throws_ok(
  $test$
  select public.replace_my_training_program_exercise_constraints(
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'exerciseId',(select id from public.exercise_catalog where canonical_name='Back Squat' limit 1),
        'kind','EXCLUDE','reason','OTHER',
        'diagnosis','do not persist this'
      )
    ),
    1
  )
  $test$,
  '22023',
  'Training program constraints contain an invalid entry',
  'unexpected free-text properties are rejected'
);

select throws_ok(
  $test$
  select public.replace_my_training_program_exercise_constraints(
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'exerciseId','20309999-9999-4999-8999-999999999999',
        'kind','EXCLUDE','reason','OTHER'
      )
    ),
    1
  )
  $test$,
  '22023',
  'Training program constraint exercise does not exist',
  'unknown exercises fail closed'
);

select lives_ok(
  $$select public.replace_my_training_program_exercise_constraints('[]'::jsonb,1)$$,
  'owner can explicitly clear the constraint list'
);
select is((public.get_my_training_program_constraints()->>'revision')::bigint,2::bigint,'clearing increments the independent revision');
select is(pg_catalog.jsonb_array_length(public.get_my_training_program_constraints()->'entries'),0,'clearing removes exercise entries');

reset role;

update private.platform_account_state
set status='SUSPENDED',
    status_reason='Phase 20.3 fixture'
where user_id='20300303-3333-4333-8333-333333333333';

set local role authenticated;
set local request.jwt.claim.sub='20300303-3333-4333-8333-333333333333';

select throws_ok(
  $$select public.get_my_training_program_constraints()$$,
  '42501',
  'Account is not active',
  'suspended account cannot read constraints'
);

select throws_ok(
  $$select public.replace_my_training_program_exercise_constraints('[]'::jsonb,0)$$,
  '42501',
  'Account is not active',
  'suspended account cannot mutate constraints'
);

reset role;

select is(
  (select prosecdef from pg_proc where oid='public.get_my_training_program_constraints()'::regprocedure),
  true,
  'constraint read RPC is intentional security definer boundary'
);
select is(
  (select proconfig=array['search_path=""'] from pg_proc where oid='public.get_my_training_program_constraints()'::regprocedure),
  true,
  'constraint read RPC pins empty search path'
);
select is(
  (select prosecdef from pg_proc where oid='public.replace_my_training_program_exercise_constraints(jsonb,bigint)'::regprocedure),
  true,
  'constraint replace RPC is intentional security definer boundary'
);
select is(
  (select proconfig=array['search_path=""'] from pg_proc where oid='public.replace_my_training_program_exercise_constraints(jsonb,bigint)'::regprocedure),
  true,
  'constraint replace RPC pins empty search path'
);

select * from finish();
rollback;
