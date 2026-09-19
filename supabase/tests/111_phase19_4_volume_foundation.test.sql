begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

select has_table('public', 'muscle_volume_methodologies', 'methodology table exists');
select has_table('public', 'muscle_volume_exercise_rules', 'exercise-rule table exists');
select has_table('public', 'muscle_volume_exercise_contributions', 'exercise-contribution table exists');
select has_table('public', 'muscle_volume_benchmarks', 'benchmark table exists');

select results_eq(
  $$select count(*)::bigint from public.muscle_volume_methodologies$$,
  array[1::bigint],
  'Phase 19.4 seeds one methodology version'
);

select results_eq(
  $$select version from public.muscle_volume_methodologies where is_active$$,
  array['muscle-volume-v1'::text],
  'muscle-volume-v1 is the single active methodology'
);

select results_eq(
  $$select weighted_baseline_formula, bodyweight_baseline_formula
    from public.muscle_volume_methodologies
    where version = 'muscle-volume-v1'$$,
  $$values ('EPLEY'::text, 'BEST_REPS'::text)$$,
  'weighted and bodyweight baseline formulas are locked'
);

select results_eq(
  $$select
      baseline_window_days,
      baseline_established_min_sessions,
      high_confidence_min_sessions,
      high_confidence_recent_days,
      epley_confidence_downgrade_from_reps,
      epley_max_reps
    from public.muscle_volume_methodologies
    where version = 'muscle-volume-v1'$$,
  $$values (
      180::smallint,
      2::smallint,
      3::smallint,
      90::smallint,
      13::smallint,
      30::smallint
    )$$,
  'baseline window and confidence thresholds match muscle-volume-v1'
);

select results_eq(
  $$select
      full_credit_min_ratio,
      partial_credit_min_ratio,
      single_rep_credit_cap,
      over_max_reps_credit_cap,
      failure_full_credit_min_reps,
      provisional_full_credit_min_reps,
      provisional_full_credit_max_reps
    from public.muscle_volume_methodologies
    where version = 'muscle-volume-v1'$$,
  $$values (
      0.90::numeric,
      0.80::numeric,
      0.50::numeric,
      0.50::numeric,
      2::smallint,
      2::smallint,
      30::smallint
    )$$,
  'set-quality and provisional thresholds match muscle-volume-v1'
);

select results_eq(
  $$select
      drop_continuation_credit,
      drop_max_multiplier,
      drop_min_continuation_reps,
      drop_requires_lower_load,
      drop_requires_contiguous_segments,
      pyramid_stages_independent,
      superset_multiplier
    from public.muscle_volume_methodologies
    where version = 'muscle-volume-v1'$$,
  $$values (
      0.50::numeric,
      2.00::numeric,
      2::smallint,
      true,
      true,
      true,
      1.00::numeric
    )$$,
  'advanced-set methodology values match the locked contract'
);

select results_eq(
  $$select low_status_fraction_of_target_min
    from public.muscle_volume_methodologies
    where version = 'muscle-volume-v1'$$,
  array[0.50::numeric],
  'LOW status begins below 50 percent of the target lower bound'
);

select results_eq(
  $$select count(*)::bigint
    from public.muscle_volume_exercise_rules
    where methodology_version = 'muscle-volume-v1'$$,
  array[464::bigint],
  'all 464 reviewed canonical exercises have a persisted rule'
);

select results_eq(
  $$select count(*)::bigint
    from public.muscle_volume_exercise_rules
    where methodology_version = 'muscle-volume-v1'
      and volume_eligible$$,
  array[326::bigint],
  '326 exercises are volume-eligible'
);

select results_eq(
  $$select count(*)::bigint
    from public.muscle_volume_exercise_rules
    where methodology_version = 'muscle-volume-v1'
      and not volume_eligible$$,
  array[138::bigint],
  '138 exercises are explicitly excluded/deferred'
);

select results_eq(
  $$select set_quality_mode, count(*)::bigint
    from public.muscle_volume_exercise_rules
    where methodology_version = 'muscle-volume-v1'
    group by set_quality_mode
    order by set_quality_mode$$,
  $$values
      ('BODYWEIGHT_REPS'::text, 45::bigint),
      ('NONE'::text, 138::bigint),
      ('WEIGHT_EPLEY'::text, 281::bigint)$$,
  'set-quality mode counts match the reviewed matrix'
);

select results_eq(
  $$select mapping_confidence, count(*)::bigint
    from public.muscle_volume_exercise_rules
    where methodology_version = 'muscle-volume-v1'
    group by mapping_confidence
    order by mapping_confidence$$,
  $$values
      ('HIGH'::text, 334::bigint),
      ('LOW'::text, 1::bigint),
      ('MEDIUM'::text, 129::bigint)$$,
  'mapping-confidence counts match the reviewed matrix'
);

