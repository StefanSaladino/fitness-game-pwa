begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

select has_column('public', 'workout_sets', 'set_variant', 'logical workout sets store advanced-set variant metadata');
select has_table('public', 'workout_set_segments', 'advanced logical sets have an ordered child-segment table');
select has_function('public', 'add_lifting_workout_advanced_set', array['uuid', 'text'], 'advanced-set creation RPC exists');
select has_function('public', 'save_lifting_workout_advanced_set', array['uuid', 'text', 'jsonb', 'boolean'], 'atomic advanced-set save RPC exists');

select is(
  has_function_privilege('authenticated', 'public.add_lifting_workout_advanced_set(uuid,text)', 'execute'),
  true,
  'authenticated can create advanced sets'
);
select is(
  has_function_privilege('anon', 'public.add_lifting_workout_advanced_set(uuid,text)', 'execute'),
  false,
  'anon cannot create advanced sets'
);
select is(has_table_privilege('authenticated', 'public.workout_set_segments', 'select'), true, 'authenticated can read owned segment rows through RLS');
select is(has_table_privilege('authenticated', 'public.workout_set_segments', 'insert'), false, 'authenticated cannot directly insert segment rows');

select results_eq(
  $$select count(*)::bigint from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='add_lifting_workout_working_set_sequence'$$,
  array[0::bigint],
  'obsolete independent-working-set Pyramid helper is retired'
);

select ok(
  (
    select position('ADD_ADVANCED_SET' in pg_get_constraintdef(c.oid)) > 0
       and position('SAVE_ADVANCED_SET' in pg_get_constraintdef(c.oid)) > 0
       and position('ADD_SET_SEQUENCE' in pg_get_constraintdef(c.oid)) > 0
    from pg_constraint c
    where c.conrelid='public.workout_mutation_receipts'::regclass
      and c.conname='workout_mutation_receipts_kind_check'
  )
  and position(
    'when ''ADD_SET_SEQUENCE'''
    in pg_get_functiondef('public.apply_lifting_workout_mutation(uuid,uuid,text,jsonb)'::regprocedure)
  ) = 0,
  'receipt contract preserves legacy sequence receipts while new sequence writes stay retired'
);

insert into auth.users (id, email) values
  ('a187a100-0000-4000-8000-000000000001', 'phase187a-segments@test.local');

set local role authenticated;
set local request.jwt.claim.sub = 'a187a100-0000-4000-8000-000000000001';

create temporary table phase187a_segment_ids(
  workout_id uuid,
  exercise_id uuid,
  workout_exercise_id uuid,
  drop_set_id uuid,
  pyramid_set_id uuid,
  pyramid_revision bigint
) on commit drop;

insert into phase187a_segment_ids(exercise_id)
select id
from public.exercise_catalog
where canonical_name = 'Barbell Bench Press'
  and active = true
limit 1;

update phase187a_segment_ids
set workout_id = public.start_or_resume_lifting_workout();

update phase187a_segment_ids target
set workout_exercise_id = public.add_lifting_workout_exercise(target.workout_id, target.exercise_id);

update phase187a_segment_ids target
set drop_set_id = public.add_lifting_workout_advanced_set(target.workout_exercise_id, 'DROP'),
    pyramid_set_id = public.add_lifting_workout_advanced_set(target.workout_exercise_id, 'FULL_PYRAMID');

select results_eq(
  $$select set_type::text, set_variant from public.workout_sets where id=(select drop_set_id from phase187a_segment_ids)$$,
  $$values ('DROP'::text, 'DROP'::text)$$,
  'Drop workflow creates one DROP logical parent set'
);

select results_eq(
  $$select set_type::text, set_variant from public.workout_sets where id=(select pyramid_set_id from phase187a_segment_ids)$$,
  $$values ('WORKING'::text, 'FULL_PYRAMID'::text)$$,
  'Full Pyramid creates one WORKING logical parent set'
);

select public.save_lifting_workout_advanced_set(
  (select drop_set_id from phase187a_segment_ids),
  'DROP',
  '[{"weightKg":100,"reps":8},{"weightKg":80,"reps":10},{"weightKg":60,"reps":12}]'::jsonb,
  true
);

select results_eq(
  $$select segment_index, weight_kg, reps from public.workout_set_segments where workout_set_id=(select drop_set_id from phase187a_segment_ids) order by segment_index$$,
  $$values (0,100::numeric,8),(1,80::numeric,10),(2,60::numeric,12)$$,
  'one completed Drop Set preserves all three ordered load/repetition stages'
);

