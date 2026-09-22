begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select ok((select count(*) from public.exercise_catalog where active=true) >= 568,
  'reconciled catalogue contains at least 568 active exercises');
select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where active=true and created_at is not null and canonical_name in ('Egyptian Cable Lateral Raise','Bodyweight Curtsy Lunge','Barbell Curtsy Lunge','Kettlebell Curtsy Lunge','Landmine Curtsy Lunge')$$,
  array[5::bigint], 'representative expansion exercises are present');
select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where active=true and workout_type='PLYOMETRIC'$$,
  array[35::bigint], 'plyometric catalogue contains 35 active exercises');
select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where active=true and workout_type='PLYOMETRIC' and measurement_type='BODYWEIGHT_REPS'$$,
  array[34::bigint], '34 plyometric exercises use rep-based bodyweight tracking');
select is((select measurement_type from public.exercise_catalog where canonical_name='Jump Rope'), 'DURATION', 'Jump Rope remains duration based');
select ok((select aliases @> array['Egyptian Dumbbell Lateral Raise']::text[] from public.exercise_catalog where canonical_name='Lean-Away Dumbbell Lateral Raise'), 'Egyptian dumbbell alias resolves to lean-away dumbbell lateral raise');
select ok((select aliases @> array['Jump Squat','Weighted Jump Squat']::text[] from public.exercise_catalog where canonical_name='Squat Jump'), 'Squat Jump carries common and weighted aliases');
select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where canonical_name in ('Bodyweight Curtsy Lunge','Dumbbell Curtsy Lunge','Cable Curtsy Lunge','Barbell Curtsy Lunge','Kettlebell Curtsy Lunge','Landmine Curtsy Lunge')$$,
  array[6::bigint], 'curtsy lunge is represented across six loading/equipment variants');
select results_eq(
  $$select count(*)::bigint from public.exercise_catalog e left join public.muscle_volume_exercise_rules r on r.exercise_id=e.id and r.methodology_version='muscle-volume-v1' where e.active=true and r.exercise_id is null$$,
  array[0::bigint], 'every active exercise has an explicit muscle-volume-v1 rule');
select results_eq(
  $$select count(*)::bigint from public.muscle_volume_exercise_contributions c join public.exercise_catalog e on e.id=c.exercise_id where c.methodology_version='muscle-volume-v1' and e.workout_type='PLYOMETRIC'$$,
  array[0::bigint], 'plyometrics remain excluded from hypertrophy contribution scoring');

select * from finish();
rollback;
