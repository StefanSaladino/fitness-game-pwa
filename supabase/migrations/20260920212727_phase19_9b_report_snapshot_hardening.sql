create index if not exists monthly_training_report_source_snapshots_methodology_idx
  on public.monthly_training_report_source_snapshots(methodology_version);

create index if not exists monthly_training_report_muscle_snapshots_snapshot_user_idx
  on public.monthly_training_report_muscle_snapshots(snapshot_id, user_id);

create index if not exists monthly_training_report_performance_snapshots_snapshot_user_idx
  on public.monthly_training_report_performance_snapshots(snapshot_id, user_id);

create index if not exists monthly_training_report_performance_snapshots_exercise_idx
  on public.monthly_training_report_performance_snapshots(exercise_id);

create schema if not exists report_private;

revoke all on schema report_private from public;
grant usage on schema report_private to authenticated;

create or replace function report_private.freeze_my_monthly_training_report_source(
  p_month_start date
)
returns table (
  snapshot_id uuid,
  created boolean,
  verified_at timestamptz,
  source_fingerprint text
)
language plpgsql
security definer
set search_path = public, report_private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.monthly_training_report_source_snapshots%rowtype;
  v_snapshot_id uuid;
  v_verified_at timestamptz;
  v_fingerprint text;
  v_period_end date;
  v_summary record;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_month_start is null or extract(day from p_month_start) <> 1 then
    raise exception 'Month start must be the first calendar day'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    1999,
    hashtext(v_user_id::text || ':' || p_month_start::text)
  );

  select *
  into v_existing
  from public.monthly_training_report_source_snapshots s
  where s.user_id = v_user_id
    and s.period_start = p_month_start;

  if found then
    if v_existing.verified_at is null or v_existing.source_fingerprint is null then
      raise exception 'Existing monthly report source snapshot is not verified'
        using errcode = '55000';
    end if;

    snapshot_id := v_existing.id;
    created := false;
    verified_at := v_existing.verified_at;
    source_fingerprint := v_existing.source_fingerprint;
    return next;
    return;
  end if;

  select *
  into v_summary
  from public.get_my_completed_training_report_period('MONTH', p_month_start)
  limit 1;

  if not found then
    raise exception 'Unable to build monthly report source snapshot'
      using errcode = '55000';
  end if;

  v_period_end := v_summary.period_end;
  v_snapshot_id := gen_random_uuid();

  insert into public.monthly_training_report_source_snapshots (
    id,user_id,report_version,period_start,period_end,methodology_version,
    low_status_fraction_of_target_min,completed_lifting_sessions,
    active_training_seconds,exercise_count,completed_working_sets,
    volume_kg_reps,pr_count
  ) values (
    v_snapshot_id,v_user_id,v_summary.report_version,v_summary.period_start,
    v_summary.period_end,v_summary.methodology_version,
    v_summary.low_status_fraction_of_target_min,
    v_summary.completed_lifting_sessions,v_summary.active_training_seconds,
    v_summary.exercise_count,v_summary.completed_working_sets,
    v_summary.volume_kg_reps,v_summary.pr_count
  );

  insert into public.monthly_training_report_muscle_snapshots (
    snapshot_id,user_id,muscle_group,benchmark_window_days,
    period_effective_sets,period_direct_effective_sets,
    period_indirect_effective_sets,eligible_logical_sets,eligible_stages,
    review_flagged_logical_sets,target_min,target_midpoint,target_max,
    high_review_above,benchmark_evidence_confidence,
    high_confidence_effective_sets,medium_confidence_effective_sets,
    low_or_provisional_effective_sets,provisional_effective_sets,
    high_confidence_proportion,medium_confidence_proportion,
    low_or_provisional_proportion
  )
  select
    v_snapshot_id,v_user_id,r.muscle_group,r.benchmark_window_days,
    r.period_effective_sets,r.period_direct_effective_sets,
    r.period_indirect_effective_sets,r.eligible_logical_sets,r.eligible_stages,
    r.review_flagged_logical_sets,r.target_min,r.target_midpoint,r.target_max,
    r.high_review_above,r.benchmark_evidence_confidence,
    r.high_confidence_effective_sets,r.medium_confidence_effective_sets,
    r.low_or_provisional_effective_sets,r.provisional_effective_sets,
    r.high_confidence_proportion,r.medium_confidence_proportion,
    r.low_or_provisional_proportion
  from public.get_my_completed_training_report_period('MONTH',p_month_start) r;

  insert into public.monthly_training_report_performance_snapshots (
    snapshot_id,user_id,muscle_group,exercise_id,canonical_name,
    contribution_role,contribution_weight,scoring_date,observed_at,
    relative_performance_index
  )
  select
    v_snapshot_id,v_user_id,p.muscle_group,p.exercise_id,p.canonical_name,
    p.contribution_role,p.contribution_weight,p.scoring_date,p.observed_at,
    p.relative_performance_index
  from public.get_my_muscle_performance_observations(v_period_end,56) p;

  select md5(
    jsonb_build_object(
      'reportVersion',s.report_version,
      'periodStart',s.period_start,
      'periodEnd',s.period_end,
      'methodologyVersion',s.methodology_version,
      'lowStatusFraction',s.low_status_fraction_of_target_min,
      'completedLiftingSessions',s.completed_lifting_sessions,
      'activeTrainingSeconds',s.active_training_seconds,
      'exerciseCount',s.exercise_count,
      'completedWorkingSets',s.completed_working_sets,
      'volumeKgReps',s.volume_kg_reps,
      'prCount',s.pr_count,
      'muscles',(
        select coalesce(
          jsonb_agg(
            to_jsonb(m)-'snapshot_id'-'user_id'
            order by m.muscle_group
          ),
          '[]'::jsonb
        )
        from public.monthly_training_report_muscle_snapshots m
        where m.snapshot_id=v_snapshot_id
      ),
      'performance',(
        select coalesce(
          jsonb_agg(
            to_jsonb(p)-'id'-'snapshot_id'-'user_id'
            order by p.muscle_group,p.scoring_date,p.observed_at,p.exercise_id
          ),
          '[]'::jsonb
        )
        from public.monthly_training_report_performance_snapshots p
        where p.snapshot_id=v_snapshot_id
      )
    )::text
  )
  into v_fingerprint
  from public.monthly_training_report_source_snapshots s
  where s.id=v_snapshot_id;

  v_verified_at:=now();

  update public.monthly_training_report_source_snapshots s
  set source_fingerprint=v_fingerprint,
      verified_at=v_verified_at
  where s.id=v_snapshot_id
    and s.user_id=v_user_id;

  if (
    select count(*)
    from public.monthly_training_report_muscle_snapshots m
    where m.snapshot_id=v_snapshot_id
  ) <> 13 then
    raise exception 'Monthly report source snapshot expected 13 muscle rows'
      using errcode = '55000';
  end if;

  snapshot_id:=v_snapshot_id;
  created:=true;
  verified_at:=v_verified_at;
  source_fingerprint:=v_fingerprint;
  return next;
end;
$$;

revoke all on function report_private.freeze_my_monthly_training_report_source(date)
from public, anon, authenticated;
grant execute on function report_private.freeze_my_monthly_training_report_source(date)
to authenticated;

create or replace function public.freeze_my_monthly_training_report_source(
  p_month_start date
)
returns table (
  snapshot_id uuid,
  created boolean,
  verified_at timestamptz,
  source_fingerprint text
)
language sql
volatile
security invoker
set search_path = public, report_private, pg_temp
as $$
  select *
  from report_private.freeze_my_monthly_training_report_source(p_month_start);
$$;

revoke all on function public.freeze_my_monthly_training_report_source(date)
from public, anon, authenticated;
grant execute on function public.freeze_my_monthly_training_report_source(date)
to authenticated;

comment on function report_private.freeze_my_monthly_training_report_source(date) is
  'Non-exposed Phase 19.9 SECURITY DEFINER helper for atomic monthly source snapshot persistence. Always derives ownership from auth.uid().';

comment on function public.freeze_my_monthly_training_report_source(date) is
  'Authenticated SECURITY INVOKER wrapper for idempotently freezing one completed monthly report source snapshot.';

notify pgrst, 'reload schema';
