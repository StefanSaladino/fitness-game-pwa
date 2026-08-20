-- Fitness Game PWA — Phase 7 authoritative lifting-v1 scoring persistence (v0.6.0)
-- Rebuild derived scoring/progression from authoritative completed IN_APP source data.

-- The foundation indexes predated explicit scoring-version coexistence.
-- Re-key the ledger uniqueness rules by scoring_version so future versions can
-- coexist without colliding with immutable lifting-v1 history.
drop index if exists public.scoring_events_lifting_workout_unique;
create unique index scoring_events_lifting_workout_unique
  on public.scoring_events(user_id, scoring_date, scoring_version)
  where event_type = 'LIFTING_WORKOUT';

drop index if exists public.scoring_events_exercise_complete_unique;
create unique index scoring_events_exercise_complete_unique
  on public.scoring_events(user_id, scoring_date, exercise_id, scoring_version)
  where event_type = 'EXERCISE_COMPLETE';

drop index if exists public.scoring_events_exercise_progress_unique;
create unique index scoring_events_exercise_progress_unique
  on public.scoring_events(user_id, scoring_date, exercise_id, scoring_version)
  where event_type = 'EXERCISE_PROGRESS';

drop index if exists public.scoring_events_cardio_bonus_unique;
create unique index scoring_events_cardio_bonus_unique
  on public.scoring_events(user_id, scoring_date, scoring_version)
  where event_type = 'CARDIO_BONUS';

