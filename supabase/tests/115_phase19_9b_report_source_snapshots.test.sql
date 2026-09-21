begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

select has_table('public','monthly_training_report_source_snapshots','monthly report source snapshot table exists');
select has_table('public','monthly_training_report_muscle_snapshots','monthly report muscle snapshot table exists');
select has_table('public','monthly_training_report_performance_snapshots','monthly report performance snapshot table exists');

select ok((select relrowsecurity from pg_class where oid='public.monthly_training_report_source_snapshots'::regclass),'source snapshot table has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.monthly_training_report_muscle_snapshots'::regclass),'muscle snapshot table has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.monthly_training_report_performance_snapshots'::regclass),'performance snapshot table has RLS enabled');

select has_function('public','get_my_completed_training_report_period',array['text','date'],'exact completed-period RPC exists');
select has_function('public','freeze_my_monthly_training_report_source',array['date'],'monthly snapshot wrapper RPC exists');

select ok(
  coalesce((
    select not p.prosecdef
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname='get_my_completed_training_report_period'
      and pg_get_function_identity_arguments(p.oid)='p_period_kind text, p_period_start date'
  ), false),
  'completed-period RPC is SECURITY INVOKER'
);

select ok(
  coalesce((
    select not p.prosecdef
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname='freeze_my_monthly_training_report_source'
      and pg_get_function_identity_arguments(p.oid)='p_month_start date'
  ), false),
  'public freeze RPC wrapper is SECURITY INVOKER'
);

select is(has_function_privilege('authenticated','public.get_my_completed_training_report_period(text,date)','execute'),true,'authenticated can execute completed-period RPC');
select is(has_function_privilege('anon','public.get_my_completed_training_report_period(text,date)','execute'),false,'anon cannot execute completed-period RPC');
select is(has_function_privilege('authenticated','public.freeze_my_monthly_training_report_source(date)','execute'),true,'authenticated can execute monthly freeze RPC');
select is(has_function_privilege('anon','public.freeze_my_monthly_training_report_source(date)','execute'),false,'anon cannot execute monthly freeze RPC');

select is(has_table_privilege('authenticated','public.monthly_training_report_source_snapshots','insert'),false,'authenticated cannot directly insert source snapshots');
select is(has_table_privilege('authenticated','public.monthly_training_report_source_snapshots','update'),false,'authenticated cannot directly update source snapshots');
select is(has_table_privilege('authenticated','public.monthly_training_report_source_snapshots','delete'),false,'authenticated cannot directly delete source snapshots');

insert into auth.users (id, email) values
  ('19900000-0000-4000-8000-000000000001', 'phase199-primary@test.local'),
  ('29900000-0000-4000-8000-000000000002', 'phase199-other@test.local');

update public.profiles
set username='phase199_primary', display_name='Phase 19.9 Primary',
    timezone='UTC', onboarding_completed_at=now()
where id='19900000-0000-4000-8000-000000000001';

update public.profiles
set username='phase199_other', display_name='Phase 19.9 Other',
    timezone='UTC', onboarding_completed_at=now()
where id='29900000-0000-4000-8000-000000000002';

create temporary table phase199_exercise (exercise_id uuid primary key) on commit drop;
insert into phase199_exercise(exercise_id)
select id from public.exercise_catalog
where canonical_name='Barbell Bench Press' and active
limit 1;

insert into public.workout_sessions (
  id,user_id,category,status,source,started_at,ended_at,
  active_duration_seconds,timezone_at_start,scoring_date,
  qualifies,needs_review,qualifies_lifting,qualifies_cardio_bonus
)
values
('19900000-0000-4000-8000-000000001000','19900000-0000-4000-8000-000000000001','STRENGTH','COMPLETED','IN_APP','2026-07-25T12:00:00Z','2026-07-25T13:00:00Z',3600,'UTC','2026-07-25',false,false,false,false),
('19900000-0000-4000-8000-000000001001','19900000-0000-4000-8000-000000000001','STRENGTH','COMPLETED','IN_APP','2026-08-05T12:00:00Z','2026-08-05T13:00:00Z',3600,'UTC','2026-08-05',false,false,false,false),
('19900000-0000-4000-8000-000000001002','19900000-0000-4000-8000-000000000001','STRENGTH','COMPLETED','IN_APP','2026-08-20T12:00:00Z','2026-08-20T13:00:00Z',3600,'UTC','2026-08-20',false,false,false,false);

