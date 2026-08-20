begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_function('public', 'start_or_resume_lifting_workout_intent', array['timestamp with time zone'], 'intent-aware start RPC exists');
select has_function('public', 'pause_lifting_workout_intent', array['uuid','timestamp with time zone'], 'intent-aware pause RPC exists');
select has_function('public', 'resume_lifting_workout_intent', array['uuid','timestamp with time zone'], 'intent-aware resume RPC exists');
select is(has_function_privilege('authenticated', 'public.start_or_resume_lifting_workout_intent(timestamptz)', 'execute'), true, 'authenticated can start with action timestamp');
select is(has_function_privilege('anon', 'public.start_or_resume_lifting_workout_intent(timestamptz)', 'execute'), false, 'anon cannot start with action timestamp');
select is(has_function_privilege('authenticated', 'public.pause_lifting_workout_intent(uuid,timestamptz)', 'execute'), true, 'authenticated can pause with action timestamp');
select is(has_function_privilege('anon', 'public.pause_lifting_workout_intent(uuid,timestamptz)', 'execute'), false, 'anon cannot pause with action timestamp');
select is(has_function_privilege('authenticated', 'public.resume_lifting_workout_intent(uuid,timestamptz)', 'execute'), true, 'authenticated can resume with action timestamp');
select is(has_function_privilege('anon', 'public.resume_lifting_workout_intent(uuid,timestamptz)', 'execute'), false, 'anon cannot resume with action timestamp');

insert into auth.users (id, email) values
  ('a5111111-1111-4111-8111-111111111111', 'timer-intent@test.local');

set local role authenticated;
set local request.jwt.claim.sub = 'a5111111-1111-4111-8111-111111111111';

create temporary table phase_timer_intent(
  base_at timestamptz,
  workout_id uuid
) on commit drop;
insert into phase_timer_intent(base_at) values (clock_timestamp());

update phase_timer_intent
set workout_id = (public.start_or_resume_lifting_workout_intent(base_at - interval '8 seconds')->>'id')::uuid;

select results_eq(
  $$select round(extract(epoch from (started_at - ((select base_at from phase_timer_intent) - interval '8 seconds'))))::bigint from public.workout_sessions where id=(select workout_id from phase_timer_intent)$$,
  array[0::bigint],
  'start uses the user action timestamp instead of request completion time'
);

select is(
  (public.pause_lifting_workout_intent((select workout_id from phase_timer_intent), (select base_at from phase_timer_intent) - interval '4 seconds')->>'active_duration_seconds')::integer,
  4,
  'pause counts only active time through the user pause action'
);

select results_eq(
  $$select (paused_at is not null and last_resumed_at is null)::text from public.workout_sessions where id=(select workout_id from phase_timer_intent)$$,
  array['true'::text],
  'intent-aware pause persists stopped state'
);

select lives_ok(
  $$select public.resume_lifting_workout_intent((select workout_id from phase_timer_intent), (select base_at from phase_timer_intent) - interval '2 seconds')$$,
  'resume accepts a recent user action timestamp'
);

select lives_ok(
  $$select public.pause_lifting_workout_intent((select workout_id from phase_timer_intent), (select base_at from phase_timer_intent))$$,
  'a second pause can use a later action timestamp'
);

select results_eq(
  $$select active_duration_seconds::bigint from public.workout_sessions where id=(select workout_id from phase_timer_intent)$$,
  array[6::bigint],
  'resume-to-pause interval adds exactly the intended two seconds'
);

select results_eq(
  $$select jsonb_typeof(public.start_or_resume_lifting_workout_intent(clock_timestamp()))$$,
  array['object'::text],
  'intent-aware lifecycle RPC returns the session snapshot in one round trip'
);

reset role;
select * from finish();
rollback;
