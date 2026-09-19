-- Top Set — Phase 19.5 muscle-volume runtime/read model
--
-- Purpose:
-- 1) Turn completed eligible lifting work into methodology-versioned
--    set-stimulus equivalents without changing lifting-v1 XP semantics.
-- 2) Preserve per-set/stage quality confidence and source metadata.
-- 3) Apply reviewed exercise-to-muscle mappings from Phase 19.4.
-- 4) Expose authenticated rolling 7-day / 28-day muscle-volume analytics.
--
-- Security:
-- - The set-stimulus view is SECURITY INVOKER so underlying RLS remains authoritative.
-- - The rolling read RPC is SECURITY INVOKER and explicitly scoped to auth.uid().
-- - anon receives no access.

do $$
begin
  if not exists (
    select 1
    from public.muscle_volume_methodologies
    where version = 'muscle-volume-v1'
      and is_active
  ) then
    raise exception 'Phase 19.5 requires active muscle-volume-v1 methodology';
  end if;

  if (
    select count(*)
    from public.muscle_volume_exercise_rules
    where methodology_version = 'muscle-volume-v1'
  ) <> 464 then
    raise exception 'Phase 19.5 expected 464 Phase 19.4 exercise rules';
  end if;

  if (
    select count(*)
    from public.muscle_volume_exercise_contributions
    where methodology_version = 'muscle-volume-v1'
  ) <> 604 then
    raise exception 'Phase 19.5 expected 604 Phase 19.4 contribution rows';
  end if;

  if (
    select count(*)
    from public.muscle_volume_benchmarks
    where methodology_version = 'muscle-volume-v1'
  ) <> 26 then
    raise exception 'Phase 19.5 expected 26 Phase 19.4 benchmark rows';
  end if;
end
$$;

