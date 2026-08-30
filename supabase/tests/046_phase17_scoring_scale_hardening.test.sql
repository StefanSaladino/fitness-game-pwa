begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select has_function(
  'private',
  'reconcile_lifting_v1_scoring_from_date',
  array['uuid','date'],
  'suffix lifting reconciliation function exists'
);
select has_function(
  'private',
  'purge_expired_workout_mutation_receipts',
  array['timestamp with time zone'],
  'receipt retention function exists'
);
select is(
  has_function_privilege(
    'authenticated',
    'private.reconcile_lifting_v1_scoring_from_date(uuid,date)',
    'execute'
  ),
  false,
  'browser users cannot invoke suffix reconciliation directly'
);
select is(
  has_function_privilege(
    'authenticated',
    'private.purge_expired_workout_mutation_receipts(timestamptz)',
    'execute'
  ),
  false,
  'browser users cannot invoke receipt retention directly'
);
select is(
  (
    select count(*)::integer
    from cron.job
    where jobname = 'fitness-workout-receipt-retention'
      and schedule = '17 4 * * *'
      and active
  ),
  1,
  'one daily workout receipt-retention job is active'
);

insert into auth.users (id, email) values
  ('46111111-1111-4111-8111-111111111111', 'phase17-scale@test.local');

insert into public.exercise_catalog (
  id, canonical_name, measurement_type, active
) values (
  '46000000-0000-4000-8000-000000000001',
  'Phase 17 Scale Bench',
  'WEIGHT_REPS',
  true
);

-- Three qualifying days. One exercise with four completed working sets is enough
-- for lifting qualification, and the day-two/day-three PBs make suffix parity visible.
insert into public.workout_sessions (
  id, user_id, category, status, source, started_at, ended_at,
  active_duration_seconds, timezone_at_start, scoring_date
) values (
  '46200000-0000-4000-8000-000000000001',
  '46111111-1111-4111-8111-111111111111',
  'STRENGTH','IN_PROGRESS','IN_APP','2026-06-01 12:00+00',null,1200,'UTC','2026-06-01'
);
insert into public.workout_exercises (id, workout_id, exercise_id, order_index) values (
  '46300000-0000-4000-8000-000000000001',
  '46200000-0000-4000-8000-000000000001',
  '46000000-0000-4000-8000-000000000001',0
);
insert into public.workout_sets (
  id, workout_exercise_id, set_number, set_type, weight_kg, reps, completed, completed_at
) values
  ('46400000-0000-4000-8000-000000000011','46300000-0000-4000-8000-000000000001',1,'WORKING',100,10,true,'2026-06-01 12:10+00'),
  ('46400000-0000-4000-8000-000000000012','46300000-0000-4000-8000-000000000001',2,'WORKING',100,10,true,'2026-06-01 12:11+00'),
  ('46400000-0000-4000-8000-000000000013','46300000-0000-4000-8000-000000000001',3,'WORKING',100,10,true,'2026-06-01 12:12+00'),
  ('46400000-0000-4000-8000-000000000014','46300000-0000-4000-8000-000000000001',4,'WORKING',100,10,true,'2026-06-01 12:13+00');
update public.workout_sessions
set status='COMPLETED', ended_at='2026-06-01 12:20+00'
where id='46200000-0000-4000-8000-000000000001';

