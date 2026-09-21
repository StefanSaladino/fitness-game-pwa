create table public.monthly_training_report_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_version text not null,
  period_start date not null,
  period_end date not null,
  methodology_version text not null references public.muscle_volume_methodologies(version)
    on update restrict on delete restrict,
  low_status_fraction_of_target_min numeric not null,
  completed_lifting_sessions bigint not null,
  active_training_seconds bigint not null,
  exercise_count bigint not null,
  completed_working_sets bigint not null,
  volume_kg_reps numeric not null,
  pr_count bigint not null,
  source_fingerprint text,
  generated_at timestamptz not null default now(),
  verified_at timestamptz,
  constraint monthly_training_report_source_snapshots_report_version
    check (report_version = 'training-report-v1'),
  constraint monthly_training_report_source_snapshots_month_start
    check (extract(day from period_start) = 1),
  constraint monthly_training_report_source_snapshots_period
    check (
      period_end =
        (date_trunc('month', period_start::timestamp)
          + interval '1 month' - interval '1 day')::date
    ),
  constraint monthly_training_report_source_snapshots_low_fraction
    check (
      low_status_fraction_of_target_min > 0
      and low_status_fraction_of_target_min < 1
    ),
  constraint monthly_training_report_source_snapshots_nonnegative
    check (
      completed_lifting_sessions >= 0
      and active_training_seconds >= 0
      and exercise_count >= 0
      and completed_working_sets >= 0
      and volume_kg_reps >= 0
      and pr_count >= 0
    ),
  constraint monthly_training_report_source_snapshots_user_month_key
    unique (user_id, period_start),
  constraint monthly_training_report_source_snapshots_id_user_key
    unique (id, user_id)
);

create table public.monthly_training_report_muscle_snapshots (
  snapshot_id uuid not null,
  user_id uuid not null,
  muscle_group text not null,
  benchmark_window_days smallint not null,
  period_effective_sets numeric not null,
  period_direct_effective_sets numeric not null,
  period_indirect_effective_sets numeric not null,
  eligible_logical_sets bigint not null,
  eligible_stages bigint not null,
  review_flagged_logical_sets bigint not null,
  target_min numeric not null,
  target_midpoint numeric not null,
  target_max numeric not null,
  high_review_above numeric not null,
  benchmark_evidence_confidence text not null,
  high_confidence_effective_sets numeric not null,
  medium_confidence_effective_sets numeric not null,
  low_or_provisional_effective_sets numeric not null,
  provisional_effective_sets numeric not null,
  high_confidence_proportion numeric not null,
  medium_confidence_proportion numeric not null,
  low_or_provisional_proportion numeric not null,
  primary key (snapshot_id, muscle_group),
  constraint monthly_training_report_muscle_snapshots_snapshot_user_fkey
    foreign key (snapshot_id, user_id)
    references public.monthly_training_report_source_snapshots(id, user_id)
    on delete cascade,
  constraint monthly_training_report_muscle_snapshots_group
    check (
      muscle_group = any (
        array[
          'CHEST','BACK','SHOULDERS','BICEPS','TRICEPS','QUADS',
          'HAMSTRINGS','GLUTES','CALVES','CORE','OBLIQUES',
          'FOREARMS_GRIP','NECK'
        ]::text[]
      )
    ),
  constraint monthly_training_report_muscle_snapshots_window
    check (benchmark_window_days = 28),
  constraint monthly_training_report_muscle_snapshots_nonnegative
    check (
      period_effective_sets >= 0
      and period_direct_effective_sets >= 0
      and period_indirect_effective_sets >= 0
      and eligible_logical_sets >= 0
      and eligible_stages >= 0
      and review_flagged_logical_sets >= 0
      and target_min >= 0
      and target_midpoint >= target_min
      and target_max >= target_midpoint
      and high_review_above > target_max
      and high_confidence_effective_sets >= 0
      and medium_confidence_effective_sets >= 0
      and low_or_provisional_effective_sets >= 0
      and provisional_effective_sets >= 0
      and high_confidence_proportion between 0 and 1
      and medium_confidence_proportion between 0 and 1
      and low_or_provisional_proportion between 0 and 1
    )
);

