begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

select has_view(
  'public',
  'muscle_volume_set_stimulus',
  'Phase 19.5 set-stimulus view exists'
);

select ok(
  coalesce((
    select 'security_invoker=true' = any(c.reloptions)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'muscle_volume_set_stimulus'
  ), false),
  'set-stimulus view is SECURITY INVOKER'
);

select has_function(
  'public',
  'get_my_muscle_volume',
  array['date'],
  'rolling muscle-volume RPC exists'
);

select ok(
  coalesce((
    select not p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_my_muscle_volume'
      and pg_get_function_identity_arguments(p.oid) = 'p_anchor_date date'
  ), false),
  'rolling muscle-volume RPC is SECURITY INVOKER'
);

select is(
  has_table_privilege(
    'authenticated',
    'public.muscle_volume_set_stimulus',
    'select'
  ),
  true,
  'authenticated can read the set-stimulus view'
);

select is(
  has_table_privilege(
    'anon',
    'public.muscle_volume_set_stimulus',
    'select'
  ),
  false,
  'anon cannot read the set-stimulus view'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.get_my_muscle_volume(date)',
    'execute'
  ),
  true,
  'authenticated can execute rolling muscle-volume RPC'
);

select is(
  has_function_privilege(
    'anon',
    'public.get_my_muscle_volume(date)',
    'execute'
  ),
  false,
  'anon cannot execute rolling muscle-volume RPC'
);

insert into auth.users (id, email) values
  ('19500000-0000-4000-8000-000000000001', 'phase195-primary@test.local'),
  ('29500000-0000-4000-8000-000000000002', 'phase195-other@test.local');

update public.profiles
set username = 'phase195_primary',
    display_name = 'Phase 19.5 Primary',
    timezone = 'UTC',
    onboarding_completed_at = now()
where id = '19500000-0000-4000-8000-000000000001';

update public.profiles
set username = 'phase195_other',
    display_name = 'Phase 19.5 Other',
    timezone = 'UTC',
    onboarding_completed_at = now()
where id = '29500000-0000-4000-8000-000000000002';
create temporary table phase195_exercises (
  kind text primary key,
  exercise_id uuid not null
) on commit drop;

insert into phase195_exercises(kind, exercise_id)
select 'BENCH', id
from public.exercise_catalog
where canonical_name = 'Barbell Bench Press'
  and active
union all
select 'SIDE_BEND', id
from public.exercise_catalog
where canonical_name = 'Dumbbell Side Bend'
  and active
union all
select 'PULL_UP', id
from public.exercise_catalog
where canonical_name = 'Pull-Up'
  and active;

-- Three pre-workout observations establish HIGH confidence while staying
-- outside both rolling reporting windows for the 2026-09-19 anchor.
insert into public.workout_sessions (
  id,
  user_id,
  category,
  status,
  source,
  started_at,
  ended_at,
  active_duration_seconds,
  timezone_at_start,
  scoring_date,
  qualifies,
  needs_review,
  qualifies_lifting,
  qualifies_cardio_bonus
)
values
  (
    '19500000-0000-4000-8000-000000001001',
    '19500000-0000-4000-8000-000000000001',
    'STRENGTH',
    'COMPLETED',
    'IN_APP',
    '2026-07-01T12:00:00Z',
    '2026-07-01T13:00:00Z',
    3600,
    'UTC',
    '2026-07-01',
    true,
    false,
    true,
    false
  ),
  (
    '19500000-0000-4000-8000-000000001002',
    '19500000-0000-4000-8000-000000000001',
    'STRENGTH',
    'COMPLETED',
    'IN_APP',
    '2026-07-21T12:00:00Z',
    '2026-07-21T13:00:00Z',
    3600,
    'UTC',
    '2026-07-21',
    true,
    false,
    true,
    false
  ),
  (
    '19500000-0000-4000-8000-000000001003',
    '19500000-0000-4000-8000-000000000001',
    'STRENGTH',
    'COMPLETED',
    'IN_APP',
    '2026-08-10T12:00:00Z',
    '2026-08-10T13:00:00Z',
    3600,
    'UTC',
    '2026-08-10',
    true,
    false,
    true,
    false
  ),
  (
    '19500000-0000-4000-8000-000000001004',
    '19500000-0000-4000-8000-000000000001',
    'STRENGTH',
    'COMPLETED',
    'IN_APP',
    '2026-09-19T12:00:00Z',
    '2026-09-19T13:00:00Z',
    3600,
    'UTC',
    '2026-09-19',
    true,
    false,
    true,
    false
  ),
  (
    '19500000-0000-4000-8000-000000001005',
    '29500000-0000-4000-8000-000000000002',
    'STRENGTH',
    'COMPLETED',
    'IN_APP',
    '2026-09-19T12:00:00Z',
    '2026-09-19T13:00:00Z',
    3600,
    'UTC',
    '2026-09-19',
    true,
    false,
    true,
    false
  );

