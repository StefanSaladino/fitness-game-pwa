begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'muscle_volume_exercise_rules'
      and indexname = 'muscle_volume_exercise_rules_exercise_id_idx'
  ),
  'exercise-rule exercise_id foreign key has a covering index'
);

select * from finish();
rollback;