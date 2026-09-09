begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_table('public', 'user_tracked_exercises', 'selective analytics has a user/exercise preference table');
select has_function('public', 'set_my_exercise_analytics_tracking', array['uuid', 'boolean'], 'analytics tracking setter RPC exists');
select is(has_table_privilege('authenticated', 'public.user_tracked_exercises', 'select'), true, 'authenticated can read owned tracking preferences');
select is(has_table_privilege('authenticated', 'public.user_tracked_exercises', 'insert'), false, 'authenticated cannot directly insert tracking preferences');
select is(has_table_privilege('authenticated', 'public.user_tracked_exercises', 'delete'), false, 'authenticated cannot directly delete tracking preferences');
select is(has_function_privilege('authenticated', 'public.set_my_exercise_analytics_tracking(uuid,boolean)', 'execute'), true, 'authenticated can update its tracking preference through the RPC');
select is(has_function_privilege('anon', 'public.set_my_exercise_analytics_tracking(uuid,boolean)', 'execute'), false, 'anon cannot mutate analytics tracking');
select ok((select relrowsecurity from pg_class where oid='public.user_tracked_exercises'::regclass), 'tracking preference table has RLS enabled');

insert into auth.users (id, email) values
  ('187b0000-0000-4000-8000-000000000001', 'phase187b@test.local');

set local role authenticated;
set local request.jwt.claim.sub = '187b0000-0000-4000-8000-000000000001';

create temporary table phase187b_ids(
  exercise_id uuid,
  workout_id uuid,
  workout_exercise_id uuid,
  workout_set_id uuid
) on commit drop;

insert into phase187b_ids(exercise_id)
select id
from public.exercise_catalog
where canonical_name = 'Barbell Bench Press'
  and active = true
limit 1;

select is(
  public.set_my_exercise_analytics_tracking((select exercise_id from phase187b_ids), true),
  true,
  'tracking an exercise succeeds'
);

select results_eq(
  $$select count(*)::bigint from public.user_tracked_exercises where user_id='187b0000-0000-4000-8000-000000000001'$$,
  array[1::bigint],
  'tracking preference is unique and persisted'
);

select public.set_my_exercise_analytics_tracking((select exercise_id from phase187b_ids), true);
select results_eq(
  $$select count(*)::bigint from public.user_tracked_exercises where user_id='187b0000-0000-4000-8000-000000000001'$$,
  array[1::bigint],
  'repeated tracking is idempotent'
);

select public.set_my_exercise_analytics_tracking((select exercise_id from phase187b_ids), false);
select results_eq(
  $$select count(*)::bigint from public.user_tracked_exercises where user_id='187b0000-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'untracking removes only the preference row'
);

update phase187b_ids set workout_id = public.start_or_resume_lifting_workout();
update phase187b_ids target
set workout_exercise_id = public.add_lifting_workout_exercise(target.workout_id, target.exercise_id);
update phase187b_ids target
set workout_set_id = public.add_lifting_workout_set(target.workout_exercise_id, 'WORKING');
select public.save_lifting_workout_set(
  (select workout_set_id from phase187b_ids),
  'WORKING',
  100,
  5,
  null,
  true
);
select public.finish_lifting_workout((select workout_id from phase187b_ids));

select ok(
  exists (
    select 1 from public.exercise_progress_observations o
    where o.user_id='187b0000-0000-4000-8000-000000000001'
      and o.exercise_id=(select exercise_id from phase187b_ids)
  ),
  'untracked exercises still retain normal progression evidence'
);

select ok(
  exists (
    select 1 from public.get_my_lifting_calendar_summaries(1,1)
    where period_kind='WEEK' and volume_kg_reps > 0
  ),
  'untracked exercises still contribute to aggregate lifting volume'
);

select results_eq(
  $$select count(*)::bigint from public.get_my_exercise_progress_overview() where exercise_id=(select exercise_id from phase187b_ids)$$,
  array[0::bigint],
  'untracked exercise is omitted from deep analytics overview'
);

select public.set_my_exercise_analytics_tracking((select exercise_id from phase187b_ids), true);
select results_eq(
  $$select count(*)::bigint from public.get_my_exercise_progress_overview() where exercise_id=(select exercise_id from phase187b_ids)$$,
  array[1::bigint],
  're-tracking resurfaces retained historical analytics without rebuilding data'
);

reset role;
select * from finish();
rollback;
