begin;

select plan(3);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'workout_mutation_receipts'
      and c.conname = 'workout_mutation_receipts_kind_check'
      and c.contype = 'c'
  ),
  'workout mutation receipt kind constraint exists'
);

select ok(
  position(
    'SET_SUPERSET' in (
      select pg_get_constraintdef(c.oid)
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'workout_mutation_receipts'
        and c.conname = 'workout_mutation_receipts_kind_check'
    )
  ) > 0,
  'receipt ledger accepts SET_SUPERSET'
);

select ok(
  position(
    'CLEAR_SUPERSET' in (
      select pg_get_constraintdef(c.oid)
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'workout_mutation_receipts'
        and c.conname = 'workout_mutation_receipts_kind_check'
    )
  ) > 0,
  'receipt ledger accepts CLEAR_SUPERSET'
);

rollback;
