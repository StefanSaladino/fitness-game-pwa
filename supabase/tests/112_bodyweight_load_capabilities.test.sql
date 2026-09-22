begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_column('public','exercise_catalog','supports_added_weight','catalog exposes added-weight capability');
select has_column('public','exercise_catalog','supports_assisted','catalog exposes assisted capability');
select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where active=true and measurement_type='BODYWEIGHT_REPS' and supports_added_weight=false$$,
  array[0::bigint], 'all rep-based bodyweight exercises retain added-weight logging');
select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where active=true and workout_type='PLYOMETRIC' and supports_assisted=true$$,
  array[0::bigint], 'plyometric exercises never expose numeric Assisted mode');
select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where active=true and supports_assisted=true$$,
  array[7::bigint], 'only seven exercises expose numeric Assisted mode');
select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where active=true and supports_assisted=true and canonical_name in ('Pull-Up','Chin-Up','Neutral-Grip Pull-Up','Wide-Grip Pull-Up','Commando Pull-Up','Scapular Pull-Up','Dip')$$,
  array[7::bigint], 'Assisted whitelist is limited to measurable pull-up/dip patterns');
select results_eq(
  $$select count(*)::bigint from public.exercise_catalog where measurement_type <> 'BODYWEIGHT_REPS' and (supports_added_weight or supports_assisted)$$,
  array[0::bigint], 'non-bodyweight measurement types cannot advertise bodyweight load modes');

insert into auth.users (id,email) values ('c3333333-3333-4333-8333-333333333333','load-cap@test.local');
set local role authenticated;
set local request.jwt.claim.sub = 'c3333333-3333-4333-8333-333333333333';

create temporary table load_cap_ids(kind text primary key, workout_exercise_id uuid, set_id uuid) on commit drop;
select public.start_or_resume_lifting_workout();

insert into load_cap_ids(kind,workout_exercise_id)
select 'jump', public.add_lifting_workout_exercise(
  (select id from public.workout_sessions where user_id=auth.uid() and status='IN_PROGRESS' and category='STRENGTH' order by started_at desc limit 1),
  (select id from public.exercise_catalog where canonical_name='Squat Jump')
);
update load_cap_ids set set_id=public.add_lifting_workout_set(workout_exercise_id,'WORKING') where kind='jump';

select lives_ok(
  $$select public.save_lifting_workout_set((select set_id from load_cap_ids where kind='jump'),'WORKING',10,8,'ADDED_WEIGHT',false)$$,
  'Squat Jump accepts Added weight');
select throws_ok(
  $$select public.save_lifting_workout_set((select set_id from load_cap_ids where kind='jump'),'WORKING',10,8,'ASSISTED',false)$$,
  '22023', 'Assisted load is not supported for this exercise',
  'Squat Jump rejects Assisted load at the database boundary');

insert into load_cap_ids(kind,workout_exercise_id)
select 'pullup', public.add_lifting_workout_exercise(
  (select id from public.workout_sessions where user_id=auth.uid() and status='IN_PROGRESS' and category='STRENGTH' order by started_at desc limit 1),
  (select id from public.exercise_catalog where canonical_name='Pull-Up')
);
update load_cap_ids set set_id=public.add_lifting_workout_set(workout_exercise_id,'WORKING') where kind='pullup';
select lives_ok(
  $$select public.save_lifting_workout_set((select set_id from load_cap_ids where kind='pullup'),'WORKING',20,8,'ASSISTED',false)$$,
  'Pull-Up accepts Assisted load');
select results_eq(
  $$select bodyweight_mode from public.workout_sets where id=(select set_id from load_cap_ids where kind='pullup')$$,
  array['ASSISTED'::text], 'allowed Assisted mode is persisted');
select results_eq(
  $$select weight_kg from public.workout_sets where id=(select set_id from load_cap_ids where kind='pullup')$$,
  array[20::numeric], 'allowed assistance load is persisted canonically');

reset role;
select * from finish();
rollback;