select results_eq(
  $$select count(*)::bigint
    from public.muscle_volume_exercise_rules r
    join public.exercise_catalog e on e.id = r.exercise_id
    where r.methodology_version = 'muscle-volume-v1'
      and e.active = true$$,
  array[464::bigint],
  'every persisted rule resolves to an active canonical exercise'
);

select ok(
  not exists (
    select 1
    from public.muscle_volume_exercise_rules r
    join public.exercise_catalog e on e.id = r.exercise_id
    where r.methodology_version = 'muscle-volume-v1'
      and r.volume_eligible
      and (
        (e.measurement_type = 'WEIGHT_REPS' and r.set_quality_mode <> 'WEIGHT_EPLEY')
        or
        (e.measurement_type = 'BODYWEIGHT_REPS' and r.set_quality_mode <> 'BODYWEIGHT_REPS')
        or
        e.measurement_type in ('DURATION', 'OTHER')
      )
  ),
  'eligible rules use a measurement-compatible set-quality mode'
);

select ok(
  not exists (
    select 1
    from public.muscle_volume_exercise_rules r
    where r.methodology_version = 'muscle-volume-v1'
      and r.volume_eligible
      and not exists (
        select 1
        from public.muscle_volume_exercise_contributions c
        where c.methodology_version = r.methodology_version
          and c.exercise_id = r.exercise_id
          and c.contribution_role = 'DIRECT'
      )
  ),
  'every eligible exercise has at least one DIRECT contribution'
);

select ok(
  not exists (
    select 1
    from public.muscle_volume_exercise_rules r
    join public.muscle_volume_exercise_contributions c
      on c.methodology_version = r.methodology_version
     and c.exercise_id = r.exercise_id
    where r.methodology_version = 'muscle-volume-v1'
      and not r.volume_eligible
  ),
  'excluded exercises have no contribution rows'
);

select results_eq(
  $$select count(*)::bigint
    from public.muscle_volume_exercise_contributions
    where methodology_version = 'muscle-volume-v1'$$,
  array[604::bigint],
  '604 direct/indirect contribution rows are persisted'
);

select ok(
  not exists (
    select 1
    from public.muscle_volume_exercise_contributions
    where methodology_version = 'muscle-volume-v1'
      and not (
        (contribution_role = 'DIRECT' and contribution_weight = 1.00)
        or
        (contribution_role = 'INDIRECT' and contribution_weight = 0.50)
      )
  ),
  'contribution roles preserve DIRECT=1 and INDIRECT=0.5'
);

select results_eq(
  $$select
      c.muscle_group,
      c.contribution_role,
      c.contribution_weight
    from public.muscle_volume_exercise_contributions c
    join public.exercise_catalog e on e.id = c.exercise_id
    where c.methodology_version = 'muscle-volume-v1'
      and e.canonical_name = 'Barbell Bench Press'
    order by c.muscle_group$$,
  $$values
      ('CHEST'::text, 'DIRECT'::text, 1.00::numeric),
      ('SHOULDERS'::text, 'INDIRECT'::text, 0.50::numeric),
      ('TRICEPS'::text, 'INDIRECT'::text, 0.50::numeric)$$,
  'Barbell Bench Press mapping survives relational persistence'
);

select results_eq(
  $$select
      c.muscle_group,
      c.contribution_role,
      c.contribution_weight
    from public.muscle_volume_exercise_contributions c
    join public.exercise_catalog e on e.id = c.exercise_id
    where c.methodology_version = 'muscle-volume-v1'
      and e.canonical_name = 'Dumbbell Gorilla Row'
    order by c.muscle_group$$,
  $$values
      ('BACK'::text, 'DIRECT'::text, 1.00::numeric),
      ('BICEPS'::text, 'INDIRECT'::text, 0.50::numeric)$$,
  'Phase 19.3A dumbbell mapping survives relational persistence'
);

select results_eq(
  $$select
      r.volume_eligible,
      r.set_quality_mode,
      count(c.muscle_group)::bigint
    from public.muscle_volume_exercise_rules r
    join public.exercise_catalog e on e.id = r.exercise_id
    left join public.muscle_volume_exercise_contributions c
      on c.methodology_version = r.methodology_version
     and c.exercise_id = r.exercise_id
    where r.methodology_version = 'muscle-volume-v1'
      and e.canonical_name = 'Dumbbell Thruster'
    group by r.volume_eligible, r.set_quality_mode$$,
  $$values (false, 'NONE'::text, 0::bigint)$$,
  'FULL_BODY Dumbbell Thruster remains explicitly excluded'
);

