begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select ok(
  exists(select 1 from public.muscle_volume_methodologies where version='muscle-volume-v2'),
  'muscle-volume-v2 methodology is seeded'
);
select is(
  (select is_active from public.muscle_volume_methodologies where version='muscle-volume-v2'),
  false,
  'v2 remains inactive until the compatible application is deployed'
);
select is(
  (select version from public.muscle_volume_methodologies where is_active),
  'muscle-volume-v1',
  'v1 remains the active production methodology during staging'
);
select results_eq(
  $$select count(*)::bigint from public.muscle_volume_exercise_rules where methodology_version='muscle-volume-v2'$$,
  array[568::bigint],
  'v2 preserves all 568 exercise rules'
);
select results_eq(
  $$select count(*)::bigint from public.muscle_volume_exercise_rules where methodology_version='muscle-volume-v2' and volume_eligible$$,
  array[418::bigint],
  'v2 preserves 418 volume-eligible exercises'
);
select results_eq(
  $$select count(*)::bigint from public.muscle_volume_exercise_contributions where methodology_version='muscle-volume-v2'$$,
  array[825::bigint],
  'v2 contains the reviewed granular contribution matrix'
);
select results_eq(
  $$select count(*)::bigint from public.muscle_volume_exercise_contributions where methodology_version='muscle-volume-v2' and muscle_group in ('BACK','SHOULDERS')$$,
  array[0::bigint],
  'v2 contains no broad BACK or SHOULDERS volume contributions'
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
  $$select count(*)::bigint from public.muscle_volume_exercise_rules r where r.methodology_version='muscle-volume-v2' and r.volume_eligible and not exists (select 1 from public.muscle_volume_exercise_contributions c where c.methodology_version=r.methodology_version and c.exercise_id=r.exercise_id)$$,
  array[0::bigint],
  'every v2 eligible exercise has at least one contribution'
);
select results_eq(
  $$select count(*)::bigint from (select distinct exercise_id from public.muscle_volume_exercise_contributions where methodology_version='muscle-volume-v1' and muscle_group='BACK' except select distinct exercise_id from public.muscle_volume_exercise_contributions where methodology_version='muscle-volume-v2' and muscle_group in ('LATS','UPPER_BACK','TRAPS','SPINAL_ERECTORS')) q$$,
  array[0::bigint],
  'every legacy BACK contributor is represented by a granular v2 back target'
);
select results_eq(
  $$select count(*)::bigint from (select distinct exercise_id from public.muscle_volume_exercise_contributions where methodology_version='muscle-volume-v1' and muscle_group='SHOULDERS' except select distinct exercise_id from public.muscle_volume_exercise_contributions where methodology_version='muscle-volume-v2' and muscle_group in ('ANTERIOR_DELTS','LATERAL_DELTS','POSTERIOR_DELTS')) q$$,
  array[0::bigint],
  'every legacy SHOULDERS contributor is represented by a granular v2 deltoid target'
);
select results_eq(
  $$select count(*)::bigint from public.muscle_volume_benchmarks where methodology_version='muscle-volume-v2' and muscle_group='LATS'$$,
  array[2::bigint],
  'lats have independent 7- and 28-day benchmarks'
);
select results_eq(
  $$select count(*)::bigint from public.muscle_volume_benchmarks where methodology_version='muscle-volume-v2' and muscle_group='UPPER_BACK'$$,
  array[2::bigint],
  'upper back has independent benchmarks'
);
select results_eq(
  $$select count(*)::bigint from public.muscle_volume_benchmarks where methodology_version='muscle-volume-v2' and muscle_group='SPINAL_ERECTORS'$$,
  array[2::bigint],
  'spinal erectors have independent benchmarks'
);
select results_eq(
  $$select count(*)::bigint from public.muscle_volume_benchmarks where methodology_version='muscle-volume-v2' and muscle_group='ANTERIOR_DELTS'$$,
  array[2::bigint],
  'anterior delts have independent benchmarks'
);
select results_eq(
  $$select count(*)::bigint from public.muscle_volume_benchmarks where methodology_version='muscle-volume-v2' and muscle_group='LATERAL_DELTS'$$,
  array[2::bigint],
  'lateral delts have independent benchmarks'
);
select results_eq(
  $$select count(*)::bigint from public.muscle_volume_benchmarks where methodology_version='muscle-volume-v2' and muscle_group='POSTERIOR_DELTS'$$,
  array[2::bigint],
  'posterior delts have independent benchmarks'
);

select * from finish();
rollback;