-- Seed the three historical E1RM observations used by the pre-workout baseline.
insert into public.exercise_progress_observations (
  user_id,
  workout_id,
  exercise_id,
  metric_type,
  metric_value,
  weight_kg,
  reps,
  scoring_date,
  valid
)
select
  w.user_id,
  w.id,
  e.exercise_id,
  'E1RM',
  100::numeric * (1 + 8::numeric / 30),
  100,
  8,
  w.scoring_date,
  true
from public.workout_sessions w
cross join phase195_exercises e
where w.id in (
  '19500000-0000-4000-8000-000000001001'::uuid,
  '19500000-0000-4000-8000-000000001002'::uuid,
  '19500000-0000-4000-8000-000000001003'::uuid
)
and e.kind in ('BENCH', 'SIDE_BEND');
-- Current primary-user workout exercises.
insert into public.workout_exercises (
  id,
  workout_id,
  exercise_id,
  order_index
)
values
  (
    '19500000-0000-4000-8000-000000004001',
    '19500000-0000-4000-8000-000000001004',
    (select exercise_id from phase195_exercises where kind = 'BENCH'),
    0
  ),
  (
    '19500000-0000-4000-8000-000000004002',
    '19500000-0000-4000-8000-000000001004',
    (select exercise_id from phase195_exercises where kind = 'SIDE_BEND'),
    1
  ),
  (
    '19500000-0000-4000-8000-000000004003',
    '19500000-0000-4000-8000-000000001004',
    (select exercise_id from phase195_exercises where kind = 'PULL_UP'),
    2
  );

-- Four standard Bench stages exercising personalized full/partial,
-- high-rep confidence downgrade, and >30-rep cap.
insert into public.workout_sets (
  id,
  workout_exercise_id,
  set_number,
  set_type,
  set_variant,
  weight_kg,
  reps,
  completed,
  completed_at
)
values
  (
    '19500000-0000-4000-8000-000000005001',
    '19500000-0000-4000-8000-000000004001',
    1,
    'WORKING',
    'STANDARD',
    90,
    8,
    true,
    '2026-09-19T12:10:00Z'
  ),
  (
    '19500000-0000-4000-8000-000000005002',
    '19500000-0000-4000-8000-000000004001',
    2,
    'WORKING',
    'STANDARD',
    85,
    8,
    true,
    '2026-09-19T12:15:00Z'
  ),
  (
    '19500000-0000-4000-8000-000000005003',
    '19500000-0000-4000-8000-000000004001',
    3,
    'WORKING',
    'STANDARD',
    100,
    20,
    true,
    '2026-09-19T12:20:00Z'
  ),
  (
    '19500000-0000-4000-8000-000000005004',
    '19500000-0000-4000-8000-000000004001',
    4,
    'WORKING',
    'STANDARD',
    50,
    35,
    true,
    '2026-09-19T12:25:00Z'
  ),
  (
    '19500000-0000-4000-8000-000000005005',
    '19500000-0000-4000-8000-000000004001',
    5,
    'DROP',
    'DROP',
    90,
    8,
    true,
    '2026-09-19T12:30:00Z'
  ),
  (
    '19500000-0000-4000-8000-000000005006',
    '19500000-0000-4000-8000-000000004001',
    6,
    'WORKING',
    'FULL_PYRAMID',
    100,
    8,
    true,
    '2026-09-19T12:40:00Z'
  );

