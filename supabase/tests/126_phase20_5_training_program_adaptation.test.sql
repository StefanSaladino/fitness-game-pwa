begin;
create extension if not exists pgtap with schema extensions;

select plan(29);

select has_table(
  'public',
  'training_program_adaptations',
  'adaptation audit table exists'
);
select has_table(
  'public',
  'training_program_adaptation_changes',
  'adaptation change table exists'
);

select is(
  (select relrowsecurity from pg_class
   where oid='public.training_program_adaptations'::regclass),
  true,
  'adaptation audit table enforces RLS'
);
select is(
  (select relrowsecurity from pg_class
   where oid='public.training_program_adaptation_changes'::regclass),
  true,
  'adaptation change table enforces RLS'
);

select is(
  has_table_privilege(
    'authenticated',
    'public.training_program_adaptations',
    'select'
  ),
  true,
  'authenticated may read owned adaptation audit rows'
);
select is(
  has_table_privilege(
    'authenticated',
    'public.training_program_adaptation_changes',
    'select'
  ),
  true,
  'authenticated may read owned adaptation change rows'
);

select is(
  has_table_privilege(
    'authenticated',
    'public.training_program_adaptations',
    'insert'
  ),
  false,
  'browser cannot insert adaptation audits directly'
);
select is(
  has_table_privilege(
    'authenticated',
    'public.training_program_adaptations',
    'update'
  ),
  false,
  'browser cannot update adaptation audits directly'
);
select is(
  has_table_privilege(
    'authenticated',
    'public.training_program_adaptations',
    'delete'
  ),
  false,
  'browser cannot delete adaptation audits directly'
);
select is(
  has_table_privilege(
    'authenticated',
    'public.training_program_adaptation_changes',
    'insert'
  ),
  false,
  'browser cannot insert adaptation changes directly'
);
select is(
  has_table_privilege(
    'authenticated',
    'public.training_program_adaptation_changes',
    'update'
  ),
  false,
  'browser cannot update adaptation changes directly'
);
select is(
  has_table_privilege(
    'authenticated',
    'public.training_program_adaptation_changes',
    'delete'
  ),
  false,
  'browser cannot delete adaptation changes directly'
);

select has_function(
  'public',
  'get_my_training_program_adaptation_context',
  array['uuid','uuid'],
  'adaptation context RPC exists'
);
select has_function(
  'public',
  'apply_my_training_program_adaptation',
  array['uuid','uuid','bigint','jsonb','text[]','jsonb'],
  'adaptation apply RPC exists'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.get_my_training_program_adaptation_context(uuid,uuid)',
    'execute'
  ),
  true,
  'authenticated may load own adaptation context'
);
select is(
  has_function_privilege(
    'anon',
    'public.get_my_training_program_adaptation_context(uuid,uuid)',
    'execute'
  ),
  false,
  'anon cannot load adaptation context'
);
select is(
  has_function_privilege(
    'public',
    'public.get_my_training_program_adaptation_context(uuid,uuid)',
    'execute'
  ),
  false,
  'PUBLIC has no implicit context RPC execution'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.apply_my_training_program_adaptation(uuid,uuid,bigint,jsonb,text[],jsonb)',
    'execute'
  ),
  true,
  'authenticated may apply own bounded adaptation'
);
select is(
  has_function_privilege(
    'anon',
    'public.apply_my_training_program_adaptation(uuid,uuid,bigint,jsonb,text[],jsonb)',
    'execute'
  ),
  false,
  'anon cannot apply adaptations'
);
select is(
  has_function_privilege(
    'public',
    'public.apply_my_training_program_adaptation(uuid,uuid,bigint,jsonb,text[],jsonb)',
    'execute'
  ),
  false,
  'PUBLIC has no implicit apply RPC execution'
);

select is(
  (select prosecdef from pg_proc
   where oid='public.get_my_training_program_adaptation_context(uuid,uuid)'::regprocedure),
  false,
  'adaptation context uses security invoker'
);
select is(
  (select proconfig=array['search_path=""'] from pg_proc
   where oid='public.get_my_training_program_adaptation_context(uuid,uuid)'::regprocedure),
  true,
  'adaptation context pins empty search path'
);
select is(
  (select prosecdef from pg_proc
   where oid='public.apply_my_training_program_adaptation(uuid,uuid,bigint,jsonb,text[],jsonb)'::regprocedure),
  true,
  'bounded adaptation mutation is intentional security definer'
);
select is(
  (select proconfig=array['search_path=""'] from pg_proc
   where oid='public.apply_my_training_program_adaptation(uuid,uuid,bigint,jsonb,text[],jsonb)'::regprocedure),
  true,
  'adaptation mutation pins empty search path'
);

select ok(
  exists(
    select 1
    from pg_indexes
    where schemaname='public'
      and tablename='training_program_adaptations'
      and indexdef like '%UNIQUE%'
      and indexdef like '%program_id%'
      and indexdef like '%trigger_workout_session_id%'
  ),
  'one completed workout can produce at most one adaptation'
);

select ok(
  exists(
    select 1
    from pg_constraint
    where conrelid='public.training_program_adaptations'::regclass
      and pg_get_constraintdef(oid)
        like '%trigger_workout_session_id%ON DELETE RESTRICT%'
  ),
  'adaptation trigger workout history cannot cascade-delete'
);

select ok(
  exists(
    select 1
    from pg_constraint
    where conrelid='public.training_program_adaptations'::regclass
      and conname='training_program_adaptation_revision_check'
  ),
  'adaptation revision invariant is enforced'
);

select ok(
  exists(
    select 1
    from pg_constraint
    where conrelid='public.training_program_adaptation_changes'::regclass
      and pg_get_constraintdef(oid)
        like '%TARGET_WEIGHT_KG%'
      and pg_get_constraintdef(oid)
        like '%WORKING_SETS%'
  ),
  'adaptation fields are explicitly bounded'
);

select ok(
  exists(
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='training_program_adaptations'
      and policyname='training_program_adaptations_select_own'
  )
  and exists(
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='training_program_adaptation_changes'
      and policyname='training_program_adaptation_changes_select_own'
  ),
  'both adaptation tables have owner-scoped read policies'
);

select * from finish();
rollback;
