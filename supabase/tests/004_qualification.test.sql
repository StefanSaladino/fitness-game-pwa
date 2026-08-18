begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values ('71111111-1111-4111-8111-111111111111', 'qual@test.local');

insert into public.workout_sessions (id,user_id,category,status,source,started_at,active_duration_seconds,timezone_at_start,scoring_date) values
 ('70000000-0000-4000-8000-000000000001','71111111-1111-4111-8111-111111111111','RUNNING','COMPLETED','MANUAL',now(),899,'America/Toronto',current_date),
 ('70000000-0000-4000-8000-000000000002','71111111-1111-4111-8111-111111111111','RUNNING','COMPLETED','MANUAL',now(),900,'America/Toronto',current_date),
 ('70000000-0000-4000-8000-000000000003','71111111-1111-4111-8111-111111111111','HIIT','COMPLETED','MANUAL',now(),719,'America/Toronto',current_date),
 ('70000000-0000-4000-8000-000000000004','71111111-1111-4111-8111-111111111111','HIIT','COMPLETED','MANUAL',now(),720,'America/Toronto',current_date),
 ('70000000-0000-4000-8000-000000000005','71111111-1111-4111-8111-111111111111','SPORT','COMPLETED','MANUAL',now(),1200,'America/Toronto',current_date),
 ('70000000-0000-4000-8000-000000000006','71111111-1111-4111-8111-111111111111','RUNNING','IN_PROGRESS','IN_APP',now(),5000,'America/Toronto',current_date),
 ('70000000-0000-4000-8000-000000000007','71111111-1111-4111-8111-111111111111','RUNNING','COMPLETED','MANUAL',now(),21601,'America/Toronto',current_date);

select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000001'), false, 'run fails one second below threshold');
select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000002'), true, 'run qualifies exactly at threshold');
select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000003'), false, 'HIIT fails one second below threshold');
select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000004'), true, 'HIIT qualifies exactly at threshold');
select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000005'), true, 'sport qualifies at 20 minutes');
select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000006'), false, 'in-progress workout never qualifies');
select is((select needs_review from public.workout_sessions where id='70000000-0000-4000-8000-000000000007'), true, 'workout over six hours is flagged for review');
select is((select qualifies from public.workout_sessions where id='70000000-0000-4000-8000-000000000007'), false, 'review-required workout does not auto-qualify');
select is((select scoring_date from public.workout_sessions where id='70000000-0000-4000-8000-000000000002'), (now() at time zone 'America/Toronto')::date, 'scoring date is derived from start timezone');

select * from finish();
rollback;