insert into public.workout_exercises (id,workout_id,exercise_id,order_index)
values
('19900000-0000-4000-8000-000000002000','19900000-0000-4000-8000-000000001000',(select exercise_id from phase199_exercise),0),
('19900000-0000-4000-8000-000000002001','19900000-0000-4000-8000-000000001001',(select exercise_id from phase199_exercise),0),
('19900000-0000-4000-8000-000000002002','19900000-0000-4000-8000-000000001002',(select exercise_id from phase199_exercise),0);

insert into public.workout_sets (
  id,workout_exercise_id,set_number,set_type,weight_kg,reps,
  completed,completed_at,set_variant
)
values
('19900000-0000-4000-8000-000000003000','19900000-0000-4000-8000-000000002000',1,'WORKING',90,5,true,'2026-07-25T12:30:00Z','STANDARD'),
('19900000-0000-4000-8000-000000003001','19900000-0000-4000-8000-000000002001',1,'WORKING',100,5,true,'2026-08-05T12:30:00Z','STANDARD'),
('19900000-0000-4000-8000-000000003002','19900000-0000-4000-8000-000000002002',1,'WORKING',102.5,5,true,'2026-08-20T12:30:00Z','STANDARD');

select public.reconcile_lifting_v1_scoring_for_user(
  '19900000-0000-4000-8000-000000000001'
);

grant select on phase199_exercise to authenticated;

set local role authenticated;
set local request.jwt.claim.sub='19900000-0000-4000-8000-000000000001';

select results_eq(
  $$select count(*)::bigint from public.get_my_completed_training_report_period('MONTH','2026-08-01')$$,
  array[13::bigint],
  'completed August report returns all 13 benchmark muscle rows'
);

select results_eq(
  $$select distinct benchmark_window_days from public.get_my_completed_training_report_period('MONTH','2026-08-01')$$,
  array[28::smallint],
  'monthly report uses the 28-day benchmark'
);

select results_eq(
  $$select distinct completed_lifting_sessions,active_training_seconds,exercise_count,completed_working_sets,volume_kg_reps,pr_count
    from public.get_my_completed_training_report_period('MONTH','2026-08-01')$$,
  $$values (2::bigint,7200::bigint,1::bigint,2::bigint,1012.5::numeric,2::bigint)$$,
  'monthly report preserves exact completed lifting summary metrics'
);

select ok(
  (select period_effective_sets > 0
   from public.get_my_completed_training_report_period('MONTH','2026-08-01')
   where muscle_group='CHEST'),
  'monthly report contains positive Chest effective volume'
);

select throws_ok(
  $$select * from public.get_my_completed_training_report_period('WEEK','2026-08-04')$$,
  '22023',
  'Weekly report period must start on Monday',
  'weekly report rejects a non-Monday period start'
);

select throws_ok(
  $$select * from public.get_my_completed_training_report_period('MONTH','2026-09-01')$$,
  '22023',
  'Training report period must be fully completed',
  'monthly report rejects the current incomplete month'
);

create temporary table phase199_freeze (
  seq integer,
  snapshot_id uuid,
  created boolean,
  verified_at timestamptz,
  source_fingerprint text
) on commit drop;

insert into phase199_freeze
select 1, f.*
from public.freeze_my_monthly_training_report_source('2026-08-01') f;

insert into phase199_freeze
select 2, f.*
from public.freeze_my_monthly_training_report_source('2026-08-01') f;

select is((select created from phase199_freeze where seq=1),true,'first monthly freeze creates the snapshot');
select is((select created from phase199_freeze where seq=2),false,'second monthly freeze is idempotent');
select is((select snapshot_id from phase199_freeze where seq=1),(select snapshot_id from phase199_freeze where seq=2),'idempotent freeze returns the same snapshot id');
select is((select source_fingerprint from phase199_freeze where seq=1),(select source_fingerprint from phase199_freeze where seq=2),'idempotent freeze preserves the same source fingerprint');

select results_eq(
  $$select count(*)::bigint from public.monthly_training_report_muscle_snapshots$$,
  array[13::bigint],
  'frozen monthly source persists exactly 13 muscle rows'
);

select ok(
  (select count(*) > 0 from public.monthly_training_report_performance_snapshots),
  'frozen monthly source preserves normalized performance observations'
);

set local request.jwt.claim.sub='29900000-0000-4000-8000-000000000002';

select results_eq(
  $$select count(*)::bigint from public.monthly_training_report_source_snapshots$$,
  array[0::bigint],
  'RLS hides another user monthly source snapshot'
);

select * from finish();
rollback;
