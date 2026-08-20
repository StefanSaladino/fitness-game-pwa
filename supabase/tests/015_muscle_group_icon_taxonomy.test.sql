begin;

select plan(6);

select has_column(
  'public',
  'exercise_catalog',
  'primary_muscle_group',
  'exercise catalogue keeps primary muscle-group metadata'
);

select results_eq(
  $$
    select position('OBLIQUES' in pg_get_constraintdef(oid)) > 0
    from pg_constraint
    where conname = 'exercise_catalog_primary_muscle_group_check'
      and conrelid = 'public.exercise_catalog'::regclass
  $$,
  $$ values (true) $$,
  'muscle-group constraint accepts OBLIQUES'
);

select results_eq(
  $$ select count(*)::bigint from public.exercise_catalog where primary_muscle_group = 'OBLIQUES' $$,
  $$ values (8::bigint) $$,
  'eight canonical rotational/side-core exercises are classified as obliques'
);

select results_eq(
  $$ select primary_muscle_group from public.exercise_catalog where canonical_name = 'Side Plank' $$,
  $$ values ('OBLIQUES'::text) $$,
  'Side Plank is an oblique exercise'
);

select results_eq(
  $$ select primary_muscle_group from public.exercise_catalog where canonical_name = 'Cable Wood Chop' $$,
  $$ values ('OBLIQUES'::text) $$,
  'Cable Wood Chop is an oblique exercise'
);

select results_eq(
  $$ select primary_muscle_group from public.exercise_catalog where canonical_name = 'Landmine Rotation' $$,
  $$ values ('OBLIQUES'::text) $$,
  'Landmine Rotation is an oblique exercise'
);

select * from finish();
rollback;
