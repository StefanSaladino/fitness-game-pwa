begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

select has_function('public','log_cardio_activity',array['workout_category','integer','text'],'cardio logger RPC exists');
select has_function('public','delete_cardio_activity',array['uuid'],'cardio delete RPC exists');
select has_function('public','get_my_cardio_history',array['integer'],'cardio history RPC exists');
select has_function('public','get_my_cardio_summary',array[]::text[],'cardio summary RPC exists');

insert into auth.users (id,email) values
 ('a1111111-1111-4111-8111-111111111111','phase11a@test.local'),
 ('a2222222-2222-4222-8222-222222222222','phase11b@test.local');
update public.profiles set username='phase11a',display_name='Phase 11 A',timezone='UTC',onboarding_completed_at=now() where id='a1111111-1111-4111-8111-111111111111';
update public.profiles set username='phase11b',display_name='Phase 11 B',timezone='UTC',onboarding_completed_at=now() where id='a2222222-2222-4222-8222-222222222222';

set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);

select lives_ok($$select public.log_cardio_activity('RUNNING',1200,'easy run')$$,'running can be logged');
select lives_ok($$select public.log_cardio_activity('WALKING_HIKING',1800,'walk')$$,'walking/hiking can be logged');
select lives_ok($$select public.log_cardio_activity('CYCLING',2400,'ride')$$,'cycling can be logged');
select lives_ok($$select public.log_cardio_activity('SWIMMING',2700,'pool')$$,'swimming can be logged');
select lives_ok($$select public.log_cardio_activity('SPORT',1200,'hockey')$$,'sport can be logged');
select lives_ok($$select public.log_cardio_activity('CARDIO',1200,'machine')$$,'generic cardio can be logged');
select lives_ok($$select public.log_cardio_activity('HIIT',720,'intervals')$$,'HIIT can be logged');
select throws_ok($$select public.log_cardio_activity('STRENGTH',1200,null)$$,'22023',null,'strength cannot enter through cardio logger');
select throws_ok($$select public.log_cardio_activity('RUNNING',59,null)$$,'22023',null,'sub-minute cardio is rejected');
select throws_ok($$select public.log_cardio_activity('RUNNING',21601,null)$$,'22023',null,'over-six-hour cardio is rejected');
select throws_ok($$select public.log_cardio_activity('RUNNING',1200,repeat('x',5001))$$,'22023',null,'oversized notes are rejected');
select is((select count(*)::integer from public.get_my_cardio_history(50)),7,'history returns all seven supported logged activities');
select is((select count(*)::integer from public.get_my_cardio_history(3)),3,'history server limit parameter is respected');
select ok((select every(category <> 'STRENGTH') from public.get_my_cardio_history(50)),'cardio history excludes lifting sessions');
select ok((select bool_or(notes='easy run') from public.get_my_cardio_history(50)),'cardio history preserves optional notes');

reset role;
-- Normalize four activities onto one deterministic scoring date so best-of-day
-- bonus reconciliation can be asserted independently of test execution time.
update public.workout_sessions set started_at=(current_date + time '12:00') at time zone 'UTC',ended_at=((current_date + time '12:00') at time zone 'UTC') + interval '20 minutes',active_duration_seconds=1200 where user_id='a1111111-1111-4111-8111-111111111111' and category='RUNNING';
update public.workout_sessions set started_at=(current_date + time '13:00') at time zone 'UTC',ended_at=((current_date + time '13:00') at time zone 'UTC') + interval '30 minutes',active_duration_seconds=1800 where user_id='a1111111-1111-4111-8111-111111111111' and category='WALKING_HIKING';
update public.workout_sessions set started_at=(current_date + time '14:00') at time zone 'UTC',ended_at=((current_date + time '14:00') at time zone 'UTC') + interval '40 minutes',active_duration_seconds=2400 where user_id='a1111111-1111-4111-8111-111111111111' and category='CYCLING';
update public.workout_sessions set started_at=(current_date + time '15:00') at time zone 'UTC',ended_at=((current_date + time '15:00') at time zone 'UTC') + interval '45 minutes',active_duration_seconds=2700 where user_id='a1111111-1111-4111-8111-111111111111' and category='SWIMMING';

select is((select count(*)::integer from public.scoring_events where user_id='a1111111-1111-4111-8111-111111111111' and scoring_date=current_date and event_type='CARDIO_BONUS' and scoring_version='lifting-v1'),1,'same-day cardio creates exactly one bonus event');
select is((select amount from public.scoring_events where user_id='a1111111-1111-4111-8111-111111111111' and scoring_date=current_date and event_type='CARDIO_BONUS' and scoring_version='lifting-v1'),15,'45-minute eligible activity owns the 15 XP daily bonus');
select is((select w.category::text from public.scoring_events se join public.workout_sessions w on w.id=se.workout_id where se.user_id='a1111111-1111-4111-8111-111111111111' and se.scoring_date=current_date and se.event_type='CARDIO_BONUS'),'SWIMMING','daily bonus points at the best cardio source activity');
select is((select count(*)::integer from public.scoring_events where user_id='a1111111-1111-4111-8111-111111111111' and event_type='LIFTING_WORKOUT'),0,'cardio never manufactures lifting-workout XP');

set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
select is((select daily_bonus_xp from public.get_my_cardio_history(50) where category='SWIMMING'),15,'history identifies the activity currently owning the daily bonus');
select is((select daily_bonus_xp from public.get_my_cardio_history(50) where category='CYCLING'),0,'eligible lower-tier same-day activity does not stack XP');
select is((select total_activities::integer from public.get_my_cardio_summary()),7,'summary counts logged cardio activities');
select cmp_ok((select total_active_minutes from public.get_my_cardio_summary()),'>=',132::bigint,'summary aggregates cardio active minutes');
select cmp_ok((select last_30_days_bonus_xp from public.get_my_cardio_summary()),'>=',15::bigint,'summary aggregates authoritative recent cardio XP');
select lives_ok($$select public.delete_cardio_activity((select workout_id from public.get_my_cardio_history(50) where category='SWIMMING' limit 1))$$,'user can delete own cardio correction');
reset role;
select is((select amount from public.scoring_events where user_id='a1111111-1111-4111-8111-111111111111' and scoring_date=current_date and event_type='CARDIO_BONUS'),10,'deleting the best activity reconciles the day to the next cardio tier');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2222222-2222-4222-8222-222222222222',true);
select throws_ok($$select public.delete_cardio_activity((select id from public.workout_sessions where user_id='a1111111-1111-4111-8111-111111111111' and category='CYCLING' limit 1))$$,'22023',null,'another user cannot delete a cardio activity they do not own');
select is((select total_activities::integer from public.get_my_cardio_summary()),0,'summary is scoped to the authenticated user');
select is((select count(*)::integer from public.get_my_cardio_history(50)),0,'history is scoped to the authenticated user');
reset role;

select ok(not exists(select 1 from public.weekly_lifting_snapshots where user_id='a1111111-1111-4111-8111-111111111111' and lifting_days>0),'cardio logging does not create lifting-day weekly consistency');

select * from finish();
rollback;