insert into public.workout_set_segments (
  workout_set_id,
  segment_index,
  weight_kg,
  reps
)
values
  ('19500000-0000-4000-8000-000000005005', 0, 90, 8),
  ('19500000-0000-4000-8000-000000005005', 1, 70, 10),
  ('19500000-0000-4000-8000-000000005005', 2, 50, 12),
  ('19500000-0000-4000-8000-000000005005', 3, 55, 8),
  ('19500000-0000-4000-8000-000000005006', 0, 80, 8),
  ('19500000-0000-4000-8000-000000005006', 1, 90, 8),
  ('19500000-0000-4000-8000-000000005006', 2, 100, 8),
  ('19500000-0000-4000-8000-000000005006', 3, 90, 8),
  ('19500000-0000-4000-8000-000000005006', 4, 80, 8);

-- Side Bend has established HIGH baseline but deliberately falls below 0.80,
-- proving mapped evidence with zero credit returns LOW rather than NO_DATA.
insert into public.workout_sets (
  id,
  workout_exercise_id,
  set_number,
  set_type,
  set_variant,
  weight_kg,
  reps,
  completed,
  completed_at
)
values (
  '19500000-0000-4000-8000-000000006001',
  '19500000-0000-4000-8000-000000004002',
  1,
  'WORKING',
  'STANDARD',
  70,
  8,
  true,
  '2026-09-19T12:45:00Z'
);

-- Plain bodyweight counts provisionally; loaded bodyweight stays excluded.
insert into public.workout_sets (
  id,
  workout_exercise_id,
  set_number,
  set_type,
  set_variant,
  weight_kg,
  reps,
  bodyweight_mode,
  completed,
  completed_at
)
values
  (
    '19500000-0000-4000-8000-000000007001',
    '19500000-0000-4000-8000-000000004003',
    1,
    'WORKING',
    'STANDARD',
    null,
    10,
    'BODYWEIGHT',
    true,
    '2026-09-19T12:50:00Z'
  ),
  (
    '19500000-0000-4000-8000-000000007002',
    '19500000-0000-4000-8000-000000004003',
    2,
    'WORKING',
    'STANDARD',
    10,
    10,
    'ADDED_WEIGHT',
    true,
    '2026-09-19T12:55:00Z'
  );

-- Other-user row proves the SECURITY INVOKER view cannot leak across RLS.
insert into public.workout_exercises (
  id,
  workout_id,
  exercise_id,
  order_index
)
values (
  '19500000-0000-4000-8000-000000008001',
  '19500000-0000-4000-8000-000000001005',
  (select exercise_id from phase195_exercises where kind = 'BENCH'),
  0
);

insert into public.workout_sets (
  id,
  workout_exercise_id,
  set_number,
  set_type,
  set_variant,
  weight_kg,
  reps,
  completed,
  completed_at
)
values (
  '19500000-0000-4000-8000-000000008002',
  '19500000-0000-4000-8000-000000008001',
  1,
  'WORKING',
  'STANDARD',
  200,
  8,
  true,
  '2026-09-19T12:30:00Z'
);

grant select on phase195_exercises to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '19500000-0000-4000-8000-000000000001';

select results_eq(
  $$select
      baseline_session_count,
      baseline_confidence,
      set_quality_confidence,
      set_quality_source,
      stimulus_equivalents,
      round(performance_index, 4)
    from public.muscle_volume_set_stimulus
    where workout_set_id = '19500000-0000-4000-8000-000000005001'$$,
  $$values (
      3,
      'HIGH'::text,
      'HIGH'::text,
      'PERSONALIZED'::text,
      1::numeric,
      0.9000::numeric
    )$$,
  '90x8 Bench earns full personalized HIGH-confidence credit at the 0.90 boundary'
);

select results_eq(
  $$select stimulus_equivalents
    from public.muscle_volume_set_stimulus
    where workout_set_id = '19500000-0000-4000-8000-000000005002'$$,
  array[0.5::numeric],
  '85x8 Bench earns partial credit inside the 0.80-0.90 band'
);

