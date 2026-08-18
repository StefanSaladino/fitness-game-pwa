begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data)
values ('81111111-1111-4111-8111-111111111111', 'onboarding@test.local', '{"display_name":"Initial"}'::jsonb);

set local role authenticated;
set local request.jwt.claim.sub = '81111111-1111-4111-8111-111111111111';

select is((select weekly_workout_target from public.profiles where id='81111111-1111-4111-8111-111111111111'), 3::smallint, 'new profile starts with default target 3');
select is((select onboarding_completed_at is null from public.profiles where id='81111111-1111-4111-8111-111111111111'), true, 'new profile is not automatically onboarded');
select lives_ok($$select public.complete_onboarding('Stefan Test','America/Toronto',4::smallint)$$, 'user can complete onboarding once');
select is((select weekly_workout_target from public.profiles where id='81111111-1111-4111-8111-111111111111'), 4::smallint, 'onboarding sets current weekly target');
select results_eq(
  $$select target from public.weekly_goals where user_id='81111111-1111-4111-8111-111111111111'$$,
  array[4::smallint], 'onboarding snapshots current target into weekly goals'
);
select throws_ok(
  $$select public.complete_onboarding('Again','America/Toronto',2::smallint)$$,
  '22023', 'Onboarding already completed', 'complete_onboarding cannot be reused to rewrite current target'
);
select lives_ok($$select public.schedule_weekly_target(5::smallint)$$, 'user can schedule a future weekly target');
select results_eq(
  $$select weekly_workout_target, pending_weekly_workout_target from public.profiles where id='81111111-1111-4111-8111-111111111111'$$,
  $$values (4::smallint, 5::smallint)$$,
  'scheduling changes pending target without rewriting current target'
);

select * from finish();
rollback;
