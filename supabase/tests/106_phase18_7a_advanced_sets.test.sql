begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select has_function(
  'public',
  'add_lifting_workout_set',
  array['uuid', 'set_type'],
  'guarded ordinary set-add RPC remains available'
);

select has_function(
  'public',
  'save_lifting_workout_set',
  array['uuid', 'set_type', 'numeric', 'integer', 'text', 'boolean'],
  'guarded ordinary set-save RPC remains available'
);

select is(
  has_function_privilege('authenticated', 'public.add_lifting_workout_set(uuid,set_type)', 'execute'),
  true,
  'authenticated can add guarded ordinary workout sets'
);
select is(
  has_function_privilege('anon', 'public.add_lifting_workout_set(uuid,set_type)', 'execute'),
  false,
  'anon cannot add guarded ordinary workout sets'
);

insert into auth.users (id, email) values
  ('a187a000-0000-4000-8000-000000000001', 'phase187a-flat-write-guard@test.local');

set local role authenticated;
set local request.jwt.claim.sub = 'a187a000-0000-4000-8000-000000000001';

create temporary table phase187a_ids(
  workout_id uuid,
  exercise_id uuid,
  workout_exercise_id uuid,
  working_set_id uuid
) on commit drop;

insert into phase187a_ids(exercise_id)
select id
from public.exercise_catalog
where canonical_name = 'Barbell Bench Press'
  and active = true
limit 1;

select ok(
  (select exercise_id is not null from phase187a_ids),
  'canonical weighted exercise required by the advanced-set boundary exists'
);

update phase187a_ids
set workout_id = public.start_or_resume_lifting_workout();

update phase187a_ids target
set workout_exercise_id = public.add_lifting_workout_exercise(target.workout_id, target.exercise_id);

select throws_ok(
  $$select public.add_lifting_workout_set((select workout_exercise_id from phase187a_ids), 'DROP')$$,
  '22023',
  'Set type is not supported',
  'new Drop Sets cannot be created through the flat ordinary-set boundary'
);

update phase187a_ids target
set working_set_id = public.add_lifting_workout_set(target.workout_exercise_id, 'WORKING');

select throws_ok(
  $$select public.save_lifting_workout_set((select working_set_id from phase187a_ids), 'DROP', 80, 8, null, true)$$,
  '22023',
  'Set type is not supported',
  'ordinary sets cannot be converted to flat Drop Sets through the ordinary save boundary'
);

select throws_ok(
  $$select public.add_lifting_workout_set((select workout_exercise_id from phase187a_ids), 'FAILURE')$$,
  '22023',
  'Set type is not supported',
  'advanced-set work does not silently enable FAILURE sets'
);

reset role;
select * from finish();
rollback;