select results_eq(
  $$select set_quality_confidence, set_quality_source, stimulus_equivalents
    from public.muscle_volume_set_stimulus
    where workout_set_id = '19500000-0000-4000-8000-000000005003'$$,
  $$values ('MEDIUM'::text, 'PERSONALIZED'::text, 1::numeric)$$,
  '13-30 weighted reps downgrade HIGH baseline confidence one level'
);

select results_eq(
  $$select set_quality_confidence, set_quality_source, stimulus_equivalents
    from public.muscle_volume_set_stimulus
    where workout_set_id = '19500000-0000-4000-8000-000000005004'$$,
  $$values ('LOW'::text, 'HIGH_REP_CAP'::text, 0.5::numeric)$$,
  '>30 standard reps are capped at 0.5 with LOW confidence'
);

select results_eq(
  $$select stage_index, stimulus_equivalents
    from public.muscle_volume_set_stimulus
    where workout_set_id = '19500000-0000-4000-8000-000000005005'
    order by stage_index$$,
  $$values
      (0, 1::numeric),
      (1, 0.5::numeric),
      (2, 0.5::numeric),
      (3, 0::numeric)$$,
  'Drop Set credits only the contiguous lower-load continuation chain and respects the 2.0 cap'
);

select results_eq(
  $$select count(*)::bigint, sum(stimulus_equivalents)
    from public.muscle_volume_set_stimulus
    where workout_set_id = '19500000-0000-4000-8000-000000005006'$$,
  $$values (5::bigint, 4::numeric)$$,
  'Pyramid scores every stage independently and sums to four stimulus equivalents'
);

select results_eq(
  $$select count(*)::bigint, sum(stimulus_equivalents), bool_and(is_provisional)
    from public.muscle_volume_set_stimulus
    where workout_id = '19500000-0000-4000-8000-000000001004'
      and exercise_id = (select exercise_id from phase195_exercises where kind = 'PULL_UP')$$,
  $$values (1::bigint, 1::numeric, true)$$,
  'plain Pull-Up is provisional while ADDED_WEIGHT Pull-Up is excluded from v1'
);

select results_eq(
  $$select stimulus_equivalents, set_quality_confidence
    from public.muscle_volume_set_stimulus
    where workout_set_id = '19500000-0000-4000-8000-000000006001'$$,
  $$values (0::numeric, 'HIGH'::text)$$,
  'established sub-0.80 work remains evidence but earns zero stimulus credit'
);

select results_eq(
  $$select count(distinct user_id)::bigint
    from public.muscle_volume_set_stimulus$$,
  array[1::bigint],
  'SECURITY INVOKER view exposes only the authenticated user through underlying RLS'
);

select results_eq(
  $$select count(*)::bigint
    from public.get_my_muscle_volume('2026-09-19')$$,
  array[26::bigint],
  'rolling read model returns 13 muscles for both 7-day and 28-day windows'
);

select results_eq(
  $$select
      effective_sets,
      direct_effective_sets,
      indirect_effective_sets,
      eligible_logical_sets,
      eligible_stages,
      volume_status
    from public.get_my_muscle_volume('2026-09-19')
    where window_days = 7
      and muscle_group = 'CHEST'$$,
  $$values (
      9::numeric,
      9::numeric,
      0::numeric,
      6::bigint,
      13::bigint,
      'BELOW_TARGET'::text
    )$$,
  '7-day Chest aggregate combines standard, Drop, and Pyramid work correctly'
);

select results_eq(
  $$select effective_sets, direct_effective_sets, indirect_effective_sets, volume_status
    from public.get_my_muscle_volume('2026-09-19')
    where window_days = 7
      and muscle_group = 'SHOULDERS'$$,
  $$values (4.5::numeric, 0::numeric, 4.5::numeric, 'LOW'::text)$$,
  'Bench indirect shoulder contribution is fractional and status-aware'
);

select results_eq(
  $$select effective_sets, direct_effective_sets, indirect_effective_sets, volume_status
    from public.get_my_muscle_volume('2026-09-19')
    where window_days = 7
      and muscle_group = 'TRICEPS'$$,
  $$values (4.5::numeric, 0::numeric, 4.5::numeric, 'LOW'::text)$$,
  'Bench indirect triceps contribution is fractional and status-aware'
);