create or replace view public.muscle_volume_set_stimulus
with (security_invoker = true)
as
with stage_source as (
  -- Ordinary completed WORKING / FAILURE sets.
  select
    m.version as methodology_version,
    m.baseline_window_days,
    m.baseline_established_min_sessions,
    m.high_confidence_min_sessions,
    m.high_confidence_recent_days,
    m.epley_confidence_downgrade_from_reps,
    m.epley_max_reps,
    m.full_credit_min_ratio,
    m.partial_credit_min_ratio,
    m.single_rep_credit_cap,
    m.over_max_reps_credit_cap,
    m.failure_full_credit_min_reps,
    m.provisional_full_credit_min_reps,
    m.provisional_full_credit_max_reps,
    m.drop_continuation_credit,
    m.drop_max_multiplier,
    m.drop_min_continuation_reps,
    w.user_id,
    w.id as workout_id,
    w.scoring_date,
    coalesce(w.ended_at, w.started_at) as workout_observed_at,
    we.exercise_id,
    ws.id as workout_set_id,
    ws.set_type::text as set_type,
    ws.set_variant,
    0::integer as stage_index,
    ws.weight_kg,
    ws.reps,
    ws.bodyweight_mode,
    e.measurement_type,
    r.set_quality_mode,
    r.mapping_confidence,
    r.review_flag
  from public.workout_sessions w
  join public.workout_exercises we
    on we.workout_id = w.id
  join public.workout_sets ws
    on ws.workout_exercise_id = we.id
  join public.exercise_catalog e
    on e.id = we.exercise_id
  join public.muscle_volume_exercise_rules r
    on r.exercise_id = e.id
   and r.volume_eligible
  join public.muscle_volume_methodologies m
    on m.version = r.methodology_version
  where w.source = 'IN_APP'
    and w.status = 'COMPLETED'
    and w.category = 'STRENGTH'
    and ws.completed
    and ws.set_variant = 'STANDARD'
    and ws.set_type::text in ('WORKING', 'FAILURE')
    and coalesce(ws.reps, 0) >= 1
    and (
      (
        r.set_quality_mode = 'WEIGHT_EPLEY'
        and e.measurement_type = 'WEIGHT_REPS'
        and coalesce(ws.weight_kg, 0) > 0
      )
      or
      (
        r.set_quality_mode = 'BODYWEIGHT_REPS'
        and e.measurement_type = 'BODYWEIGHT_REPS'
        and coalesce(ws.bodyweight_mode, 'BODYWEIGHT') = 'BODYWEIGHT'
        and ws.weight_kg is null
      )
    )

  union all

  -- Advanced weighted sets are expanded into their ordered child stages.
  select
    m.version as methodology_version,
    m.baseline_window_days,
    m.baseline_established_min_sessions,
    m.high_confidence_min_sessions,
    m.high_confidence_recent_days,
    m.epley_confidence_downgrade_from_reps,
    m.epley_max_reps,
    m.full_credit_min_ratio,
    m.partial_credit_min_ratio,
    m.single_rep_credit_cap,
    m.over_max_reps_credit_cap,
    m.failure_full_credit_min_reps,
    m.provisional_full_credit_min_reps,
    m.provisional_full_credit_max_reps,
    m.drop_continuation_credit,
    m.drop_max_multiplier,
    m.drop_min_continuation_reps,
    w.user_id,
    w.id as workout_id,
    w.scoring_date,
    coalesce(w.ended_at, w.started_at) as workout_observed_at,
    we.exercise_id,
    ws.id as workout_set_id,
    ws.set_type::text as set_type,
    ws.set_variant,
    seg.segment_index,
    seg.weight_kg,
    seg.reps,
    null::text as bodyweight_mode,
    e.measurement_type,
    r.set_quality_mode,
    r.mapping_confidence,
    r.review_flag
  from public.workout_sessions w
  join public.workout_exercises we
    on we.workout_id = w.id
  join public.workout_sets ws
    on ws.workout_exercise_id = we.id
  join public.workout_set_segments seg
    on seg.workout_set_id = ws.id
  join public.exercise_catalog e
    on e.id = we.exercise_id
  join public.muscle_volume_exercise_rules r
    on r.exercise_id = e.id
   and r.volume_eligible
  join public.muscle_volume_methodologies m
    on m.version = r.methodology_version
  where w.source = 'IN_APP'
    and w.status = 'COMPLETED'
    and w.category = 'STRENGTH'
    and ws.completed
    and ws.set_variant in ('DROP', 'ASCENDING_PYRAMID', 'FULL_PYRAMID')
    and ws.set_type::text in ('WORKING', 'DROP')
    and r.set_quality_mode = 'WEIGHT_EPLEY'
    and e.measurement_type = 'WEIGHT_REPS'
    and coalesce(seg.weight_kg, 0) > 0
    and coalesce(seg.reps, 0) >= 1
),
stage_context as (
  select
    s.*,
    count(*) over (
      partition by s.methodology_version, s.workout_set_id
    )::integer as stage_count,
    lag(s.weight_kg) over (
      partition by s.methodology_version, s.workout_set_id
      order by s.stage_index
    ) as previous_stage_weight_kg
  from stage_source s
),
baseline_context as (
  select
    s.*,
    coalesce(b.baseline_session_count, 0)::integer as baseline_session_count,
    coalesce(b.recent_baseline_session_count, 0)::integer as recent_baseline_session_count,
    b.baseline_value,
    (
      coalesce(b.baseline_session_count, 0)
      >= s.baseline_established_min_sessions
    ) as baseline_established,
    case
      when coalesce(b.baseline_session_count, 0) >= s.high_confidence_min_sessions
       and coalesce(b.recent_baseline_session_count, 0) >= 1
        then 'HIGH'
      when coalesce(b.baseline_session_count, 0) >= s.baseline_established_min_sessions
        then 'MEDIUM'
      else 'LOW'
    end::text as baseline_confidence
  from stage_context s
  left join lateral (
    select
      max(o.metric_value)::numeric as baseline_value,
      count(distinct o.workout_id)::integer as baseline_session_count,
      count(distinct o.workout_id) filter (
        where prior_workout.scoring_date
          >= s.scoring_date - s.high_confidence_recent_days
      )::integer as recent_baseline_session_count
    from public.exercise_progress_observations o
    join public.workout_sessions prior_workout
      on prior_workout.id = o.workout_id
    where o.user_id = s.user_id
      and o.exercise_id = s.exercise_id
      and o.valid
      and o.metric_type = case
        when s.set_quality_mode = 'WEIGHT_EPLEY' then 'E1RM'
        when s.set_quality_mode = 'BODYWEIGHT_REPS' then 'BODYWEIGHT_REPS'
        else '__UNSUPPORTED__'
      end
      and prior_workout.user_id = s.user_id
      and prior_workout.source = 'IN_APP'
      and prior_workout.status = 'COMPLETED'
      and prior_workout.category = 'STRENGTH'
      and prior_workout.scoring_date
        >= s.scoring_date - s.baseline_window_days
      and (
        prior_workout.scoring_date,
        coalesce(prior_workout.ended_at, prior_workout.started_at),
        prior_workout.id::text
      ) < (
        s.scoring_date,
        s.workout_observed_at,
        s.workout_id::text
      )
  ) b on true
),
metric_context as (
  select
    b.*,
    case
      when b.set_quality_mode = 'WEIGHT_EPLEY'
        then b.weight_kg * (1 + b.reps::numeric / 30)
      when b.set_quality_mode = 'BODYWEIGHT_REPS'
        then b.reps::numeric
      else null::numeric
    end as current_metric_value
  from baseline_context b
),
performance_context as (
  select
    m.*,
    case
      when m.baseline_established
       and m.baseline_value is not null
       and m.baseline_value > 0
       and m.reps <= m.epley_max_reps
        then m.current_metric_value / m.baseline_value
      else null::numeric
    end as performance_index
  from metric_context m
),
quality_context as (
  select
    p.*,
    case
      when p.set_type = 'FAILURE' then 'EXPLICIT_FAILURE'
      when p.reps > p.epley_max_reps then 'HIGH_REP_CAP'
      when not p.baseline_established then 'PROVISIONAL'
      else 'PERSONALIZED'
    end::text as set_quality_source,
    (not p.baseline_established) as is_provisional,
    case
      when not p.baseline_established then 'LOW'
      when p.set_type = 'FAILURE' then p.baseline_confidence
      when p.reps > p.epley_max_reps then 'LOW'
      when p.set_quality_mode = 'WEIGHT_EPLEY'
       and p.reps >= p.epley_confidence_downgrade_from_reps
       and p.reps <= p.epley_max_reps
        then case p.baseline_confidence
          when 'HIGH' then 'MEDIUM'
          when 'MEDIUM' then 'LOW'
          else 'LOW'
        end
      else p.baseline_confidence
    end::text as set_quality_confidence,
    case
      when p.set_type = 'FAILURE' then
        case
          when p.reps >= p.failure_full_credit_min_reps then 1::numeric
          else p.single_rep_credit_cap
        end
      when p.reps > p.epley_max_reps then
        p.over_max_reps_credit_cap
      when not p.baseline_established then
        case
          when p.reps = 1 then p.single_rep_credit_cap
          when p.reps between
            p.provisional_full_credit_min_reps
            and p.provisional_full_credit_max_reps
            then 1::numeric
          else p.over_max_reps_credit_cap
        end
      else
        least(
          case
            when p.performance_index >= p.full_credit_min_ratio then 1::numeric
            when p.performance_index >= p.partial_credit_min_ratio then 0.5::numeric
            else 0::numeric
          end,
          case
            when p.reps = 1 then p.single_rep_credit_cap
            else 1::numeric
          end
        )
    end::numeric as base_stimulus_equivalents
  from performance_context p
),
drop_link_context as (
  select
    q.*,
    case
      when q.set_variant <> 'DROP' then true
      when q.stage_index = 0 then true
      else
        q.reps >= q.drop_min_continuation_reps
        and q.previous_stage_weight_kg is not null
        and q.weight_kg < q.previous_stage_weight_kg
    end as drop_link_valid
  from quality_context q
),
drop_chain_context as (
  select
    d.*,
    sum(
      case
        when d.set_variant = 'DROP' and not d.drop_link_valid then 1
        else 0
      end
    ) over (
      partition by d.methodology_version, d.workout_set_id
      order by d.stage_index
      rows between unbounded preceding and current row
    )::integer as drop_invalid_link_count,
    first_value(d.base_stimulus_equivalents) over (
      partition by d.methodology_version, d.workout_set_id
      order by d.stage_index
    ) as drop_first_stage_credit,
    first_value(d.set_quality_confidence) over (
      partition by d.methodology_version, d.workout_set_id
      order by d.stage_index
    ) as drop_first_stage_confidence,
    first_value(d.is_provisional) over (
      partition by d.methodology_version, d.workout_set_id
      order by d.stage_index
    ) as drop_first_stage_provisional
  from drop_link_context d
)
select
  d.user_id,
  d.workout_id,
  d.scoring_date,
  d.exercise_id,
  d.workout_set_id,
  d.set_type,
  d.set_variant,
  d.stage_index,
  d.stage_count,
  d.weight_kg,
  d.reps,
  d.bodyweight_mode,
  d.measurement_type,
  d.methodology_version,
  d.mapping_confidence,
  d.review_flag,
  d.set_quality_mode,
  d.baseline_value,
  d.baseline_session_count,
  d.recent_baseline_session_count,
  d.baseline_confidence,
  case
    when d.set_variant = 'DROP' and d.stage_index > 0
      then d.drop_first_stage_confidence
    else d.set_quality_confidence
  end::text as set_quality_confidence,
  case
    when d.set_variant = 'DROP' and d.stage_index > 0
      then 'DROP_CONTINUATION'
    else d.set_quality_source
  end::text as set_quality_source,
  case
    when d.set_variant = 'DROP' and d.stage_index > 0
      then d.drop_first_stage_provisional
    else d.is_provisional
  end as is_provisional,
  case
    when d.set_variant = 'DROP' and d.stage_index > 0
      then null::numeric
    else d.performance_index
  end as performance_index,
  case
    when d.set_variant <> 'DROP'
      then d.base_stimulus_equivalents
    when d.stage_index = 0
      then d.drop_first_stage_credit
    when d.drop_invalid_link_count > 0
      then 0::numeric
    else
      d.drop_first_stage_credit
      * least(
          d.drop_continuation_credit,
          greatest(
            d.drop_max_multiplier
            - (
                1::numeric
                + d.drop_continuation_credit
                  * greatest(d.stage_index - 1, 0)
              ),
            0::numeric
          )
        )
  end::numeric as stimulus_equivalents
