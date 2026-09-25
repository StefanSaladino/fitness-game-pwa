begin;
create extension if not exists pgtap with schema extensions;
select plan(4);
select has_function('public','get_my_weekly_muscle_volume_history',
  array['date','integer'],'personal volume history read model exists');
select ok(has_function_privilege('authenticated',
  'public.get_my_weekly_muscle_volume_history(date,integer)','EXECUTE'),
  'authenticated users can read their weekly volume history');
select ok(position('auth.uid()' in pg_get_functiondef(
  'public.get_my_weekly_muscle_volume_history(date,integer)'::regprocedure))>0,
  'weekly volume history is owner scoped');
select ok(position('muscle_volume_set_stimulus' in pg_get_functiondef(
  'public.get_my_weekly_muscle_volume_history(date,integer)'::regprocedure))>0,
  'weekly history reuses the Phase 19 stimulus ledger');
select * from finish();
rollback;
