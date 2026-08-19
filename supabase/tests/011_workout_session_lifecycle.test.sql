begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

select has_function('public', 'start_or_resume_lifting_workout', array[]::text[], 'start/resume lifting RPC exists');
select has_function('public', 'pause_lifting_workout', array['uuid'], 'pause lifting RPC exists');
select has_function('public', 'resume_lifting_workout', array['uuid'], 'resume lifting RPC exists');
select has_function('public', 'finish_lifting_workout', array['uuid'], 'finish lifting RPC exists');
select has_function('public', 'cancel_lifting_workout', array['uuid'], 'cancel lifting RPC exists');
select has_column('public', 'workout_sessions', 'paused_at', 'workout session records pause state');
select has_column('public', 'workout_sessions', 'last_resumed_at', 'workout session records active interval start');
select results_eq(
  $$select count(*)::bigint from pg_indexes where schemaname='public' and indexname='workout_sessions_one_active_in_app_lift'$$,
  array[1::bigint],
  'one-active-lift unique index exists'
);

select is(has_function_privilege('authenticated', 'public.start_or_resume_lifting_workout()', 'execute'), true, 'authenticated can start/resume lift');
select is(has_function_privilege('anon', 'public.start_or_resume_lifting_workout()', 'execute'), false, 'anon cannot start/resume lift');
select is(has_function_privilege('authenticated', 'public.pause_lifting_workout(uuid)', 'execute'), true, 'authenticated can pause lift');
select is(has_function_privilege('anon', 'public.pause_lifting_workout(uuid)', 'execute'), false, 'anon cannot pause lift');
select is(has_function_privilege('authenticated', 'public.resume_lifting_workout(uuid)', 'execute'), true, 'authenticated can resume lift');
select is(has_function_privilege('anon', 'public.resume_lifting_workout(uuid)', 'execute'), false, 'anon cannot resume lift');
select is(has_function_privilege('authenticated', 'public.finish_lifting_workout(uuid)', 'execute'), true, 'authenticated can finish lift');
select is(has_function_privilege('anon', 'public.finish_lifting_workout(uuid)', 'execute'), false, 'anon cannot finish lift');
select is(has_function_privilege('authenticated', 'public.cancel_lifting_workout(uuid)', 'execute'), true, 'authenticated can cancel lift');
select is(has_function_privilege('anon', 'public.cancel_lifting_workout(uuid)', 'execute'), false, 'anon cannot cancel lift');
select is(has_table_privilege('authenticated', 'public.workout_sessions', 'insert'), false, 'authenticated cannot directly insert workout sessions');
select is(has_table_privilege('authenticated', 'public.workout_sessions', 'update'), false, 'authenticated cannot directly update workout sessions');
select is(has_table_privilege('authenticated', 'public.workout_sessions', 'delete'), false, 'authenticated cannot directly delete workout sessions');

insert into auth.users (id, email) values
  ('a1111111-1111-4111-8111-111111111111', 'workout-owner@test.local'),
  ('a2222222-2222-4222-8222-222222222222', 'workout-other@test.local');

set local role authenticated;
set local request.jwt.claim.sub = 'a1111111-1111-4111-8111-111111111111';

create temporary table phase61_ids(first_id uuid, second_id uuid, cancelled_id uuid) on commit drop;
insert into phase61_ids(first_id)
select public.start_or_resume_lifting_workout();
update phase61_ids set second_id = public.start_or_resume_lifting_workout();

select is((select first_id = second_id from phase61_ids), true, 'start is idempotent while an active lift exists');
select results_eq(
  $$select count(*) from public.workout_sessions where user_id='a1111111-1111-4111-8111-111111111111' and category='STRENGTH' and source='IN_APP' and status='IN_PROGRESS'$$,
  array[1::bigint],
  'only one active in-app lifting session exists'
);

select public.pause_lifting_workout((select first_id from phase61_ids));
select results_eq(
  $$select (paused_at is not null and last_resumed_at is null)::text from public.workout_sessions where id=(select first_id from phase61_ids)$$,
  array['true'::text],
  'pause persists a stopped timer state'
);
select public.resume_lifting_workout((select first_id from phase61_ids));
select results_eq(
  $$select (paused_at is null and last_resumed_at is not null)::text from public.workout_sessions where id=(select first_id from phase61_ids)$$,
  array['true'::text],
  'resume persists a running timer state'
);

select public.finish_lifting_workout((select first_id from phase61_ids));
update phase61_ids set cancelled_id = public.start_or_resume_lifting_workout();
select public.cancel_lifting_workout((select cancelled_id from phase61_ids));

select results_eq(
  $$select status::text from public.workout_sessions where id=(select first_id from phase61_ids)$$,
  array['COMPLETED'::text],
  'finish transitions the active lift to completed'
);
select results_eq(
  $$select status::text from public.workout_sessions where id=(select cancelled_id from phase61_ids)$$,
  array['CANCELLED'::text],
  'cancel transitions the active lift to cancelled'
);

set local request.jwt.claim.sub = 'a2222222-2222-4222-8222-222222222222';
select throws_ok(
  $$select public.finish_lifting_workout((select first_id from phase61_ids))$$,
  '42501',
  'Active lifting workout not found',
  'another user cannot mutate a lifting session'
);

reset role;
select * from finish();
rollback;