select results_eq(
  $$select
      effective_sets,
      direct_effective_sets,
      indirect_effective_sets,
      eligible_logical_sets,
      eligible_stages,
      round(low_or_provisional_proportion, 4)
    from public.get_my_muscle_volume('2026-09-19')
    where window_days = 7
      and muscle_group = 'BACK'$$,
  $$values (
      1::numeric,
      1::numeric,
      0::numeric,
      1::bigint,
      1::bigint,
      1.0000::numeric
    )$$,
  'provisional plain Pull-Up contributes one direct Back effective set'
);

select results_eq(
  $$select effective_sets, direct_effective_sets, indirect_effective_sets
    from public.get_my_muscle_volume('2026-09-19')
    where window_days = 7
      and muscle_group = 'BICEPS'$$,
  $$values (0.5::numeric, 0::numeric, 0.5::numeric)$$,
  'Pull-Up contributes fractional indirect Biceps volume'
);

select results_eq(
  $$select
      effective_sets,
      eligible_logical_sets,
      eligible_stages,
      volume_status
    from public.get_my_muscle_volume('2026-09-19')
    where window_days = 7
      and muscle_group = 'OBLIQUES'$$,
  $$values (0::numeric, 1::bigint, 1::bigint, 'LOW'::text)$$,
  'mapped zero-credit evidence returns LOW instead of NO_DATA'
);

select results_eq(
  $$select effective_sets, eligible_stages, volume_status
    from public.get_my_muscle_volume('2026-09-19')
    where window_days = 7
      and muscle_group = 'CALVES'$$,
  $$values (0::numeric, 0::bigint, 'NO_DATA'::text)$$,
  'muscle with no mapped evidence returns NO_DATA'
);

select results_eq(
  $$select effective_sets
    from public.get_my_muscle_volume('2026-09-19')
    where window_days = 28
      and muscle_group = 'CHEST'$$,
  array[9::numeric],
  'prior baseline sessions outside the 28-day window do not inflate rolling volume'
);

select results_eq(
  $$select
      round(high_confidence_effective_sets, 4),
      round(medium_confidence_effective_sets, 4),
      round(low_or_provisional_effective_sets, 4),
      round(provisional_effective_sets, 4),
      round(high_confidence_proportion, 6),
      round(medium_confidence_proportion, 6),
      round(low_or_provisional_proportion, 6)
    from public.get_my_muscle_volume('2026-09-19')
    where window_days = 7
      and muscle_group = 'CHEST'$$,
  $$values (
      7.5000::numeric,
      1.0000::numeric,
      0.5000::numeric,
      0.0000::numeric,
      0.833333::numeric,
      0.111111::numeric,
      0.055556::numeric
    )$$,
  'Chest confidence buckets and proportions preserve HIGH/MEDIUM/LOW evidence'
);

select results_eq(
  $$select distinct methodology_version
    from public.get_my_muscle_volume('2026-09-19')$$,
  array['muscle-volume-v1'::text],
  'rolling read model identifies the active methodology version'
);

select results_eq(
  $$select distinct window_days, window_start, window_end
    from public.get_my_muscle_volume('2026-09-19')
    order by window_days$$,
  $$values
      (7::smallint, '2026-09-13'::date, '2026-09-19'::date),
      (28::smallint, '2026-08-23'::date, '2026-09-19'::date)$$,
  'rolling windows are anchor-local date plus previous 6/27 dates'
);

select ok(
  not exists (
    select 1
    from public.muscle_volume_set_stimulus s
    where s.bodyweight_mode in ('ADDED_WEIGHT', 'ASSISTED')
  ),
  'loaded/assisted bodyweight modes remain excluded without explicit normalization'
);

select results_eq(
  $$select count(*)::bigint
    from public.muscle_volume_set_stimulus
    where set_variant = 'DROP'
      and stage_index > 0
      and set_quality_source = 'DROP_CONTINUATION'
      and performance_index is null$$,
  array[3::bigint],
  'Drop continuations do not masquerade as fresh personalized baseline comparisons'
);

reset role;
select * from finish();
rollback;
