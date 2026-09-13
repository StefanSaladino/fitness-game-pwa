begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select ok(
  position(
    'ws.set_type in (''WORKING'', ''DROP'')'
    in pg_get_functiondef(
      'public.reconcile_lifting_v1_scoring_for_user(uuid)'::regprocedure
    )
  ) > 0,
  'full lifting reconciler includes Drop Set parent mirrors in weighted PR candidates'
);

select ok(
  position(
    'ws.set_type in (''WORKING'', ''DROP'')'
    in pg_get_functiondef(
      'private.reconcile_lifting_v1_scoring_from_date(uuid,date)'::regprocedure
    )
  ) > 0,
  'suffix lifting reconciler includes Drop Set parent mirrors in weighted PR candidates'
);

select ok(
  position(
    'ws.set_type in (''WORKING'', ''DROP'')'
    in pg_get_functiondef(
      'public.get_my_exercise_progress_overview()'::regprocedure
    )
  ) > 0,
  'exercise overview includes Drop-only completed sessions for tracked exercises'
);

insert into auth.users (id, email) values
  ('19020000-0000-4000-8000-000000000001', 'v102-drop-pr@test.local');

set local role authenticated;
set local request.jwt.claim.sub = '19020000-0000-4000-8000-000000000001';

create temporary table v102_drop_pr_ids (
  exercise_id uuid,
  baseline_workout_id uuid,
  baseline_workout_exercise_id uuid,
  baseline_set_id uuid,
  drop_workout_id uuid,
  drop_workout_exercise_id uuid,
  drop_set_id uuid
) on commit drop;

insert into v102_drop_pr_ids(exercise_id)
select id
from public.exercise_catalog
where canonical_name = 'Barbell Bench Press'
  and active = true
limit 1;

select public.set_my_exercise_analytics_tracking(
  (select exercise_id from v102_drop_pr_ids),
  true
);

update v102_drop_pr_ids
set baseline_workout_id = public.start_or_resume_lifting_workout();

update v102_drop_pr_ids target
set baseline_workout_exercise_id =
  public.add_lifting_workout_exercise(
    target.baseline_workout_id,
    target.exercise_id
  );

update v102_drop_pr_ids target
set baseline_set_id =
  public.add_lifting_workout_set(
    target.baseline_workout_exercise_id,
    'WORKING'
  );

select public.save_lifting_workout_set(
  (select baseline_set_id from v102_drop_pr_ids),
  'WORKING',
  100,
  5,
  null,
  true
);

select public.finish_lifting_workout(
  (select baseline_workout_id from v102_drop_pr_ids)
);

update v102_drop_pr_ids
set drop_workout_id = public.start_or_resume_lifting_workout();

update v102_drop_pr_ids target
set drop_workout_exercise_id =
  public.add_lifting_workout_exercise(
    target.drop_workout_id,
    target.exercise_id
  );

update v102_drop_pr_ids target
set drop_set_id =
  public.add_lifting_workout_advanced_set(
    target.drop_workout_exercise_id,
    'DROP'
  );

select public.save_lifting_workout_advanced_set(
  (select drop_set_id from v102_drop_pr_ids),
  'DROP',
  '[{"weightKg":105,"reps":5},{"weightKg":80,"reps":10}]'::jsonb,
  true
);

select results_eq(
  $$
    select set_type::text, set_variant, weight_kg, reps
    from public.workout_sets
    where id = (select drop_set_id from v102_drop_pr_ids)
  $$,
  $$ values ('DROP'::text, 'DROP'::text, 105::numeric, 5) $$,
  'Drop Set remains a DROP logical parent and mirrors its best Epley-eligible stage'
);

select public.finish_lifting_workout(
  (select drop_workout_id from v102_drop_pr_ids)
);

select results_eq(
  $$
    select weight_kg, reps
    from public.exercise_progress_observations
    where user_id = '19020000-0000-4000-8000-000000000001'
      and workout_id = (select drop_workout_id from v102_drop_pr_ids)
      and exercise_id = (select exercise_id from v102_drop_pr_ids)
      and metric_type = 'E1RM'
  $$,
  $$ values (105::numeric, 5) $$,
  'automatic suffix reconciliation logs the best Drop stage as the workout E1RM observation'
);

select ok(
  exists (
    select 1
    from public.exercise_progress p
    where p.user_id = '19020000-0000-4000-8000-000000000001'
      and p.exercise_id = (select exercise_id from v102_drop_pr_ids)
      and p.metric_type = 'E1RM'
      and p.best_weight_kg = 105
      and p.best_reps = 5
      and p.source_workout_id = (select drop_workout_id from v102_drop_pr_ids)
  ),
  'Drop-stage PR becomes the current exercise PR'
);

select results_eq(
  $$
    select is_pr, completed_working_sets, session_volume_kg_reps
    from public.get_my_exercise_progress_history(
      (select exercise_id from v102_drop_pr_ids)
    )
    where workout_id = (select drop_workout_id from v102_drop_pr_ids)
  $$,
  $$ values (true, 0::integer, 1325::numeric) $$,
  'history marks the Drop-only workout as a PR without counting it as a Working set'
);

select results_eq(
  $$
    select session_count
    from public.get_my_exercise_progress_overview()
    where exercise_id = (select exercise_id from v102_drop_pr_ids)
  $$,
  array[2::bigint],
  'tracked exercise overview counts the baseline and Drop-only sessions'
);

reset role;

select public.reconcile_lifting_v1_scoring_for_user(
  '19020000-0000-4000-8000-000000000001'
);

set local role authenticated;
set local request.jwt.claim.sub = '19020000-0000-4000-8000-000000000001';

select results_eq(
  $$
    select weight_kg, reps
    from public.exercise_progress_observations
    where user_id = '19020000-0000-4000-8000-000000000001'
      and workout_id = (select drop_workout_id from v102_drop_pr_ids)
      and exercise_id = (select exercise_id from v102_drop_pr_ids)
      and metric_type = 'E1RM'
  $$,
  $$ values (105::numeric, 5) $$,
  'full authoritative reconciliation preserves the Drop-stage PR observation'
);

select ok(
  exists (
    select 1
    from public.exercise_progress p
    where p.user_id = '19020000-0000-4000-8000-000000000001'
      and p.exercise_id = (select exercise_id from v102_drop_pr_ids)
      and p.best_weight_kg = 105
      and p.best_reps = 5
      and p.source_workout_id = (select drop_workout_id from v102_drop_pr_ids)
  ),
  'full authoritative reconciliation preserves the Drop-stage current PR'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.scoring_events
    where user_id = '19020000-0000-4000-8000-000000000001'
      and event_type = 'EXERCISE_COMPLETE'
      and workout_id = (select drop_workout_id from v102_drop_pr_ids)
  $$,
  array[0::bigint],
  'Drop-only workout does not become a Working-set exercise-completion award'
);

reset role;
select * from finish();
rollback;
