begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select has_function(
  'public',
  'complete_onboarding',
  array['text', 'text', 'text', 'smallint'],
  'Phase 5 complete_onboarding accepts username, display name, timezone, and weekly target'
);

select is(
  to_regprocedure('public.complete_onboarding(text,text,smallint)') is null,
  true,
  'legacy three-argument onboarding overload is removed'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('82111111-1111-4111-8111-111111111111', 'taken@test.local', '{"display_name":"Taken"}'::jsonb),
  ('82222222-2222-4222-8222-222222222222', 'candidate@test.local', '{"display_name":"Candidate"}'::jsonb),
  ('82333333-3333-4333-8333-333333333333', 'valid@test.local', '{"display_name":"Valid"}'::jsonb);

update public.profiles
set username = 'taken_name'
where id = '82111111-1111-4111-8111-111111111111';

set local role authenticated;
set local request.jwt.claim.sub = '82222222-2222-4222-8222-222222222222';

select throws_ok(
  $$select public.complete_onboarding('bad-name!', 'Candidate', 'America/Toronto', 3::smallint)$$,
  '22023',
  'Username must be 3-32 lowercase letters, numbers, or underscores',
  'invalid username characters are rejected'
);

select is(
  (select onboarding_completed_at is null from public.profiles where id = '82222222-2222-4222-8222-222222222222'),
  true,
  'failed username validation does not partially complete onboarding'
);

select throws_ok(
  $$select public.complete_onboarding('taken_name', 'Candidate', 'America/Toronto', 3::smallint)$$,
  '23505',
  'Username already taken',
  'duplicate canonical usernames are rejected explicitly'
);

select is(
  (select onboarding_completed_at is null from public.profiles where id = '82222222-2222-4222-8222-222222222222'),
  true,
  'duplicate username failure remains atomic'
);

set local request.jwt.claim.sub = '82333333-3333-4333-8333-333333333333';

select lives_ok(
  $$select public.complete_onboarding('  Valid_User  ', '  Valid Athlete  ', 'America/Toronto', 5::smallint)$$,
  'valid onboarding completes with normalized username and display name'
);

select results_eq(
  $$select username, display_name, timezone, weekly_workout_target from public.profiles where id = '82333333-3333-4333-8333-333333333333'$$,
  $$values ('valid_user'::text, 'Valid Athlete'::text, 'America/Toronto'::text, 5::smallint)$$,
  'onboarding persists normalized profile fields atomically'
);

select is(
  (
    select count(*)::integer
    from public.weekly_goals
    where user_id = '82333333-3333-4333-8333-333333333333'
      and target = 5
  ),
  1,
  'successful onboarding creates exactly one current weekly-goal snapshot'
);

select * from finish();
rollback;
