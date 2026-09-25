begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_table(
  'public',
  'training_program_substitutions',
  'Phase 20.6 substitution audit table exists'
);

select ok(
  (select relrowsecurity from pg_class where oid='public.training_program_substitutions'::regclass),
  'substitution audit table has RLS enabled'
);

select ok(
  has_table_privilege('authenticated', 'public.training_program_substitutions', 'SELECT'),
  'authenticated users can select substitution audit rows through RLS'
);

select ok(
  not has_table_privilege('authenticated', 'public.training_program_substitutions', 'INSERT'),
  'authenticated users cannot insert substitution audit rows directly'
);

select results_eq(
  $$select count(*)::bigint
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname='launch_my_training_program_own_workout'$$,
  array[1::bigint],
  'own-workout launch RPC has one public signature'
);

select results_eq(
  $$select count(*)::bigint
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname='replace_my_training_program_exercise'$$,
  array[1::bigint],
  'exercise replacement RPC has one public signature'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.launch_my_training_program_own_workout(uuid,timestamp with time zone)',
    'EXECUTE'
  ),
  'authenticated users can execute own-workout launch RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.replace_my_training_program_exercise(uuid,uuid,bigint,bigint,numeric)',
    'EXECUTE'
  ),
  'authenticated users can execute replacement RPC'
);

select ok(
  (select p.prosecdef
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public'
     and p.proname='launch_my_training_program_own_workout'),
  'own-workout launch RPC is security definer guarded'
);

select ok(
  (select p.prosecdef
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public'
     and p.proname='replace_my_training_program_exercise'),
  'replacement RPC is security definer guarded'
);

select ok(
  position(
    'private.require_active_account()'
    in pg_get_functiondef(
      'public.launch_my_training_program_own_workout(uuid,timestamp with time zone)'::regprocedure
    )
  ) > 0,
  'own-workout launch RPC requires an active account'
);

select ok(
  position(
    'Only an unstarted planned exercise can be replaced'
    in pg_get_functiondef(
      'public.replace_my_training_program_exercise(uuid,uuid,bigint,bigint,numeric)'::regprocedure
    )
  ) > 0,
  'replacement RPC preserves the unstarted-planned boundary'
);

select * from finish();
rollback;
