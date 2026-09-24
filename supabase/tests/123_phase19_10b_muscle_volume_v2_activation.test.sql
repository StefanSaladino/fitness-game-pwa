begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select is(
  (select count(*)::bigint from public.muscle_volume_methodologies where is_active),
  1::bigint,
  'exactly one muscle-volume methodology is active'
);

select is(
  (select is_active from public.muscle_volume_methodologies where version='muscle-volume-v2'),
  true,
  'muscle-volume-v2 is active'
);

select is(
  (select is_active from public.muscle_volume_methodologies where version='muscle-volume-v1'),
  false,
  'muscle-volume-v1 is inactive'
);

select results_eq(
  $$select count(*)::bigint from public.muscle_volume_benchmarks where methodology_version='muscle-volume-v2' and window_days=7$$,
  array[18::bigint],
  'v2 has 18 seven-day benchmark groups'
);

select results_eq(
  $$select count(*)::bigint from public.muscle_volume_benchmarks where methodology_version='muscle-volume-v2' and window_days=28$$,
  array[18::bigint],
  'v2 has 18 twenty-eight-day benchmark groups'
);

select results_eq(
  $$select count(*)::bigint from public.muscle_volume_exercise_contributions where methodology_version='muscle-volume-v2' and muscle_group in ('BACK','SHOULDERS')$$,
  array[0::bigint],
  'v2 has no broad BACK or SHOULDERS volume targets'
);

select ok(
  pg_get_functiondef(
    'public.get_my_training_program_candidate_catalog()'::regprocedure
  ) ilike '%where m.is_active%',
  'Phase 20 candidate catalogue resolves the active methodology'
);

select ok(
  pg_get_functiondef(
    'report_private.freeze_my_monthly_training_report_source(date)'::regprocedure
  ) ilike '%muscle row count does not match methodology%',
  'monthly report snapshot verification derives its row count from methodology'
);

select results_eq(
  $$select count(*)::bigint from public.muscle_volume_exercise_rules where methodology_version='muscle-volume-v2' and volume_eligible$$,
  array[418::bigint],
  'v2 keeps 418 volume-eligible exercises'
);

select results_eq(
  $$select count(*)::bigint from (select distinct muscle_group from public.muscle_volume_exercise_contributions where methodology_version='muscle-volume-v2') x$$,
  array[18::bigint],
  'v2 contribution matrix exposes 18 distinct muscle groups'
);

select * from finish();
rollback;
