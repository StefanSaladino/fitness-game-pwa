-- Phase 17 scale hardening
-- 1) Preserve scoring semantics while rebuilding only the affected chronological suffix.
-- 2) Bound automatic mutation replay to 30 days client-side and successful receipt
--    retention to 90 days server-side.
--
-- The existing public.reconcile_lifting_v1_scoring_for_user(uuid) remains the
-- authoritative full repair/audit path and is intentionally not replaced here.

create or replace function private.reconcile_lifting_v1_scoring_from_date(
  p_user_id uuid,
  p_from_date date
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_previous_guard text := coalesce(current_setting('fitness_game.reconciling_lifting_v1', true), '0');
  v_observation record;
  v_award record;
  v_previous_best numeric;
  v_previous_workout_id uuid;
  v_previous_achieved_at timestamptz;
  v_has_previous_best boolean;
  v_bonus integer;
  v_delta integer;
  v_ratio numeric;
  v_current_date date;
  v_daily_progression integer := 0;
  v_applied integer;
begin
  if p_user_id is null or p_from_date is null then
    raise exception 'User id and reconciliation date are required' using errcode = '22023';
  end if;

  if v_previous_guard = '1' then
    return;
  end if;

  perform set_config('fitness_game.reconciling_lifting_v1', '1', true);
  perform pg_advisory_xact_lock(7647, hashtext(p_user_id::text));

  if not exists (select 1 from public.profiles where id = p_user_id) then
    perform set_config('fitness_game.reconciling_lifting_v1', v_previous_guard, true);
    return;
  end if;

  -- Match the full reconciler's qualification oracle, but only for the source
  -- suffix that can affect derived state.
  with computed as (
    select
      w.id,
      (
        w.status = 'COMPLETED'
        and w.category = 'STRENGTH'
        and w.active_duration_seconds between 900 and 21600
        and not w.needs_review
        and (
          select count(*)
          from public.workout_exercises we
          join public.workout_sets ws on ws.workout_exercise_id = we.id
          where we.workout_id = w.id
            and ws.set_type = 'WORKING'
            and ws.completed
            and coalesce(ws.reps, 0) >= 1
        ) >= 4
      ) as qualifies_lifting,
      (
        w.status = 'COMPLETED'
        and w.category <> 'STRENGTH'
        and w.active_duration_seconds between 0 and 21600
        and not w.needs_review
        and case w.category::text
          when 'RUNNING' then w.active_duration_seconds >= 900
          when 'WALKING_HIKING' then w.active_duration_seconds >= 1800
          when 'CYCLING' then w.active_duration_seconds >= 1200
          when 'SWIMMING' then w.active_duration_seconds >= 900
          when 'SPORT' then w.active_duration_seconds >= 1200
          when 'CARDIO' then w.active_duration_seconds >= 1200
          when 'HIIT' then w.active_duration_seconds >= 720
          else false
        end
      ) as qualifies_cardio_bonus
    from public.workout_sessions w
    where w.user_id = p_user_id
      and w.source = 'IN_APP'
      and w.scoring_date >= p_from_date
  )
  update public.workout_sessions w
  set qualifies_lifting = c.qualifies_lifting,
      qualifies_cardio_bonus = c.qualifies_cardio_bonus,
      qualifies = case
        when w.category = 'STRENGTH' then c.qualifies_lifting
        else c.qualifies_cardio_bonus
      end
  from computed c
  where w.id = c.id
    and (
      w.qualifies_lifting is distinct from c.qualifies_lifting
      or w.qualifies_cardio_bonus is distinct from c.qualifies_cardio_bonus
      or w.qualifies is distinct from
        case when w.category = 'STRENGTH' then c.qualifies_lifting else c.qualifies_cardio_bonus end
    );

  -- Keep the unaffected prefix exactly as stored. All chronology-sensitive
  -- derived rows from the affected date forward are regenerated.
  delete from public.scoring_events
  where user_id = p_user_id
    and scoring_version = 'lifting-v1'
    and scoring_date >= p_from_date;

  delete from public.exercise_progress_observations
  where user_id = p_user_id
    and scoring_date >= p_from_date;

  -- This is one small current-state row per exercise. Rebuild it from the
  -- preserved prefix PBs plus the regenerated suffix.
  delete from public.exercise_progress
  where user_id = p_user_id;

  -- One 50-XP lifting award per scoring date in the suffix.
  insert into public.scoring_events (
    user_id, scoring_date, workout_id, event_type, amount, scoring_version, metadata
  )
  select distinct on (w.scoring_date)
    p_user_id,
    w.scoring_date,
    w.id,
    'LIFTING_WORKOUT',
    50,
    'lifting-v1',
    jsonb_build_object('qualifyingWorkoutId', w.id)
  from public.workout_sessions w
  where w.user_id = p_user_id
    and w.source = 'IN_APP'
    and w.status = 'COMPLETED'
    and w.qualifies_lifting
    and w.scoring_date >= p_from_date
  order by w.scoring_date, w.started_at, w.id;

  -- Exercise-completion XP, same daily cap/oracle as the full reconciler.
  with eligible as (
    select
      w.scoring_date,
      we.exercise_id,
      count(*)::integer as completed_working_sets,
      min(w.started_at) as first_started_at,
      (array_agg(w.id order by w.started_at, we.order_index, w.id))[1] as first_workout_id
    from public.workout_sessions w
    join public.workout_exercises we on we.workout_id = w.id
    join public.workout_sets ws on ws.workout_exercise_id = we.id
    where w.user_id = p_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and not w.needs_review
      and w.scoring_date >= p_from_date
      and ws.set_type = 'WORKING'
      and ws.completed
      and coalesce(ws.reps, 0) >= 1
    group by w.scoring_date, we.exercise_id
    having count(*) >= 2
  ), ranked as (
    select
      e.*,
      row_number() over (
        partition by e.scoring_date
        order by e.first_started_at, e.exercise_id
      ) as daily_rank
    from eligible e
  )
  insert into public.scoring_events (
    user_id, scoring_date, workout_id, exercise_id, event_type, amount, scoring_version, metadata
  )
  select
    p_user_id,
    r.scoring_date,
    r.first_workout_id,
    r.exercise_id,
    'EXERCISE_COMPLETE',
    5,
    'lifting-v1',
    jsonb_build_object(
      'completedWorkingSets', r.completed_working_sets,
      'dailyRank', r.daily_rank,
      'dailyExerciseCap', 6
    )
  from ranked r
  where r.daily_rank <= 6;

  -- Best cardio tier only, one event/date in the suffix.
  with candidates as (
    select
      w.id,
      w.scoring_date,
      w.started_at,
      w.active_duration_seconds,
      case
        when w.active_duration_seconds >= 2700 then 15
        when w.active_duration_seconds >= 1800 then 10
        else 5
      end as amount
    from public.workout_sessions w
    where w.user_id = p_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.qualifies_cardio_bonus
      and w.scoring_date >= p_from_date
  ), ranked as (
    select
      c.*,
      row_number() over (
        partition by c.scoring_date
        order by c.amount desc, c.active_duration_seconds desc, c.started_at, c.id
      ) as daily_rank
    from candidates c
  )
  insert into public.scoring_events (
    user_id, scoring_date, workout_id, event_type, amount, scoring_version, metadata
  )
  select
    p_user_id,
    r.scoring_date,
    r.id,
    'CARDIO_BONUS',
    r.amount,
    'lifting-v1',
    jsonb_build_object('activeDurationSeconds', r.active_duration_seconds)
  from ranked r
  where r.daily_rank = 1;

  create temporary table if not exists _lifting_v1_suffix_observations (
    workout_id uuid not null,
    exercise_id uuid not null,
    metric_type text not null,
    metric_value numeric not null,
    weight_kg numeric,
    reps integer,
    scoring_date date not null,
    observed_at timestamptz not null,
    qualifying_lifting_workout boolean not null,
    primary key (workout_id, exercise_id, metric_type)
  ) on commit drop;
  truncate table _lifting_v1_suffix_observations;

  -- Weighted exercises: exact Epley rule from the full reconciler.
  with weighted as (
    select
      w.id as workout_id,
      we.exercise_id,
      'E1RM'::text as metric_type,
      (ws.weight_kg * (1 + ws.reps::numeric / 30))::numeric as metric_value,
      ws.weight_kg,
      ws.reps,
      w.scoring_date,
      coalesce(w.ended_at, w.started_at) as observed_at,
      w.qualifies_lifting,
      row_number() over (
        partition by w.id, we.exercise_id
        order by (ws.weight_kg * (1 + ws.reps::numeric / 30)) desc,
                 coalesce(w.ended_at, w.started_at), ws.id
      ) as metric_rank
    from public.workout_sessions w
    join public.workout_exercises we on we.workout_id = w.id
    join public.exercise_catalog e on e.id = we.exercise_id
    join public.workout_sets ws on ws.workout_exercise_id = we.id
    where w.user_id = p_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and not w.needs_review
      and w.scoring_date >= p_from_date
      and e.measurement_type = 'WEIGHT_REPS'
      and ws.set_type = 'WORKING'
      and ws.completed
      and ws.weight_kg > 0
      and ws.reps between 1 and 12
  )
  insert into _lifting_v1_suffix_observations (
    workout_id, exercise_id, metric_type, metric_value, weight_kg, reps,
    scoring_date, observed_at, qualifying_lifting_workout
  )
  select
    workout_id, exercise_id, metric_type, metric_value, weight_kg, reps,
    scoring_date, observed_at, qualifies_lifting
  from weighted
  where metric_rank = 1;

  -- Plain bodyweight exercises: same best-reps rule; added/assisted remain excluded.
  with bodyweight as (
    select
      w.id as workout_id,
      we.exercise_id,
      'BODYWEIGHT_REPS'::text as metric_type,
      ws.reps::numeric as metric_value,
      null::numeric as weight_kg,
      ws.reps,
      w.scoring_date,
      coalesce(w.ended_at, w.started_at) as observed_at,
      w.qualifies_lifting,
      row_number() over (
        partition by w.id, we.exercise_id
        order by ws.reps desc, coalesce(w.ended_at, w.started_at), ws.id
      ) as metric_rank
    from public.workout_sessions w
    join public.workout_exercises we on we.workout_id = w.id
    join public.exercise_catalog e on e.id = we.exercise_id
    join public.workout_sets ws on ws.workout_exercise_id = we.id
    where w.user_id = p_user_id
      and w.source = 'IN_APP'
      and w.status = 'COMPLETED'
      and w.category = 'STRENGTH'
      and not w.needs_review
      and w.scoring_date >= p_from_date
      and e.measurement_type = 'BODYWEIGHT_REPS'
      and ws.set_type = 'WORKING'
      and ws.completed
      and ws.reps >= 1
      and coalesce(ws.bodyweight_mode, 'BODYWEIGHT') = 'BODYWEIGHT'
      and ws.weight_kg is null
  )
  insert into _lifting_v1_suffix_observations (
    workout_id, exercise_id, metric_type, metric_value, weight_kg, reps,
    scoring_date, observed_at, qualifying_lifting_workout
  )
  select
    workout_id, exercise_id, metric_type, metric_value, weight_kg, reps,
    scoring_date, observed_at, qualifies_lifting
  from bodyweight
  where metric_rank = 1;

  insert into public.exercise_progress_observations (
    user_id, workout_id, exercise_id, metric_type, metric_value,
    weight_kg, reps, scoring_date, valid, created_at
  )
  select
    p_user_id, o.workout_id, o.exercise_id, o.metric_type, o.metric_value,
    o.weight_kg, o.reps, o.scoring_date, true, o.observed_at
  from _lifting_v1_suffix_observations o
  order by o.observed_at, o.workout_id, o.exercise_id;

  create temporary table if not exists _lifting_v1_suffix_bests (
    exercise_id uuid not null,
    metric_type text not null,
    best_value numeric not null,
    weight_kg numeric,
    reps integer,
    source_workout_id uuid not null,
    achieved_at timestamptz not null,
    primary key (exercise_id, metric_type)
  ) on commit drop;
  truncate table _lifting_v1_suffix_bests;

  -- Seed the exact PB state immediately before the suffix. If the maximum was
  -- achieved more than once, retain the earliest achievement because the full
  -- chronological loop only updates on a strictly greater value.
  insert into _lifting_v1_suffix_bests (
    exercise_id, metric_type, best_value, weight_kg, reps, source_workout_id, achieved_at
  )
  select distinct on (o.exercise_id, o.metric_type)
    o.exercise_id,
    o.metric_type,
    o.metric_value,
    o.weight_kg,
    o.reps,
    o.workout_id,
    o.created_at
  from public.exercise_progress_observations o
  where o.user_id = p_user_id
    and o.valid
    and o.scoring_date < p_from_date
  order by
    o.exercise_id,
    o.metric_type,
    o.metric_value desc,
    o.created_at,
    o.workout_id;

  create temporary table if not exists _lifting_v1_suffix_progress_awards (
    scoring_date date not null,
    exercise_id uuid not null,
    raw_amount integer not null,
    first_workout_id uuid not null,
    first_observed_at timestamptz not null,
    primary key (scoring_date, exercise_id)
  ) on commit drop;
  truncate table _lifting_v1_suffix_progress_awards;

  -- Walk only the affected suffix, seeded by the preserved prefix PBs.
  for v_observation in
    select *
    from _lifting_v1_suffix_observations
    order by observed_at, workout_id, exercise_id, metric_type
  loop
    select b.best_value, b.source_workout_id, b.achieved_at
    into v_previous_best, v_previous_workout_id, v_previous_achieved_at
    from _lifting_v1_suffix_bests b
    where b.exercise_id = v_observation.exercise_id
      and b.metric_type = v_observation.metric_type;

    v_has_previous_best := found;
    v_bonus := 0;

    if v_has_previous_best and v_observation.qualifying_lifting_workout then
      if v_observation.metric_type = 'E1RM' then
        if v_observation.metric_value > v_previous_best and v_previous_best > 0 then
          v_ratio := (v_observation.metric_value - v_previous_best) / v_previous_best;
          v_bonus := case
            when v_ratio + 0.000000000001 >= 0.05 then 15
            when v_ratio + 0.000000000001 >= 0.025 then 10
            when v_ratio + 0.000000000001 >= 0.01 then 5
            else 0
          end;
        end if;
      elsif v_observation.metric_type = 'BODYWEIGHT_REPS' then
        v_delta := floor(v_observation.metric_value)::integer - floor(v_previous_best)::integer;
        v_bonus := case
          when v_delta >= 3 then 15
          when v_delta = 2 then 10
          when v_delta = 1 then 5
          else 0
        end;
      end if;
    end if;

    if v_bonus > 0 then
      insert into _lifting_v1_suffix_progress_awards (
        scoring_date, exercise_id, raw_amount, first_workout_id, first_observed_at
      ) values (
        v_observation.scoring_date,
        v_observation.exercise_id,
        v_bonus,
        v_observation.workout_id,
        v_observation.observed_at
      )
      on conflict (scoring_date, exercise_id) do update
      set raw_amount = least(15, _lifting_v1_suffix_progress_awards.raw_amount + excluded.raw_amount),
          first_observed_at = least(
            _lifting_v1_suffix_progress_awards.first_observed_at,
            excluded.first_observed_at
          );
    end if;

    if not v_has_previous_best or v_observation.metric_value > v_previous_best then
      insert into _lifting_v1_suffix_bests (
        exercise_id, metric_type, best_value, weight_kg, reps, source_workout_id, achieved_at
      ) values (
        v_observation.exercise_id,
        v_observation.metric_type,
        v_observation.metric_value,
        v_observation.weight_kg,
        v_observation.reps,
        v_observation.workout_id,
        v_observation.observed_at
      )
      on conflict (exercise_id, metric_type) do update
      set best_value = excluded.best_value,
          weight_kg = excluded.weight_kg,
          reps = excluded.reps,
          source_workout_id = excluded.source_workout_id,
          achieved_at = excluded.achieved_at;
    end if;
  end loop;

  insert into public.exercise_progress (
    user_id, exercise_id, metric_type, best_value, best_weight_kg, best_reps,
    source_workout_id, achieved_at, updated_at
  )
  select
    p_user_id, b.exercise_id, b.metric_type, b.best_value, b.weight_kg, b.reps,
    b.source_workout_id, b.achieved_at, b.achieved_at
  from _lifting_v1_suffix_bests b;

  -- Same deterministic 30-XP daily progression cap.
  v_current_date := null;
  v_daily_progression := 0;

  for v_award in
    select *
    from _lifting_v1_suffix_progress_awards
    order by scoring_date, first_observed_at, exercise_id
  loop
    if v_current_date is distinct from v_award.scoring_date then
      v_current_date := v_award.scoring_date;
      v_daily_progression := 0;
    end if;

    v_applied := least(v_award.raw_amount, greatest(0, 30 - v_daily_progression));

    if v_applied > 0 then
      insert into public.scoring_events (
        user_id, scoring_date, workout_id, exercise_id, event_type,
        amount, scoring_version, metadata
      ) values (
        p_user_id,
        v_award.scoring_date,
        v_award.first_workout_id,
        v_award.exercise_id,
        'EXERCISE_PROGRESS',
        v_applied,
        'lifting-v1',
        jsonb_build_object(
          'rawBonus', v_award.raw_amount,
          'dailyProgressionBefore', v_daily_progression,
          'dailyProgressionCap', 30,
          'capped', v_applied < v_award.raw_amount
        )
      );

      v_daily_progression := v_daily_progression + v_applied;
    end if;
  end loop;

  if exists (
    select 1
    from public.scoring_events se
    where se.user_id = p_user_id
      and se.scoring_version = 'lifting-v1'
    group by se.scoring_date
    having sum(se.amount) > 125
  ) then
    raise exception 'lifting-v1 daily XP exceeded 125' using errcode = 'P0001';
  end if;

  perform set_config('fitness_game.reconciling_lifting_v1', v_previous_guard, true);
exception
  when others then
    perform set_config('fitness_game.reconciling_lifting_v1', v_previous_guard, true);
    raise;
end;
$$;

revoke all on function private.reconcile_lifting_v1_scoring_from_date(uuid, date)
from public, anon, authenticated;

-- Route source changes to the earliest affected scoring date. A moved workout
-- or source row can therefore invalidate later progress, while the unaffected
-- prefix remains untouched.
create or replace function public.reconcile_lifting_v1_source_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_old_user_id uuid;
  v_new_user_id uuid;
  v_old_date date;
  v_new_date date;
begin
  if coalesce(current_setting('fitness_game.reconciling_lifting_v1', true), '0') = '1' then
    return null;
  end if;

  if tg_table_name = 'workout_sessions' then
    if tg_op <> 'INSERT'
      and old.source = 'IN_APP'
      and old.status = 'COMPLETED' then
      v_old_user_id := old.user_id;
      v_old_date := old.scoring_date;
    end if;

    if tg_op <> 'DELETE'
      and new.source = 'IN_APP'
      and new.status = 'COMPLETED' then
      v_new_user_id := new.user_id;
      v_new_date := new.scoring_date;
    end if;

  elsif tg_table_name = 'workout_exercises' then
    if tg_op <> 'INSERT' then
      select w.user_id, w.scoring_date
      into v_old_user_id, v_old_date
      from public.workout_sessions w
      where w.id = old.workout_id
        and w.source = 'IN_APP'
        and w.status = 'COMPLETED';
    end if;

    if tg_op <> 'DELETE' then
      select w.user_id, w.scoring_date
      into v_new_user_id, v_new_date
      from public.workout_sessions w
      where w.id = new.workout_id
        and w.source = 'IN_APP'
        and w.status = 'COMPLETED';
    end if;

  elsif tg_table_name = 'workout_sets' then
    if tg_op <> 'INSERT' then
      select w.user_id, w.scoring_date
      into v_old_user_id, v_old_date
      from public.workout_exercises we
      join public.workout_sessions w on w.id = we.workout_id
      where we.id = old.workout_exercise_id
        and w.source = 'IN_APP'
        and w.status = 'COMPLETED';
    end if;

    if tg_op <> 'DELETE' then
      select w.user_id, w.scoring_date
      into v_new_user_id, v_new_date
      from public.workout_exercises we
      join public.workout_sessions w on w.id = we.workout_id
      where we.id = new.workout_exercise_id
        and w.source = 'IN_APP'
        and w.status = 'COMPLETED';
    end if;
  end if;

  if v_old_user_id is not null and v_old_date is not null then
    if v_new_user_id = v_old_user_id and v_new_date is not null then
      perform private.reconcile_lifting_v1_scoring_from_date(
        v_old_user_id,
        least(v_old_date, v_new_date)
      );
      return null;
    end if;

    perform private.reconcile_lifting_v1_scoring_from_date(v_old_user_id, v_old_date);
  end if;

  if v_new_user_id is not null
    and v_new_date is not null
    and v_new_user_id is distinct from v_old_user_id then
    perform private.reconcile_lifting_v1_scoring_from_date(v_new_user_id, v_new_date);
  end if;

  return null;
end;
$$;

-- Successful mutation receipts are a bounded idempotency journal, not user
-- progress. Keep a generous server window and never purge an active workout.
create index if not exists workout_mutation_receipts_completed_idx
on public.workout_mutation_receipts (completed_at)
where completed_at is not null;

create or replace function private.purge_expired_workout_mutation_receipts(
  p_now timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_deleted bigint;
begin
  if p_now is null then
    raise exception 'Retention reference time is required' using errcode = '22023';
  end if;

  delete from public.workout_mutation_receipts r
  where r.completed_at is not null
    and r.completed_at < p_now - interval '90 days'
    and exists (
      select 1
      from public.workout_sessions w
      where w.id = r.workout_id
        and w.status <> 'IN_PROGRESS'
    );

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function private.purge_expired_workout_mutation_receipts(timestamptz)
from public, anon, authenticated;

-- Idempotently install one low-frequency cleanup job.
do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'fitness-workout-receipt-retention'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'fitness-workout-receipt-retention',
    '17 4 * * *',
    'select private.purge_expired_workout_mutation_receipts();'
  );
end;
$$;