create table public.monthly_training_report_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null,
  user_id uuid not null,
  muscle_group text not null,
  exercise_id uuid not null references public.exercise_catalog(id) on delete restrict,
  canonical_name text not null,
  contribution_role text not null,
  contribution_weight numeric not null,
  scoring_date date not null,
  observed_at timestamptz not null,
  relative_performance_index numeric not null,
  constraint monthly_training_report_performance_snapshots_snapshot_user_fkey
    foreign key (snapshot_id, user_id)
    references public.monthly_training_report_source_snapshots(id, user_id)
    on delete cascade,
  constraint monthly_training_report_performance_snapshots_group
    check (
      muscle_group = any (
        array[
          'CHEST','BACK','SHOULDERS','BICEPS','TRICEPS','QUADS',
          'HAMSTRINGS','GLUTES','CALVES','CORE','OBLIQUES',
          'FOREARMS_GRIP','NECK'
        ]::text[]
      )
    ),
  constraint monthly_training_report_performance_snapshots_role
    check (contribution_role in ('DIRECT','INDIRECT')),
  constraint monthly_training_report_performance_snapshots_values
    check (contribution_weight > 0 and relative_performance_index > 0)
);

create index monthly_training_report_source_snapshots_user_period_idx
  on public.monthly_training_report_source_snapshots(user_id, period_start desc);

create index monthly_training_report_muscle_snapshots_user_snapshot_idx
  on public.monthly_training_report_muscle_snapshots(user_id, snapshot_id);

create index monthly_training_report_performance_snapshots_user_snapshot_idx
  on public.monthly_training_report_performance_snapshots(user_id, snapshot_id);

create index monthly_training_report_performance_snapshots_snapshot_muscle_date_idx
  on public.monthly_training_report_performance_snapshots(
    snapshot_id, muscle_group, scoring_date, observed_at
  );

alter table public.monthly_training_report_source_snapshots enable row level security;
alter table public.monthly_training_report_muscle_snapshots enable row level security;
alter table public.monthly_training_report_performance_snapshots enable row level security;

create policy monthly_training_report_source_snapshots_select
on public.monthly_training_report_source_snapshots
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy monthly_training_report_muscle_snapshots_select
on public.monthly_training_report_muscle_snapshots
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy monthly_training_report_performance_snapshots_select
on public.monthly_training_report_performance_snapshots
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.monthly_training_report_source_snapshots
from public, anon, authenticated;
revoke all on table public.monthly_training_report_muscle_snapshots
from public, anon, authenticated;
revoke all on table public.monthly_training_report_performance_snapshots
from public, anon, authenticated;

grant select on table public.monthly_training_report_source_snapshots
to authenticated;
grant select on table public.monthly_training_report_muscle_snapshots
to authenticated;
grant select on table public.monthly_training_report_performance_snapshots
to authenticated;