insert into public.workout_sessions (
  id, user_id, category, status, source, started_at, ended_at,
  active_duration_seconds, timezone_at_start, scoring_date
) values (
  '46200000-0000-4000-8000-000000000002',
  '46111111-1111-4111-8111-111111111111',
  'STRENGTH','IN_PROGRESS','IN_APP','2026-06-02 12:00+00',null,1200,'UTC','2026-06-02'
);
insert into public.workout_exercises (id, workout_id, exercise_id, order_index) values (
  '46300000-0000-4000-8000-000000000002',
  '46200000-0000-4000-8000-000000000002',
  '46000000-0000-4000-8000-000000000001',0
);
insert into public.workout_sets (
  id, workout_exercise_id, set_number, set_type, weight_kg, reps, completed, completed_at
) values
  ('46400000-0000-4000-8000-000000000021','46300000-0000-4000-8000-000000000002',1,'WORKING',103,10,true,'2026-06-02 12:10+00'),
  ('46400000-0000-4000-8000-000000000022','46300000-0000-4000-8000-000000000002',2,'WORKING',100,10,true,'2026-06-02 12:11+00'),
  ('46400000-0000-4000-8000-000000000023','46300000-0000-4000-8000-000000000002',3,'WORKING',100,10,true,'2026-06-02 12:12+00'),
  ('46400000-0000-4000-8000-000000000024','46300000-0000-4000-8000-000000000002',4,'WORKING',100,10,true,'2026-06-02 12:13+00');
update public.workout_sessions
set status='COMPLETED', ended_at='2026-06-02 12:20+00'
where id='46200000-0000-4000-8000-000000000002';

insert into public.workout_sessions (
  id, user_id, category, status, source, started_at, ended_at,
  active_duration_seconds, timezone_at_start, scoring_date
) values (
  '46200000-0000-4000-8000-000000000003',
  '46111111-1111-4111-8111-111111111111',
  'STRENGTH','IN_PROGRESS','IN_APP','2026-06-03 12:00+00',null,1200,'UTC','2026-06-03'
);
insert into public.workout_exercises (id, workout_id, exercise_id, order_index) values (
  '46300000-0000-4000-8000-000000000003',
  '46200000-0000-4000-8000-000000000003',
  '46000000-0000-4000-8000-000000000001',0
);
insert into public.workout_sets (
  id, workout_exercise_id, set_number, set_type, weight_kg, reps, completed, completed_at
) values
  ('46400000-0000-4000-8000-000000000031','46300000-0000-4000-8000-000000000003',1,'WORKING',106,10,true,'2026-06-03 12:10+00'),
  ('46400000-0000-4000-8000-000000000032','46300000-0000-4000-8000-000000000003',2,'WORKING',100,10,true,'2026-06-03 12:11+00'),
  ('46400000-0000-4000-8000-000000000033','46300000-0000-4000-8000-000000000003',3,'WORKING',100,10,true,'2026-06-03 12:12+00'),
  ('46400000-0000-4000-8000-000000000034','46300000-0000-4000-8000-000000000003',4,'WORKING',100,10,true,'2026-06-03 12:13+00');
update public.workout_sessions
set status='COMPLETED', ended_at='2026-06-03 12:20+00'
where id='46200000-0000-4000-8000-000000000003';

select is(
  (
    select coalesce(sum(amount),0)::integer
    from public.scoring_events
    where user_id='46111111-1111-4111-8111-111111111111'
      and scoring_date='2026-06-02'
      and event_type='EXERCISE_PROGRESS'
      and scoring_version='lifting-v1'
  ),
  10,
  'day two initially earns the 2.5-percent E1RM progression tier'
);
select is(
  (
    select coalesce(sum(amount),0)::integer
    from public.scoring_events
    where user_id='46111111-1111-4111-8111-111111111111'
      and scoring_date='2026-06-03'
      and event_type='EXERCISE_PROGRESS'
      and scoring_version='lifting-v1'
  ),
  10,
  'day three initially compares against the day-two PB'
);

create temporary table phase17_prefix_ids as
select coalesce(string_agg(id::text, ',' order by id::text), '') as ids
from public.scoring_events
where user_id='46111111-1111-4111-8111-111111111111'
  and scoring_date='2026-06-01'
  and scoring_version='lifting-v1';

-- Historical correction: day two no longer exceeds day one's PB. The source
-- trigger must rebuild June 2 onward, which makes June 3 compare with June 1.
update public.workout_sets
set weight_kg=100
where id='46400000-0000-4000-8000-000000000021';