select public.save_lifting_workout_advanced_set(
  (select pyramid_set_id from phase187a_segment_ids),
  'FULL_PYRAMID',
  '[{"weightKg":60,"reps":12},{"weightKg":80,"reps":8},{"weightKg":100,"reps":5},{"weightKg":80,"reps":8},{"weightKg":60,"reps":12}]'::jsonb,
  true
);

select results_eq(
  $$select count(*)::bigint from public.workout_sets where workout_exercise_id=(select workout_exercise_id from phase187a_segment_ids)$$,
  array[2::bigint],
  'Drop and Pyramid stages remain two logical sets rather than eight independent sets'
);

select results_eq(
  $$select weight_kg, reps from public.workout_sets where id=(select pyramid_set_id from phase187a_segment_ids)$$,
  $$values (100::numeric,5)$$,
  'Pyramid parent mirrors the best normal Epley stage for existing progression semantics'
);

update phase187a_segment_ids target
set pyramid_revision = (
  select revision from public.workout_sets where id=target.pyramid_set_id
);

select public.apply_lifting_workout_mutation(
  '187a1000-0000-4000-8000-000000000001',
  (select workout_id from phase187a_segment_ids),
  'SAVE_ADVANCED_SET',
  jsonb_build_object(
    'workoutSetId', (select pyramid_set_id from phase187a_segment_ids),
    'variant', 'FULL_PYRAMID',
    'segments', '[{"weightKg":65,"reps":12},{"weightKg":85,"reps":8},{"weightKg":105,"reps":5},{"weightKg":85,"reps":8},{"weightKg":65,"reps":12}]'::jsonb,
    'completed', true,
    'expectedRevision', (select pyramid_revision from phase187a_segment_ids)
  )
);

select public.apply_lifting_workout_mutation(
  '187a1000-0000-4000-8000-000000000001',
  (select workout_id from phase187a_segment_ids),
  'SAVE_ADVANCED_SET',
  jsonb_build_object(
    'workoutSetId', (select pyramid_set_id from phase187a_segment_ids),
    'variant', 'FULL_PYRAMID',
    'segments', '[{"weightKg":65,"reps":12},{"weightKg":85,"reps":8},{"weightKg":105,"reps":5},{"weightKg":85,"reps":8},{"weightKg":65,"reps":12}]'::jsonb,
    'completed', true,
    'expectedRevision', (select pyramid_revision from phase187a_segment_ids)
  )
);

select results_eq(
  $$select count(*)::bigint from public.workout_set_segments where workout_set_id=(select pyramid_set_id from phase187a_segment_ids)$$,
  array[5::bigint],
  'idempotent advanced-set replay does not duplicate child stages'
);

select results_eq(
  $$select mutation_kind from public.workout_mutation_receipts where user_id='a187a100-0000-4000-8000-000000000001' and idempotency_key='187a1000-0000-4000-8000-000000000001'$$,
  array['SAVE_ADVANCED_SET'::text],
  'segmented save is protected by the existing mutation receipt boundary'
);

select throws_ok(
  $$select public.save_lifting_workout_advanced_set((select pyramid_set_id from phase187a_segment_ids), 'FULL_PYRAMID', '[{"weightKg":100,"reps":5},{"weightKg":80,"reps":8}]'::jsonb, true)$$,
  '22023',
  'Advanced set segment count is invalid',
  'Full Pyramid requires at least three stages'
);

select public.finish_lifting_workout((select workout_id from phase187a_segment_ids));

select results_eq(
  $$select completed_working_sets::bigint, session_volume_kg_reps from public.get_my_exercise_progress_history((select exercise_id from phase187a_segment_ids)) where workout_id=(select workout_id from phase187a_segment_ids)$$,
  $$values (1::bigint, 5765::numeric)$$,
  'one Pyramid counts as one Working set while every Drop/Pyramid stage contributes volume'
);

select results_eq(
  $$select completed_working_sets, volume_kg_reps from public.get_my_lifting_calendar_summaries(1,1) where period_kind='WEEK'$$,
  $$values (1::bigint, 5765::numeric)$$,
  'weekly aggregate counts one logical Working set and sums every advanced stage'
);

select ok(
  exists (
    select 1
    from public.exercise_progress_observations o
    where o.user_id='a187a100-0000-4000-8000-000000000001'
      and o.exercise_id=(select exercise_id from phase187a_segment_ids)
      and o.weight_kg=105
      and o.reps=5
  ),
  'Pyramid best stage flows through the existing normal E1RM observation engine'
);

reset role;
select * from finish();
rollback;
