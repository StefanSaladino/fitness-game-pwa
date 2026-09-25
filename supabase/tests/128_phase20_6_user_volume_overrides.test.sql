begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_column(
  'public',
  'training_program_exercises',
  'user_working_sets_override',
  'planned exercises keep user volume separately from the system recommendation'
);

select has_table(
  'public',
  'training_program_volume_adjustments',
  'manual program-volume changes have an append-only audit table'
);

select ok(
  (select relrowsecurity
   from pg_class
   where oid='public.training_program_volume_adjustments'::regclass),
  'volume adjustment audit table has RLS enabled'
);

select ok(
  has_table_privilege(
    'authenticated',
    'public.training_program_volume_adjustments',
    'SELECT'
  ),
  'authenticated users can read their volume adjustment audit through RLS'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.training_program_volume_adjustments',
    'INSERT'
  ),
  'browser clients cannot insert volume audit rows directly'
);

select has_function(
  'public',
  'set_my_training_program_workout_volume',
  array['uuid','bigint','bigint','jsonb','boolean'],
  'guarded planned-volume mutation RPC exists'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.set_my_training_program_workout_volume(uuid,bigint,bigint,jsonb,boolean)',
    'EXECUTE'
  ),
  'authenticated users can execute the guarded planned-volume mutation'
);

select ok(
  (select p.prosecdef
   from pg_proc p
   join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public'
     and p.proname='set_my_training_program_workout_volume'),
  'planned-volume mutation is security definer guarded'
);

select ok(
  position(
    'private.require_active_account()'
    in pg_get_functiondef(
      'public.set_my_training_program_workout_volume(uuid,bigint,bigint,jsonb,boolean)'::regprocedure
    )
  ) > 0,
  'planned-volume mutation requires an active account'
);

select ok(
  position(
    'Only an unstarted planned workout can change planned volume'
    in pg_get_functiondef(
      'public.set_my_training_program_workout_volume(uuid,bigint,bigint,jsonb,boolean)'::regprocedure
    )
  ) > 0,
  'planned-volume mutation preserves the unstarted workout boundary'
);

select ok(
  position(
    'user_working_sets_override'
    in pg_get_functiondef(
      'public.launch_my_training_program_workout(uuid,timestamp with time zone)'::regprocedure
    )
  ) > 0,
  'programmed launch uses the user-adjusted working-set count'
);

select ok(
  position(
    'coalesce'
    in pg_get_functiondef(
      'public.launch_my_training_program_workout(uuid,timestamp with time zone)'::regprocedure
    )
  ) > 0,
  'programmed launch falls back to the current system recommendation'
);

select * from finish();
rollback;