select is(
  (
    select coalesce(sum(amount),0)::integer
    from public.scoring_events
    where user_id='46111111-1111-4111-8111-111111111111'
      and scoring_date='2026-06-02'
      and event_type='EXERCISE_PROGRESS'
      and scoring_version='lifting-v1'
  ),
  0,
  'historical correction removes obsolete day-two progress XP'
);
select is(
  (
    select coalesce(sum(amount),0)::integer
    from public.scoring_events
    where user_id='46111111-1111-4111-8111-111111111111'
      and scoring_date='2026-06-03'
      and event_type='EXERCISE_PROGRESS'
      and scoring_version='lifting-v1'
  ),
  15,
  'historical correction recalculates later progress XP against the preserved PB'
);
select is(
  (
    select coalesce(string_agg(id::text, ',' order by id::text), '')
    from public.scoring_events
    where user_id='46111111-1111-4111-8111-111111111111'
      and scoring_date='2026-06-01'
      and scoring_version='lifting-v1'
  ),
  (select ids from phase17_prefix_ids),
  'suffix reconciliation leaves unaffected prefix scoring rows untouched'
);

create temporary table phase17_suffix_fingerprints(
  name text primary key,
  value text not null
) on commit drop;

insert into phase17_suffix_fingerprints(name,value)
select 'scoring', coalesce(jsonb_agg(
  jsonb_build_object(
    'scoring_date', scoring_date,
    'workout_id', workout_id,
    'exercise_id', exercise_id,
    'event_type', event_type,
    'amount', amount,
    'scoring_version', scoring_version,
    'metadata', metadata
  )
  order by scoring_date, event_type, coalesce(exercise_id::text,''), workout_id::text
), '[]'::jsonb)::text
from public.scoring_events
where user_id='46111111-1111-4111-8111-111111111111'
  and scoring_version='lifting-v1';

insert into phase17_suffix_fingerprints(name,value)
select 'observations', coalesce(jsonb_agg(
  jsonb_build_object(
    'workout_id', workout_id,
    'exercise_id', exercise_id,
    'metric_type', metric_type,
    'metric_value', metric_value,
    'weight_kg', weight_kg,
    'reps', reps,
    'scoring_date', scoring_date,
    'valid', valid,
    'created_at', created_at
  )
  order by created_at, workout_id, exercise_id, metric_type
), '[]'::jsonb)::text
from public.exercise_progress_observations
where user_id='46111111-1111-4111-8111-111111111111';

insert into phase17_suffix_fingerprints(name,value)
select 'progress', coalesce(jsonb_agg(
  jsonb_build_object(
    'exercise_id', exercise_id,
    'metric_type', metric_type,
    'best_value', best_value,
    'best_weight_kg', best_weight_kg,
    'best_reps', best_reps,
    'source_workout_id', source_workout_id,
    'achieved_at', achieved_at
  )
  order by exercise_id, metric_type
), '[]'::jsonb)::text
from public.exercise_progress
where user_id='46111111-1111-4111-8111-111111111111';

-- The full reconciler remains the oracle. Exact semantic fingerprints must match.
select public.reconcile_lifting_v1_scoring_for_user(
  '46111111-1111-4111-8111-111111111111'
);