create or replace function public.reconcile_lifting_v1_scoring_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
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
  if p_user_id is null then
    raise exception 'User id is required' using errcode = '22023';
  end if;

  -- Reconciliation updates qualification flags, which fire source triggers.
  -- A scoped guard prevents recursive rebuilds while allowing later statements
  -- in the same transaction to reconcile normally after this call returns.
  if v_previous_guard = '1' then
    return;
  end if;
  perform set_config('fitness_game.reconciling_lifting_v1', '1', true);

  -- Serialize all rebuilds for one user. Hash collisions only serialize extra
  -- users; they cannot weaken correctness.
  perform pg_advisory_xact_lock(7647, hashtext(p_user_id::text));

  if not exists (select 1 from public.profiles where id = p_user_id) then
    perform set_config('fitness_game.reconciling_lifting_v1', v_previous_guard, true);
    return;
  end if;

  -- Set edits to a completed lift can change qualification, so refresh the
  -- explicit flags before deriving scoring. Manual/external eligibility flags
  -- retain the existing foundation semantics; only IN_APP rows are rebuilt here.
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
      or w.qualifies is distinct from case when w.category = 'STRENGTH' then c.qualifies_lifting else c.qualifies_cardio_bonus end
    );

  -- Derived state is rebuilt from source rows so retries, historical edits,
  -- deletes, and out-of-order backfills cannot leave orphaned downstream XP.
  delete from public.scoring_events
  where user_id = p_user_id
    and scoring_version = 'lifting-v1';

  delete from public.exercise_progress_observations
  where user_id = p_user_id;

  delete from public.exercise_progress
  where user_id = p_user_id;

  -- One 50-XP lifting award per scoring date.
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
  order by w.scoring_date, w.started_at, w.id;

  -- Exercise-completion XP is canonical-ID based, once per date, with two
  -- completed working sets and a six-exercise daily cap. It mirrors the pure
  -- oracle and does not require the containing workout itself to qualify.
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

  -- Best cardio tier only, one event/date.
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

  create temporary table if not exists _lifting_v1_observations (
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
  truncate table _lifting_v1_observations;

  -- Weighted exercises use best completed WORKING-set Epley e1RM (1-12 reps).
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
      and e.measurement_type = 'WEIGHT_REPS'
      and ws.set_type = 'WORKING'
      and ws.completed
      and ws.weight_kg > 0
      and ws.reps between 1 and 12
  )
  insert into _lifting_v1_observations (
    workout_id, exercise_id, metric_type, metric_value, weight_kg, reps,
    scoring_date, observed_at, qualifying_lifting_workout
  )
  select
    workout_id, exercise_id, metric_type, metric_value, weight_kg, reps,
    scoring_date, observed_at, qualifies_lifting
  from weighted
  where metric_rank = 1;

  -- Plain bodyweight exercises compare completed reps only. Added/assisted
  -- variants remain intentionally non-comparable until a future normalized rule.
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
      and e.measurement_type = 'BODYWEIGHT_REPS'
      and ws.set_type = 'WORKING'
      and ws.completed
      and ws.reps >= 1
      and coalesce(ws.bodyweight_mode, 'BODYWEIGHT') = 'BODYWEIGHT'
      and ws.weight_kg is null
  )
  insert into _lifting_v1_observations (
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
  from _lifting_v1_observations o
  order by o.observed_at, o.workout_id, o.exercise_id;

  create temporary table if not exists _lifting_v1_bests (
    exercise_id uuid not null,
    metric_type text not null,
    best_value numeric not null,
    weight_kg numeric,
    reps integer,
    source_workout_id uuid not null,
    achieved_at timestamptz not null,
    primary key (exercise_id, metric_type)
  ) on commit drop;
  truncate table _lifting_v1_bests;

  create temporary table if not exists _lifting_v1_progress_awards (
    scoring_date date not null,
    exercise_id uuid not null,
    raw_amount integer not null,
    first_workout_id uuid not null,
    first_observed_at timestamptz not null,
    primary key (scoring_date, exercise_id)
  ) on commit drop;
  truncate table _lifting_v1_progress_awards;

  -- Walk observations in source chronology. The current performance compares
  -- against the prior PB before that PB is updated.
  for v_observation in
    select *
    from _lifting_v1_observations
    order by observed_at, workout_id, exercise_id, metric_type
  loop
    select b.best_value, b.source_workout_id, b.achieved_at
    into v_previous_best, v_previous_workout_id, v_previous_achieved_at
    from _lifting_v1_bests b
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
      insert into _lifting_v1_progress_awards (
        scoring_date, exercise_id, raw_amount, first_workout_id, first_observed_at
      ) values (
        v_observation.scoring_date,
        v_observation.exercise_id,
        v_bonus,
        v_observation.workout_id,
        v_observation.observed_at
      )
      on conflict (scoring_date, exercise_id) do update
      set raw_amount = least(15, _lifting_v1_progress_awards.raw_amount + excluded.raw_amount),
          first_observed_at = least(_lifting_v1_progress_awards.first_observed_at, excluded.first_observed_at);
    end if;

    if not v_has_previous_best or v_observation.metric_value > v_previous_best then
      insert into _lifting_v1_bests (
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
  from _lifting_v1_bests b;

  -- Apply the 30-XP daily progression cap in deterministic chronological order.
  v_current_date := null;
  v_daily_progression := 0;
  for v_award in
    select *
    from _lifting_v1_progress_awards
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

  -- The four layer caps should make this impossible; keep an executable guard
  -- so a future scoring change cannot silently exceed the locked 125/day rule.
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
end;
$$;

revoke all on function public.reconcile_lifting_v1_scoring_for_user(uuid) from public, anon, authenticated;

create or replace function public.reconcile_my_lifting_v1_scoring()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform public.reconcile_lifting_v1_scoring_for_user(v_user_id);
end;
$$;

revoke all on function public.reconcile_my_lifting_v1_scoring() from public, anon, authenticated;
grant execute on function public.reconcile_my_lifting_v1_scoring() to authenticated;

create or replace function public.reconcile_lifting_v1_source_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_user_id uuid;
  v_new_user_id uuid;
begin
  if coalesce(current_setting('fitness_game.reconciling_lifting_v1', true), '0') = '1' then
    return null;
  end if;

  if tg_table_name = 'workout_sessions' then
    if tg_op <> 'INSERT'
      and old.source = 'IN_APP'
      and old.status = 'COMPLETED' then
      v_old_user_id := old.user_id;
    end if;
    if tg_op <> 'DELETE'
      and new.source = 'IN_APP'
      and new.status = 'COMPLETED' then
      v_new_user_id := new.user_id;
    end if;

  elsif tg_table_name = 'workout_exercises' then
    if tg_op <> 'INSERT' then
      select w.user_id into v_old_user_id
      from public.workout_sessions w
      where w.id = old.workout_id
        and w.source = 'IN_APP'
        and w.status = 'COMPLETED';
    end if;
    if tg_op <> 'DELETE' then
      select w.user_id into v_new_user_id
      from public.workout_sessions w
      where w.id = new.workout_id
        and w.source = 'IN_APP'
        and w.status = 'COMPLETED';
    end if;

  elsif tg_table_name = 'workout_sets' then
    if tg_op <> 'INSERT' then
      select w.user_id into v_old_user_id
      from public.workout_exercises we
      join public.workout_sessions w on w.id = we.workout_id
      where we.id = old.workout_exercise_id
        and w.source = 'IN_APP'
        and w.status = 'COMPLETED';
    end if;
    if tg_op <> 'DELETE' then
      select w.user_id into v_new_user_id
      from public.workout_exercises we
      join public.workout_sessions w on w.id = we.workout_id
      where we.id = new.workout_exercise_id
        and w.source = 'IN_APP'
        and w.status = 'COMPLETED';
    end if;
  end if;

  if v_old_user_id is not null then
    perform public.reconcile_lifting_v1_scoring_for_user(v_old_user_id);
  end if;
  if v_new_user_id is not null and v_new_user_id is distinct from v_old_user_id then
    perform public.reconcile_lifting_v1_scoring_for_user(v_new_user_id);
  end if;

  return null;
end;
$$;

revoke all on function public.reconcile_lifting_v1_source_change() from public, anon, authenticated;

drop trigger if exists workout_sessions_reconcile_lifting_v1 on public.workout_sessions;
create trigger workout_sessions_reconcile_lifting_v1
after insert or update or delete on public.workout_sessions
for each row execute function public.reconcile_lifting_v1_source_change();

drop trigger if exists workout_exercises_reconcile_lifting_v1 on public.workout_exercises;
create trigger workout_exercises_reconcile_lifting_v1
after insert or update or delete on public.workout_exercises
for each row execute function public.reconcile_lifting_v1_source_change();

drop trigger if exists workout_sets_reconcile_lifting_v1 on public.workout_sets;
create trigger workout_sets_reconcile_lifting_v1
after insert or update or delete on public.workout_sets
for each row execute function public.reconcile_lifting_v1_source_change();

-- Backfill existing source history once on migration. The same function is safe
-- to rerun because it replaces derived lifting-v1 state from source rows.
do $$
declare
  v_profile record;
begin
  for v_profile in select id from public.profiles order by id loop
    perform public.reconcile_lifting_v1_scoring_for_user(v_profile.id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
