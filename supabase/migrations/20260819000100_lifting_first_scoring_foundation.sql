-- Workout Game PWA — Phase 5.4 lifting-first scoring foundation (v0.3)
-- Source of truth: docs/DOMAIN-RULES.md
--
-- This migration is additive. The original v0.2 xp/performance tables remain in place
-- for migration safety but are legacy-only from lifting-v1 onward.

create type public.scoring_event_type as enum (
  'LIFTING_WORKOUT',
  'EXERCISE_COMPLETE',
  'EXERCISE_PROGRESS',
  'CARDIO_BONUS'
);

alter table public.workout_sessions
  add column qualifies_lifting boolean not null default false,
  add column qualifies_cardio_bonus boolean not null default false;

comment on column public.profiles.weekly_workout_target is
  'v0.3 lifting-v1: number of lifting days targeted per Monday-Sunday week.';
comment on column public.profiles.pending_weekly_workout_target is
  'v0.3 lifting-v1: next-week lifting-day target, if a change is scheduled.';
comment on table public.weekly_goals is
  'Historical weekly lifting-day targets. Cardio does not satisfy this target.';
comment on table public.xp_events is
  'Legacy v0.2 XP ledger. New lifting-v1 scoring writes to public.scoring_events.';
comment on table public.performance_observations is
  'Legacy v0.2 generic performance observations. New lifting-v1 writes exercise_progress_observations.';
comment on table public.performance_benchmarks is
  'Legacy v0.2 generic benchmark state. New lifting-v1 writes exercise_progress.';

create table public.scoring_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scoring_date date not null,
  workout_id uuid references public.workout_sessions(id) on delete set null,
  exercise_id uuid references public.exercise_catalog(id) on delete restrict,
  event_type public.scoring_event_type not null,
  amount integer not null check (amount > 0 and amount <= 125),
  scoring_version text not null default 'lifting-v1' check (char_length(scoring_version) between 3 and 40),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    (event_type in ('EXERCISE_COMPLETE', 'EXERCISE_PROGRESS') and exercise_id is not null)
    or
    (event_type in ('LIFTING_WORKOUT', 'CARDIO_BONUS') and exercise_id is null)
  )
);

create unique index scoring_events_lifting_workout_unique
  on public.scoring_events(user_id, scoring_date)
  where event_type = 'LIFTING_WORKOUT';

create unique index scoring_events_exercise_complete_unique
  on public.scoring_events(user_id, scoring_date, exercise_id)
  where event_type = 'EXERCISE_COMPLETE';

create unique index scoring_events_exercise_progress_unique
  on public.scoring_events(user_id, scoring_date, exercise_id)
  where event_type = 'EXERCISE_PROGRESS';

create unique index scoring_events_cardio_bonus_unique
  on public.scoring_events(user_id, scoring_date)
  where event_type = 'CARDIO_BONUS';

create index scoring_events_user_date_idx
  on public.scoring_events(user_id, scoring_date desc, created_at desc);

create table public.exercise_progress_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercise_catalog(id) on delete restrict,
  metric_type text not null check (metric_type in ('E1RM', 'BODYWEIGHT_REPS')),
  metric_value numeric not null check (metric_value > 0),
  weight_kg numeric(8,3) check (weight_kg is null or weight_kg >= 0),
  reps integer check (reps is null or reps >= 1),
  scoring_date date not null,
  valid boolean not null default true,
  created_at timestamptz not null default now(),
  unique(workout_id, exercise_id, metric_type)
);

create index exercise_progress_observations_lookup_idx
  on public.exercise_progress_observations(user_id, exercise_id, metric_type, scoring_date desc, created_at desc);

create table public.exercise_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercise_catalog(id) on delete restrict,
  metric_type text not null check (metric_type in ('E1RM', 'BODYWEIGHT_REPS')),
  best_value numeric not null check (best_value > 0),
  best_weight_kg numeric(8,3) check (best_weight_kg is null or best_weight_kg >= 0),
  best_reps integer check (best_reps is null or best_reps >= 1),
  source_workout_id uuid references public.workout_sessions(id) on delete set null,
  achieved_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id, metric_type)
);

create trigger exercise_progress_touch_updated_at
before update on public.exercise_progress
for each row execute function public.touch_updated_at();

-- Reframe qualification into two explicit scoring flags.
-- `qualifies` remains as a transitional aggregate flag for older code paths.
create or replace function public.prepare_workout_session()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_working_sets integer := 0;
  v_cardio_threshold integer;
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone_at_start) then
    raise exception 'Invalid timezone: %', new.timezone_at_start using errcode = '22023';
  end if;

  new.scoring_date := (new.started_at at time zone new.timezone_at_start)::date;
  new.needs_review := new.active_duration_seconds > 21600;
  new.qualifies_lifting := false;
  new.qualifies_cardio_bonus := false;

  if new.status <> 'COMPLETED' or new.needs_review then
    new.qualifies := false;
    return new;
  end if;

  if new.category = 'STRENGTH' then
    if tg_op <> 'INSERT' then
      select count(*) into v_working_sets
      from public.workout_exercises we
      join public.workout_sets ws on ws.workout_exercise_id = we.id
      where we.workout_id = new.id
        and ws.set_type = 'WORKING'
        and ws.completed = true
        and coalesce(ws.reps, 0) >= 1;
    end if;

    new.qualifies_lifting := new.active_duration_seconds >= 900 and v_working_sets >= 4;
    new.qualifies := new.qualifies_lifting;
    return new;
  end if;

  v_cardio_threshold := case new.category
    when 'RUNNING' then 900
    when 'WALKING_HIKING' then 1800
    when 'CYCLING' then 1200
    when 'SWIMMING' then 900
    when 'SPORT' then 1200
    when 'CARDIO' then 1200
    when 'HIIT' then 720
    else null
  end;

  if v_cardio_threshold is not null then
    new.qualifies_cardio_bonus := new.active_duration_seconds >= v_cardio_threshold;
  end if;

  new.qualifies := new.qualifies_cardio_bonus;
  return new;
end;
$$;

alter table public.scoring_events enable row level security;
alter table public.exercise_progress_observations enable row level security;
alter table public.exercise_progress enable row level security;

revoke all on table public.scoring_events, public.exercise_progress_observations, public.exercise_progress
from anon, authenticated;

grant select on public.scoring_events, public.exercise_progress_observations, public.exercise_progress
to authenticated;

create policy scoring_events_select on public.scoring_events
for select to authenticated using (user_id = (select auth.uid()));

create policy exercise_progress_observations_select on public.exercise_progress_observations
for select to authenticated using (user_id = (select auth.uid()));

create policy exercise_progress_select on public.exercise_progress
for select to authenticated using (user_id = (select auth.uid()));