select is(
  (select value from phase17_suffix_fingerprints where name='scoring'),
  (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'scoring_date', scoring_date,
        'workout_id', workout_id,
        'exercise_id', exercise_id,
        'event_type', event_type,
        'amount', amount,
        'scoring_version', scoring_version,
        'metadata', metadata
      )
      order by scoring_date, event_type, coalesce(exercise_id::text,''), workout_id::text
    ), '[]'::jsonb)::text
    from public.scoring_events
    where user_id='46111111-1111-4111-8111-111111111111'
      and scoring_version='lifting-v1'
  ),
  'suffix scoring events exactly match a full authoritative rebuild'
);
select is(
  (select value from phase17_suffix_fingerprints where name='observations'),
  (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'workout_id', workout_id,
        'exercise_id', exercise_id,
        'metric_type', metric_type,
        'metric_value', metric_value,
        'weight_kg', weight_kg,
        'reps', reps,
        'scoring_date', scoring_date,
        'valid', valid,
        'created_at', created_at
      )
      order by created_at, workout_id, exercise_id, metric_type
    ), '[]'::jsonb)::text
    from public.exercise_progress_observations
    where user_id='46111111-1111-4111-8111-111111111111'
  ),
  'suffix progress observations exactly match a full authoritative rebuild'
);
select is(
  (select value from phase17_suffix_fingerprints where name='progress'),
  (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'exercise_id', exercise_id,
        'metric_type', metric_type,
        'best_value', best_value,
        'best_weight_kg', best_weight_kg,
        'best_reps', best_reps,
        'source_workout_id', source_workout_id,
        'achieved_at', achieved_at
      )
      order by exercise_id, metric_type
    ), '[]'::jsonb)::text
    from public.exercise_progress
    where user_id='46111111-1111-4111-8111-111111111111'
  ),
  'suffix current PB state exactly matches a full authoritative rebuild'
);

-- Receipt retention: old completed/non-active journals are disposable; recent
-- or still-active workout journals remain protected.
insert into public.workout_sessions (
  id, user_id, category, status, source, started_at, ended_at,
  active_duration_seconds, timezone_at_start, scoring_date
) values (
  '46200000-0000-4000-8000-000000000004',
  '46111111-1111-4111-8111-111111111111',
  'STRENGTH','IN_PROGRESS','IN_APP','2026-08-30 12:00+00',null,0,'UTC','2026-08-30'
);

insert into public.workout_mutation_receipts (
  user_id,idempotency_key,workout_id,mutation_kind,request_payload,result_payload,created_at,completed_at
) values
  (
    '46111111-1111-4111-8111-111111111111',
    '46500000-0000-4000-8000-000000000001',
    '46200000-0000-4000-8000-000000000001',
    'ADD_SET','{}','{}','2026-05-01 00:00+00','2026-05-01 00:00+00'
  ),
  (
    '46111111-1111-4111-8111-111111111111',
    '46500000-0000-4000-8000-000000000002',
    '46200000-0000-4000-8000-000000000001',
    'ADD_SET','{}','{}','2026-08-01 00:00+00','2026-08-01 00:00+00'
  ),
  (
    '46111111-1111-4111-8111-111111111111',
    '46500000-0000-4000-8000-000000000003',
    '46200000-0000-4000-8000-000000000004',
    'ADD_SET','{}','{}','2026-05-01 00:00+00','2026-05-01 00:00+00'
  );

create temporary table phase17_score_count as
select count(*)::integer as n
from public.scoring_events
where user_id='46111111-1111-4111-8111-111111111111';

select is(
  private.purge_expired_workout_mutation_receipts('2026-08-30 12:00+00'),
  1::bigint,
  'retention removes exactly the old completed receipt for a non-active workout'
);
select is(
  (
    select count(*)::integer
    from public.workout_mutation_receipts
    where idempotency_key='46500000-0000-4000-8000-000000000001'
  ),
  0,
  'receipt older than 90 days is removed after its workout is no longer active'
);
select is(
  (
    select count(*)::integer
    from public.workout_mutation_receipts
    where idempotency_key='46500000-0000-4000-8000-000000000002'
  ),
  1,
  'recent completed receipt remains available for idempotent replay'
);
select is(
  (
    select count(*)::integer
    from public.workout_mutation_receipts
    where idempotency_key='46500000-0000-4000-8000-000000000003'
  ),
  1,
  'old receipt for an IN_PROGRESS workout is never purged'
);
select is(
  (
    select count(*)::integer
    from public.scoring_events
    where user_id='46111111-1111-4111-8111-111111111111'
  ),
  (select n from phase17_score_count),
  'receipt retention does not alter XP or progress scoring'
);

select * from finish();
rollback;