from drop_chain_context d;

revoke all on table public.muscle_volume_set_stimulus
from public, anon, authenticated;

grant select on table public.muscle_volume_set_stimulus
to authenticated;

create or replace function public.get_my_muscle_volume(
  p_anchor_date date default null
)
returns table (
  muscle_group text,
  window_days smallint,
  window_start date,
  window_end date,
  methodology_version text,
  effective_sets numeric,
  direct_effective_sets numeric,
  indirect_effective_sets numeric,
  eligible_logical_sets bigint,
  eligible_stages bigint,
  review_flagged_logical_sets bigint,
  target_min numeric,
  target_midpoint numeric,
  target_max numeric,
  high_review_above numeric,
  volume_status text,
  benchmark_evidence_confidence text,
  high_confidence_effective_sets numeric,
  medium_confidence_effective_sets numeric,
  low_or_provisional_effective_sets numeric,
  provisional_effective_sets numeric,
  high_confidence_proportion numeric,
  medium_confidence_proportion numeric,
  low_or_provisional_proportion numeric
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_anchor_date date;
  v_methodology_version text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select coalesce(nullif(trim(p.timezone), ''), 'UTC')
  into v_timezone
  from public.profiles p
  where p.id = v_user_id;

  v_timezone := coalesce(v_timezone, 'UTC');
  v_anchor_date := coalesce(
    p_anchor_date,
    (now() at time zone v_timezone)::date
  );

  select m.version
  into v_methodology_version
  from public.muscle_volume_methodologies m
  where m.is_active
  order by m.version
  limit 1;

  if v_methodology_version is null then
    raise exception 'No active muscle-volume methodology is configured'
      using errcode = '55000';
  end if;

  return query
  with benchmarks as (
    select
      b.muscle_group,
      b.window_days,
      b.target_min,
      b.target_midpoint,
      b.target_max,
      b.high_review_above,
      b.evidence_confidence
    from public.muscle_volume_benchmarks b
    where b.methodology_version = v_methodology_version
      and b.window_days in (7, 28)
  ),
  mapped as (
    select
      s.scoring_date,
      s.exercise_id,
      s.workout_set_id,
      s.methodology_version,
      s.review_flag,
      s.set_quality_confidence,
      s.is_provisional,
      s.stimulus_equivalents,
      c.muscle_group,
      c.contribution_role,
      c.contribution_weight
    from public.muscle_volume_set_stimulus s
    join public.muscle_volume_exercise_contributions c
      on c.methodology_version = s.methodology_version
     and c.exercise_id = s.exercise_id
    where s.user_id = v_user_id
      and s.methodology_version = v_methodology_version
  ),
  aggregates as (
    select
      b.muscle_group,
      b.window_days,
      b.target_min,
      b.target_midpoint,
      b.target_max,
      b.high_review_above,
      b.evidence_confidence,
      count(distinct m.workout_set_id)::bigint as eligible_logical_sets,
      count(m.workout_set_id)::bigint as eligible_stages,
      count(distinct m.workout_set_id) filter (
        where m.review_flag
      )::bigint as review_flagged_logical_sets,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ), 0)::numeric as effective_sets,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ) filter (
        where m.contribution_role = 'DIRECT'
      ), 0)::numeric as direct_effective_sets,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ) filter (
        where m.contribution_role = 'INDIRECT'
      ), 0)::numeric as indirect_effective_sets,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ) filter (
        where m.set_quality_confidence = 'HIGH'
      ), 0)::numeric as high_confidence_effective_sets,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ) filter (
        where m.set_quality_confidence = 'MEDIUM'
      ), 0)::numeric as medium_confidence_effective_sets,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ) filter (
        where m.set_quality_confidence = 'LOW'
           or m.is_provisional
      ), 0)::numeric as low_or_provisional_effective_sets,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ) filter (
        where m.is_provisional
      ), 0)::numeric as provisional_effective_sets
    from benchmarks b
    left join mapped m
      on m.muscle_group = b.muscle_group
     and m.scoring_date between
       (v_anchor_date - (b.window_days::integer - 1))
       and v_anchor_date
    group by
      b.muscle_group,
      b.window_days,
      b.target_min,
      b.target_midpoint,
      b.target_max,
      b.high_review_above,
      b.evidence_confidence
  )
  select
    a.muscle_group,
    a.window_days,
    v_anchor_date - (a.window_days::integer - 1) as window_start,
    v_anchor_date as window_end,
    v_methodology_version as methodology_version,
    a.effective_sets,
    a.direct_effective_sets,
    a.indirect_effective_sets,
    a.eligible_logical_sets,
    a.eligible_stages,
    a.review_flagged_logical_sets,
    a.target_min,
    a.target_midpoint,
    a.target_max,
    a.high_review_above,
    case
      when a.eligible_stages = 0 then 'NO_DATA'
      when a.effective_sets < (
        a.target_min * (
          select m.low_status_fraction_of_target_min
          from public.muscle_volume_methodologies m
          where m.version = v_methodology_version
        )
      ) then 'LOW'
      when a.effective_sets < a.target_min then 'BELOW_TARGET'
      when a.effective_sets <= a.target_max then 'ON_TARGET'
      when a.effective_sets > a.high_review_above then 'HIGH_REVIEW'
      else 'ABOVE_TARGET'
    end::text as volume_status,
    a.evidence_confidence as benchmark_evidence_confidence,
    a.high_confidence_effective_sets,
    a.medium_confidence_effective_sets,
    a.low_or_provisional_effective_sets,
    a.provisional_effective_sets,
    case
      when a.effective_sets > 0
        then a.high_confidence_effective_sets / a.effective_sets
      else 0::numeric
    end as high_confidence_proportion,
    case
      when a.effective_sets > 0
        then a.medium_confidence_effective_sets / a.effective_sets
      else 0::numeric
    end as medium_confidence_proportion,
    case
      when a.effective_sets > 0
        then a.low_or_provisional_effective_sets / a.effective_sets
      else 0::numeric
    end as low_or_provisional_proportion
  from aggregates a
  order by a.window_days, a.muscle_group;
end;
$$;

revoke all on function public.get_my_muscle_volume(date)
from public, anon, authenticated;

grant execute on function public.get_my_muscle_volume(date)
to authenticated;

comment on view public.muscle_volume_set_stimulus is
  'Phase 19.5 SECURITY INVOKER set/stage-level muscle-volume-v1 scoring surface. Uses only pre-workout personal baselines, keeps Drop continuations fatigue-aware, and excludes unsupported loaded/assisted bodyweight modes.';

comment on function public.get_my_muscle_volume(date) is
  'Authenticated rolling 7-day and 28-day muscle-volume read model using the active methodology version. Returns effective sets, direct/indirect components, raw mapped logical-set/stage context, benchmark status, and confidence proportions.';

notify pgrst, 'reload schema';