create or replace function public.get_my_completed_training_report_period(
  p_period_kind text,
  p_period_start date
)
returns table (
  report_version text,
  period_kind text,
  period_start date,
  period_end date,
  methodology_version text,
  low_status_fraction_of_target_min numeric,
  completed_lifting_sessions bigint,
  active_training_seconds bigint,
  exercise_count bigint,
  completed_working_sets bigint,
  volume_kg_reps numeric,
  pr_count bigint,
  muscle_group text,
  benchmark_window_days smallint,
  period_effective_sets numeric,
  period_direct_effective_sets numeric,
  period_indirect_effective_sets numeric,
  eligible_logical_sets bigint,
  eligible_stages bigint,
  review_flagged_logical_sets bigint,
  target_min numeric,
  target_midpoint numeric,
  target_max numeric,
  high_review_above numeric,
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
  v_today date;
  v_period_kind text := upper(trim(coalesce(p_period_kind, '')));
  v_period_start date := p_period_start;
  v_period_end date;
  v_benchmark_window_days smallint;
  v_methodology_version text;
  v_low_status_fraction numeric;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_period_start is null then
    raise exception 'Period start is required' using errcode = '22023';
  end if;

  select coalesce(nullif(trim(p.timezone), ''), 'UTC')
  into v_timezone
  from public.profiles p
  where p.id = v_user_id;

  v_timezone := coalesce(v_timezone, 'UTC');
  v_today := (now() at time zone v_timezone)::date;

  if v_period_kind = 'WEEK' then
    if extract(isodow from v_period_start) <> 1 then
      raise exception 'Weekly report period must start on Monday'
        using errcode = '22023';
    end if;
    v_period_end := v_period_start + 6;
    v_benchmark_window_days := 7;
  elsif v_period_kind = 'MONTH' then
    if extract(day from v_period_start) <> 1 then
      raise exception 'Monthly report period must start on the first calendar day'
        using errcode = '22023';
    end if;
    v_period_end :=
      (date_trunc('month', v_period_start::timestamp)
        + interval '1 month' - interval '1 day')::date;
    v_benchmark_window_days := 28;
  else
    raise exception 'Period kind must be WEEK or MONTH'
      using errcode = '22023';
  end if;

  if v_period_end >= v_today then
    raise exception 'Training report period must be fully completed'
      using errcode = '22023';
  end if;

  select m.version, m.low_status_fraction_of_target_min
  into v_methodology_version, v_low_status_fraction
  from public.muscle_volume_methodologies m
  where m.is_active
  order by m.version
  limit 1;

  if v_methodology_version is null then
    raise exception 'No active muscle-volume methodology is configured'
      using errcode = '55000';
  end if;

  return query
  with completed_sessions as (
    select
      w.id,
      w.scoring_date,
      w.active_duration_seconds
    from public.workout_sessions w
    where w.user_id = v_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and w.scoring_date between v_period_start and v_period_end
  ),
  logical_work_sets as (
    select
      w.id as workout_id,
      w.scoring_date,
      we.exercise_id,
      ws.id as workout_set_id,
      case
        when ws.set_variant = 'STANDARD'
          then coalesce(ws.weight_kg, 0::numeric) * coalesce(ws.reps, 0)
        else coalesce((
          select sum(
            coalesce(seg.weight_kg, 0::numeric) * coalesce(seg.reps, 0)
          )
          from public.workout_set_segments seg
          where seg.workout_set_id = ws.id
        ), 0::numeric)
      end::numeric as set_volume_kg_reps
    from public.workout_sessions w
    join public.workout_exercises we
      on we.workout_id = w.id
    join public.workout_sets ws
      on ws.workout_exercise_id = we.id
    where w.user_id = v_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and w.scoring_date between v_period_start and v_period_end
      and ws.completed
      and ws.set_type::text in ('WORKING','DROP','FAILURE')
      and (
        (ws.set_variant = 'STANDARD' and coalesce(ws.reps, 0) >= 1)
        or
        (
          ws.set_variant <> 'STANDARD'
          and exists (
            select 1
            from public.workout_set_segments seg
            where seg.workout_set_id = ws.id
              and coalesce(seg.reps, 0) >= 1
          )
        )
      )
  ),
  summary as (
    select
      (select count(*)::bigint from completed_sessions) as session_total,
      (select coalesce(sum(active_duration_seconds), 0)::bigint from completed_sessions)
        as active_seconds_total,
      (select count(distinct exercise_id)::bigint from logical_work_sets)
        as exercise_total,
      (select count(*)::bigint from logical_work_sets)
        as working_set_total,
      (select coalesce(sum(set_volume_kg_reps), 0)::numeric from logical_work_sets)
        as volume_total
  ),
  observation_context as (
    select
      o.workout_id,
      o.exercise_id,
      o.metric_type,
      o.metric_value,
      o.scoring_date,
      max(o.metric_value) over (
        partition by o.exercise_id, o.metric_type
        order by o.scoring_date, o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as previous_pr_value
    from public.exercise_progress_observations o
    where o.user_id = v_user_id
      and o.valid
  ),
  pr_summary as (
    select count(*)::bigint as pr_total
    from observation_context o
    where o.scoring_date between v_period_start and v_period_end
      and o.previous_pr_value is not null
      and o.metric_value > o.previous_pr_value
  ),
  benchmarks as (
    select
      b.muscle_group,
      b.target_min,
      b.target_midpoint,
      b.target_max,
      b.high_review_above,
      b.evidence_confidence
    from public.muscle_volume_benchmarks b
    where b.methodology_version = v_methodology_version
      and b.window_days = v_benchmark_window_days
  ),
  mapped as (
    select
      s.scoring_date,
      s.workout_set_id,
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
      and s.scoring_date between v_period_start and v_period_end
  ),
  muscle_aggregates as (
    select
      b.muscle_group,
      b.target_min,
      b.target_midpoint,
      b.target_max,
      b.high_review_above,
      b.evidence_confidence,
      count(distinct m.workout_set_id)::bigint as logical_set_total,
      count(m.workout_set_id)::bigint as stage_total,
      count(distinct m.workout_set_id) filter (
        where m.review_flag
      )::bigint as review_flagged_total,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ), 0)::numeric as effective_set_total,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ) filter (
        where m.contribution_role = 'DIRECT'
      ), 0)::numeric as direct_effective_set_total,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ) filter (
        where m.contribution_role = 'INDIRECT'
      ), 0)::numeric as indirect_effective_set_total,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ) filter (
        where m.set_quality_confidence = 'HIGH'
      ), 0)::numeric as high_confidence_total,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ) filter (
        where m.set_quality_confidence = 'MEDIUM'
      ), 0)::numeric as medium_confidence_total,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ) filter (
        where m.set_quality_confidence = 'LOW'
           or m.is_provisional
      ), 0)::numeric as low_or_provisional_total,
      coalesce(sum(
        m.stimulus_equivalents * m.contribution_weight
      ) filter (
        where m.is_provisional
      ), 0)::numeric as provisional_total
    from benchmarks b
    left join mapped m
      on m.muscle_group = b.muscle_group
    group by
      b.muscle_group,
      b.target_min,
      b.target_midpoint,
      b.target_max,
      b.high_review_above,
      b.evidence_confidence
  )
  select
    'training-report-v1'::text,
    v_period_kind,
    v_period_start,
    v_period_end,
    v_methodology_version,
    v_low_status_fraction,
    s.session_total,
    s.active_seconds_total,
    s.exercise_total,
    s.working_set_total,
    s.volume_total,
    p.pr_total,
    a.muscle_group,
    v_benchmark_window_days,
    a.effective_set_total,
    a.direct_effective_set_total,
    a.indirect_effective_set_total,
    a.logical_set_total,
    a.stage_total,
    a.review_flagged_total,
    a.target_min,
    a.target_midpoint,
    a.target_max,
    a.high_review_above,
    a.evidence_confidence,
    a.high_confidence_total,
    a.medium_confidence_total,
    a.low_or_provisional_total,
    a.provisional_total,
    case
      when a.effective_set_total > 0
        then a.high_confidence_total / a.effective_set_total
      else 0::numeric
    end,
    case
      when a.effective_set_total > 0
        then a.medium_confidence_total / a.effective_set_total
      else 0::numeric
    end,
    case
      when a.effective_set_total > 0
        then a.low_or_provisional_total / a.effective_set_total
      else 0::numeric
    end
  from muscle_aggregates a
  cross join summary s
  cross join pr_summary p
  order by a.muscle_group;