select results_eq(
  $$select count(*)::bigint
    from public.muscle_volume_benchmarks
    where methodology_version = 'muscle-volume-v1'$$,
  array[26::bigint],
  '13 reportable muscles have both 7-day and 28-day benchmark rows'
);

select results_eq(
  $$select window_days, count(*)::bigint
    from public.muscle_volume_benchmarks
    where methodology_version = 'muscle-volume-v1'
    group by window_days
    order by window_days$$,
  $$values (7::smallint, 13::bigint), (28::smallint, 13::bigint)$$,
  'benchmark windows contain 13 muscles each'
);

select ok(
  not exists (
    select 1
    from public.muscle_volume_benchmarks b7
    join public.muscle_volume_benchmarks b28
      on b28.methodology_version = b7.methodology_version
     and b28.muscle_group = b7.muscle_group
     and b28.window_days = 28
    where b7.methodology_version = 'muscle-volume-v1'
      and b7.window_days = 7
      and (
        b28.target_min <> b7.target_min * 4
        or b28.target_midpoint <> b7.target_midpoint * 4
        or b28.target_max <> b7.target_max * 4
        or b28.high_review_above <> b7.high_review_above * 4
      )
  ),
  '28-day benchmark values are exactly four times the 7-day values'
);

select results_eq(
  $$select
      window_days,
      target_min,
      target_midpoint,
      target_max,
      high_review_above
    from public.muscle_volume_benchmarks
    where methodology_version = 'muscle-volume-v1'
      and muscle_group = 'SHOULDERS'
    order by window_days$$,
  $$values
      (7::smallint, 10::numeric, 12::numeric, 16::numeric, 18::numeric),
      (28::smallint, 40::numeric, 48::numeric, 64::numeric, 72::numeric)$$,
  'Shoulders preserves the methodology midpoint rather than deriving an arithmetic midpoint'
);

select results_eq(
  $$select count(*)::bigint
    from public.muscle_volume_benchmarks
    where methodology_version = 'muscle-volume-v1'
      and muscle_group in ('FULL_BODY', 'OTHER')$$,
  array[0::bigint],
  'FULL_BODY and OTHER do not receive volume benchmark bands'
);

select results_eq(
  $$select count(*)::bigint
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'muscle_volume_methodologies',
        'muscle_volume_exercise_rules',
        'muscle_volume_exercise_contributions',
        'muscle_volume_benchmarks'
      )
      and c.relrowsecurity$$,
  array[4::bigint],
  'all Phase 19.4 public tables have RLS enabled'
);

select results_eq(
  $$select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'muscle_volume_methodologies',
        'muscle_volume_exercise_rules',
        'muscle_volume_exercise_contributions',
        'muscle_volume_benchmarks'
      )
      and cmd = 'SELECT'
      and roles = array['authenticated']::name[]$$,
  array[4::bigint],
  'each Phase 19.4 reference table has one authenticated SELECT policy'
);

select ok(
  (
    select bool_and(has_table_privilege(
      'authenticated',
      format('public.%I', table_name),
      'SELECT'
    ))
    from (
      values
        ('muscle_volume_methodologies'),
        ('muscle_volume_exercise_rules'),
        ('muscle_volume_exercise_contributions'),
        ('muscle_volume_benchmarks')
    ) as t(table_name)
  ),
  'authenticated has SELECT privilege on all Phase 19.4 reference tables'
);

select ok(
  (
    select bool_and(
      not has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
      and not has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
      and not has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
      and not has_table_privilege('authenticated', format('public.%I', table_name), 'TRUNCATE')
    )
    from (
      values
        ('muscle_volume_methodologies'),
        ('muscle_volume_exercise_rules'),
        ('muscle_volume_exercise_contributions'),
        ('muscle_volume_benchmarks')
    ) as t(table_name)
  ),
  'authenticated cannot mutate Phase 19.4 reference tables'
);

select ok(
  (
    select bool_and(
      not has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
      and not has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
      and not has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
      and not has_table_privilege('anon', format('public.%I', table_name), 'DELETE')
    )
    from (
      values
        ('muscle_volume_methodologies'),
        ('muscle_volume_exercise_rules'),
        ('muscle_volume_exercise_contributions'),
        ('muscle_volume_benchmarks')
    ) as t(table_name)
  ),
  'anon has no privileges on Phase 19.4 reference tables'
);

select * from finish();
rollback;
