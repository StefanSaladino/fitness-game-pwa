begin;

select plan(10);


select has_trigger(
  'public',
  'workout_exercises',
  'workout_exercises_superset_shape',
  'deferred Superset shape constraint protects minimum membership and contiguous order'
);

select has_function(
  'private',
  'assert_lifting_superset_snapshot',
  array['uuid','uuid','jsonb'],
  'private Superset revision snapshot guard exists'
);

select has_function(
  'private',
  'set_lifting_workout_superset',
  array['uuid','uuid','jsonb','jsonb'],
  'private Superset membership mutation exists'
);

select has_function(
  'private',
  'clear_lifting_workout_superset',
  array['uuid','uuid','jsonb'],
  'private Superset break-apart mutation exists'
);

select has_function(
  'public',
  'apply_lifting_workout_mutation',
  array['uuid','uuid','text','jsonb'],
  'Superset writes stay behind the existing idempotent workout mutation boundary'
);

select ok(
  position('SET_SUPERSET' in pg_get_functiondef('public.apply_lifting_workout_mutation(uuid,uuid,text,jsonb)'::regprocedure)) > 0,
  'idempotent workout mutation RPC routes SET_SUPERSET'
);

select ok(
  position('CLEAR_SUPERSET' in pg_get_functiondef('public.apply_lifting_workout_mutation(uuid,uuid,text,jsonb)'::regprocedure)) > 0,
  'idempotent workout mutation RPC routes CLEAR_SUPERSET'
);

select ok(
  not has_function_privilege('authenticated', 'private.set_lifting_workout_superset(uuid,uuid,jsonb,jsonb)', 'EXECUTE'),
  'authenticated clients cannot bypass the mutation queue through the private Superset setter'
);

select ok(
  not has_function_privilege('authenticated', 'private.clear_lifting_workout_superset(uuid,uuid,jsonb)', 'EXECUTE'),
  'authenticated clients cannot bypass the mutation queue through the private Superset clearer'
);

select ok(
  has_function_privilege('authenticated', 'public.apply_lifting_workout_mutation(uuid,uuid,text,jsonb)', 'EXECUTE'),
  'authenticated clients retain the guarded idempotent workout mutation entry point'
);

rollback;