end;
$$;

revoke all on function public.get_my_completed_training_report_period(text, date)
from public, anon, authenticated;
grant execute on function public.get_my_completed_training_report_period(text, date)
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
language plpgsql
security definer
set search_path = public, pg_temp
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

revoke all on function public.freeze_my_monthly_training_report_source(date)
from public, anon, authenticated;
grant execute on function public.freeze_my_monthly_training_report_source(date)
to authenticated;

comment on function public.get_my_completed_training_report_period(text,date) is
  'Phase 19.9 exact completed-period report source. WEEK requires a completed Monday-Sunday period; MONTH requires a completed calendar month. Returns exact-period lifting metrics plus methodology-versioned muscle-volume source data.';

comment on table public.monthly_training_report_source_snapshots is
  'Phase 19.9 immutable-by-client monthly source snapshots. Stores compact completed-period facts before report rendering; final report/PDF payloads are layered on later.';

comment on table public.monthly_training_report_muscle_snapshots is
  'Frozen exact-month muscle-volume source facts and benchmark inputs for one monthly report source snapshot.';

comment on table public.monthly_training_report_performance_snapshots is
  'Frozen 56-day normalized performance observations used to build the monthly report trend/recommendation payload.';

comment on function public.freeze_my_monthly_training_report_source(date) is
  'Idempotently freezes one completed calendar month of report source data for auth.uid(). Uses advisory locking and an atomic verified fingerprint; direct client writes to snapshot tables are not granted.';

notify pgrst, 'reload schema';
