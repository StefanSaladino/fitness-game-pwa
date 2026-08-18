-- Workout Game PWA — Phase 4 data foundation
-- Source of truth: docs/DOMAIN-RULES.md and docs/TESTING.md

create extension if not exists pgcrypto with schema extensions;

create type public.group_role as enum ('OWNER', 'ADMIN', 'MEMBER');
create type public.group_member_status as enum ('ACTIVE', 'REMOVED');
create type public.workout_category as enum ('STRENGTH', 'RUNNING', 'WALKING_HIKING', 'CYCLING', 'SWIMMING', 'SPORT', 'CARDIO', 'HIIT', 'MOBILITY', 'OTHER');
create type public.workout_status as enum ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type public.workout_source as enum ('IN_APP', 'MANUAL', 'EXTERNAL');
create type public.set_type as enum ('WARMUP', 'WORKING', 'DROP', 'FAILURE');
create type public.xp_event_type as enum ('DAILY_WORKOUT', 'PERFORMANCE_BONUS', 'WEEKLY_IMPROVEMENT');
create type public.benchmark_state as enum ('UNSEEN', 'CALIBRATING', 'ESTABLISHED');

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  timezone text not null default 'America/Toronto',
  weekly_workout_target smallint not null default 3 check (weekly_workout_target between 1 and 7),
  pending_weekly_workout_target smallint check (pending_weekly_workout_target between 1 and 7),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.group_role not null default 'MEMBER',
  status public.group_member_status not null default 'ACTIVE',
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (group_id, user_id),
  check ((status = 'ACTIVE' and removed_at is null) or (status = 'REMOVED' and removed_at is not null))
);

create unique index group_members_one_active_owner
  on public.group_members(group_id)
  where role = 'OWNER' and status = 'ACTIVE';

create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses integer not null default 25 check (max_uses between 1 and 1000),
  use_count integer not null default 0 check (use_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (use_count <= max_uses)
);

create table public.exercise_catalog (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  measurement_type text not null check (measurement_type in ('WEIGHT_REPS', 'BODYWEIGHT_REPS', 'DURATION', 'OTHER')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category public.workout_category not null,
  subtype text,
  status public.workout_status not null default 'IN_PROGRESS',
  source public.workout_source not null default 'IN_APP',
  started_at timestamptz not null,
  ended_at timestamptz,
  active_duration_seconds integer not null default 0 check (active_duration_seconds >= 0 and active_duration_seconds <= 86400),
  timezone_at_start text not null,
  scoring_date date not null,
  qualifies boolean not null default false,
  needs_review boolean not null default false,
  notes text check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create index workout_sessions_user_scoring_date_idx on public.workout_sessions(user_id, scoring_date);
create index workout_sessions_user_started_at_idx on public.workout_sessions(user_id, started_at desc);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercise_catalog(id) on delete restrict,
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now(),
  unique(workout_id, order_index)
);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number integer not null check (set_number >= 1),
  set_type public.set_type not null default 'WORKING',
  weight_kg numeric(8,3) check (weight_kg is null or weight_kg >= 0),
  reps integer check (reps is null or reps >= 0),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(workout_exercise_id, set_number),
  check ((completed = false) or completed_at is not null)
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scoring_date date not null,
  workout_id uuid references public.workout_sessions(id) on delete set null,
  event_type public.xp_event_type not null,
  amount integer not null check (amount > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index xp_events_daily_workout_unique
  on public.xp_events(user_id, scoring_date)
  where event_type = 'DAILY_WORKOUT';
create unique index xp_events_performance_unique
  on public.xp_events(user_id, scoring_date)
  where event_type = 'PERFORMANCE_BONUS';
create unique index xp_events_weekly_improvement_unique
  on public.xp_events(user_id, scoring_date)
  where event_type = 'WEEKLY_IMPROVEMENT';

create table public.performance_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid not null references public.workout_sessions(id) on delete cascade,
  benchmark_key text not null check (char_length(benchmark_key) between 3 and 160),
  metric_type text not null check (char_length(metric_type) between 2 and 80),
  metric_value numeric not null check (metric_value > 0),
  higher_is_better boolean not null,
  scoring_date date not null,
  valid boolean not null default true,
  created_at timestamptz not null default now(),
  unique(workout_id, benchmark_key)
);

create index performance_observations_user_benchmark_idx
  on public.performance_observations(user_id, benchmark_key, scoring_date, created_at);

create table public.performance_benchmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  benchmark_key text not null,
  state public.benchmark_state not null default 'UNSEEN',
  valid_observation_count integer not null default 0 check (valid_observation_count >= 0),
  benchmark_value numeric,
  higher_is_better boolean,
  last_bonus_scoring_date date,
  updated_at timestamptz not null default now(),
  primary key (user_id, benchmark_key),
  check ((state = 'UNSEEN' and valid_observation_count = 0 and benchmark_value is null)
      or (state = 'CALIBRATING' and valid_observation_count = 1 and benchmark_value is null)
      or (state = 'ESTABLISHED' and valid_observation_count >= 2 and benchmark_value is not null))
);

create table public.weekly_goals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  target smallint not null check (target between 1 and 7),
  created_at timestamptz not null default now(),
  primary key (user_id, week_start),
  check (extract(isodow from week_start) = 1)
);

-- Profile is created automatically when a Supabase Auth user is created.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'New athlete'
  );

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    'u_' || substring(replace(new.id::text, '-', '') from 1 for 30),
    left(v_display_name, 80)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();


create or replace function public.validate_profile_timezone()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profiles_validate_timezone before insert or update of timezone on public.profiles
for each row execute function public.validate_profile_timezone();

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger groups_touch_updated_at before update on public.groups for each row execute function public.touch_updated_at();

-- Expandable group helpers. Security-definer helpers avoid recursive RLS checks.
create or replace function public.is_active_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = auth.uid() and gm.status = 'ACTIVE'
  );
$$;

create or replace function public.current_group_role(p_group_id uuid)
returns public.group_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select gm.role from public.group_members gm
  where gm.group_id = p_group_id and gm.user_id = auth.uid() and gm.status = 'ACTIVE'
  limit 1;
$$;

create or replace function public.group_role_for_user(p_group_id uuid, p_user_id uuid)
returns public.group_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select gm.role from public.group_members gm
  where gm.group_id = p_group_id and gm.user_id = p_user_id and gm.status = 'ACTIVE'
  limit 1;
$$;

create or replace function public.users_share_active_group(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on b.group_id = a.group_id
    where a.user_id = auth.uid() and a.status = 'ACTIVE'
      and b.user_id = p_other_user_id and b.status = 'ACTIVE'
  );
$$;

create or replace function public.add_group_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.group_members (group_id, user_id, role, status)
  values (new.id, new.created_by, 'OWNER', 'ACTIVE');
  return new;
end;
$$;

create trigger group_created_owner
after insert on public.groups
for each row execute function public.add_group_creator_as_owner();

create or replace function public.complete_onboarding(p_display_name text, p_timezone text, p_weekly_target smallint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_week_start date;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if exists (select 1 from public.profiles where id = v_user and onboarding_completed_at is not null) then
    raise exception 'Onboarding already completed' using errcode = '22023';
  end if;
  if char_length(trim(p_display_name)) not between 1 and 80 then raise exception 'Invalid display name' using errcode = '22023'; end if;
  if p_weekly_target not between 1 and 7 then raise exception 'Weekly target must be 1-7' using errcode = '22023'; end if;
  if not exists (select 1 from pg_timezone_names where name = p_timezone) then raise exception 'Invalid timezone' using errcode = '22023'; end if;

  update public.profiles
  set display_name = trim(p_display_name),
      timezone = p_timezone,
      weekly_workout_target = p_weekly_target,
      pending_weekly_workout_target = null,
      onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = v_user;

  v_week_start := ((now() at time zone p_timezone)::date - (extract(isodow from (now() at time zone p_timezone)::date)::int - 1));
  insert into public.weekly_goals (user_id, week_start, target)
  values (v_user, v_week_start, p_weekly_target)
  on conflict (user_id, week_start) do nothing;
end;
$$;

create or replace function public.schedule_weekly_target(p_target smallint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_target not between 1 and 7 then raise exception 'Weekly target must be 1-7' using errcode = '22023'; end if;
  update public.profiles set pending_weekly_workout_target = p_target where id = auth.uid();
end;
$$;

create or replace function public.join_group_by_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.group_invites%rowtype;
  v_already_active boolean;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;

  select * into v_invite from public.group_invites where token = p_token for update;
  if not found then raise exception 'Invite not found' using errcode = '22023'; end if;
  if v_invite.revoked_at is not null then raise exception 'Invite has been revoked' using errcode = '22023'; end if;
  if v_invite.expires_at <= now() then raise exception 'Invite has expired' using errcode = '22023'; end if;
  if v_invite.use_count >= v_invite.max_uses then raise exception 'Invite has reached its use limit' using errcode = '22023'; end if;

  select exists(
    select 1 from public.group_members
    where group_id = v_invite.group_id and user_id = v_user and status = 'ACTIVE'
  ) into v_already_active;

  if not v_already_active then
    insert into public.group_members (group_id, user_id, role, status, joined_at, removed_at)
    values (v_invite.group_id, v_user, 'MEMBER', 'ACTIVE', now(), null)
    on conflict (group_id, user_id) do update
      set role = 'MEMBER', status = 'ACTIVE', joined_at = now(), removed_at = null;

    update public.group_invites set use_count = use_count + 1 where id = v_invite.id;
  end if;

  return v_invite.group_id;
end;
$$;

create or replace function public.remove_group_member(p_group_id uuid, p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_role public.group_role := public.group_role_for_user(p_group_id, auth.uid());
  v_target_role public.group_role := public.group_role_for_user(p_group_id, p_target_user_id);
begin
  if v_actor_role is null then raise exception 'Not a group member' using errcode = '42501'; end if;
  if v_target_role is null then raise exception 'Target is not an active group member' using errcode = '22023'; end if;
  if v_target_role = 'OWNER' then raise exception 'Owner cannot be removed' using errcode = '42501'; end if;
  if v_actor_role = 'MEMBER' then raise exception 'Insufficient role' using errcode = '42501'; end if;
  if v_actor_role = 'ADMIN' and v_target_role <> 'MEMBER' then raise exception 'Admin can only remove members' using errcode = '42501'; end if;

  update public.group_members
  set status = 'REMOVED', removed_at = now()
  where group_id = p_group_id and user_id = p_target_user_id;
end;
$$;

create or replace function public.set_group_member_role(p_group_id uuid, p_target_user_id uuid, p_role public.group_role)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target_role public.group_role;
begin
  if public.group_role_for_user(p_group_id, auth.uid()) is distinct from 'OWNER' then
    raise exception 'Only the owner can change roles' using errcode = '42501';
  end if;
  if p_role = 'OWNER' then raise exception 'Use transfer_group_ownership to change owners' using errcode = '22023'; end if;
  v_target_role := public.group_role_for_user(p_group_id, p_target_user_id);
  if v_target_role is null then raise exception 'Target is not active' using errcode = '22023'; end if;
  if v_target_role = 'OWNER' then raise exception 'Use transfer_group_ownership to change the owner role' using errcode = '22023'; end if;

  update public.group_members set role = p_role
  where group_id = p_group_id and user_id = p_target_user_id and status = 'ACTIVE';
end;
$$;

create or replace function public.transfer_group_ownership(p_group_id uuid, p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
begin
  if public.group_role_for_user(p_group_id, v_actor) is distinct from 'OWNER' then
    raise exception 'Only the owner can transfer ownership' using errcode = '42501';
  end if;
  if p_target_user_id = v_actor then return; end if;
  if public.group_role_for_user(p_group_id, p_target_user_id) is null then
    raise exception 'Target must be an active group member' using errcode = '22023';
  end if;

  update public.group_members set role = 'ADMIN'
  where group_id = p_group_id and user_id = v_actor and status = 'ACTIVE';
  update public.group_members set role = 'OWNER'
  where group_id = p_group_id and user_id = p_target_user_id and status = 'ACTIVE';
end;
$$;

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.group_role := public.group_role_for_user(p_group_id, auth.uid());
begin
  if v_role is null then raise exception 'Not an active group member' using errcode = '22023'; end if;
  if v_role = 'OWNER' then raise exception 'Transfer ownership before leaving' using errcode = '42501'; end if;

  update public.group_members set status = 'REMOVED', removed_at = now()
  where group_id = p_group_id and user_id = auth.uid();
end;
$$;

-- Workout qualification is derived. React cannot make a workout qualify by setting the boolean.
create or replace function public.prepare_workout_session()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_working_sets integer := 0;
  v_threshold integer;
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone_at_start) then
    raise exception 'Invalid timezone: %', new.timezone_at_start using errcode = '22023';
  end if;

  new.scoring_date := (new.started_at at time zone new.timezone_at_start)::date;
  new.needs_review := new.active_duration_seconds > 21600;

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
    new.qualifies := new.active_duration_seconds >= 900 and v_working_sets >= 4;
    return new;
  end if;

  v_threshold := case new.category
    when 'RUNNING' then 900
    when 'WALKING_HIKING' then 1800
    when 'CYCLING' then 1200
    when 'SWIMMING' then 900
    when 'SPORT' then 1200
    when 'CARDIO' then 1200
    when 'HIIT' then 720
    when 'MOBILITY' then 1200
    when 'OTHER' then 1200
    else 2147483647
  end;
  new.qualifies := new.active_duration_seconds >= v_threshold;
  return new;
end;
$$;

create trigger workout_session_prepare
before insert or update on public.workout_sessions
for each row execute function public.prepare_workout_session();

create or replace function public.refresh_parent_workout_from_set()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new_workout_id uuid;
  v_old_workout_id uuid;
begin
  if tg_op <> 'DELETE' then
    select workout_id into v_new_workout_id from public.workout_exercises where id = new.workout_exercise_id;
  end if;
  if tg_op <> 'INSERT' then
    select workout_id into v_old_workout_id from public.workout_exercises where id = old.workout_exercise_id;
  end if;

  if v_new_workout_id is not null then
    update public.workout_sessions set updated_at = now() where id = v_new_workout_id;
  end if;
  if v_old_workout_id is not null and v_old_workout_id is distinct from v_new_workout_id then
    update public.workout_sessions set updated_at = now() where id = v_old_workout_id;
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger workout_set_refresh_parent
after insert or update or delete on public.workout_sets
for each row execute function public.refresh_parent_workout_from_set();

-- RLS and grants. Raw SQL-created tables do not get safe client grants automatically.
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.exercise_catalog enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.xp_events enable row level security;
alter table public.performance_observations enable row level security;
alter table public.performance_benchmarks enable row level security;
alter table public.weekly_goals enable row level security;

revoke all on table public.profiles, public.groups, public.group_members, public.group_invites,
  public.exercise_catalog, public.workout_sessions, public.workout_exercises, public.workout_sets,
  public.xp_events, public.performance_observations, public.performance_benchmarks, public.weekly_goals
from anon, authenticated;

-- Profiles: self-write; shared-group read.
grant select on public.profiles to authenticated;
grant update (username, display_name, timezone) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
using ((select auth.uid()) = id or public.users_share_active_group(id));
create policy profiles_update on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Groups: active members can read; users can create groups for themselves.
grant select, insert on public.groups to authenticated;
grant update (name) on public.groups to authenticated;
create policy groups_select on public.groups for select to authenticated
using (public.is_active_group_member(id));
create policy groups_insert on public.groups for insert to authenticated
with check (created_by = (select auth.uid()));
create policy groups_update on public.groups for update to authenticated
using (public.current_group_role(id) in ('OWNER', 'ADMIN'))
with check (public.current_group_role(id) in ('OWNER', 'ADMIN'));

-- Membership is read-only from the client. Mutations go through audited functions.
grant select on public.group_members to authenticated;
create policy group_members_select on public.group_members for select to authenticated
using (public.is_active_group_member(group_id));

-- Invites can be managed by owners/admins; joining is via RPC.
grant select, insert on public.group_invites to authenticated;
grant update (expires_at, max_uses, revoked_at) on public.group_invites to authenticated;
create policy group_invites_select on public.group_invites for select to authenticated
using (public.current_group_role(group_id) in ('OWNER', 'ADMIN'));
create policy group_invites_insert on public.group_invites for insert to authenticated
with check (created_by = (select auth.uid()) and public.current_group_role(group_id) in ('OWNER', 'ADMIN'));
create policy group_invites_update on public.group_invites for update to authenticated
using (public.current_group_role(group_id) in ('OWNER', 'ADMIN'))
with check (public.current_group_role(group_id) in ('OWNER', 'ADMIN'));

-- Exercise catalog is global read-only data.
grant select on public.exercise_catalog to authenticated;
create policy exercise_catalog_select on public.exercise_catalog for select to authenticated using (true);

-- Workout sessions are private to their owner in this phase.
grant select, insert, update, delete on public.workout_sessions to authenticated;
create policy workout_sessions_select on public.workout_sessions for select to authenticated using (user_id = (select auth.uid()));
create policy workout_sessions_insert on public.workout_sessions for insert to authenticated with check (user_id = (select auth.uid()));
create policy workout_sessions_update on public.workout_sessions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy workout_sessions_delete on public.workout_sessions for delete to authenticated using (user_id = (select auth.uid()));

-- Exercise/set rows follow workout ownership. Mutation is limited to in-progress workouts.
grant select, insert, update, delete on public.workout_exercises to authenticated;
create policy workout_exercises_select on public.workout_exercises for select to authenticated
using (exists (select 1 from public.workout_sessions w where w.id = workout_id and w.user_id = (select auth.uid())));
create policy workout_exercises_insert on public.workout_exercises for insert to authenticated
with check (exists (select 1 from public.workout_sessions w where w.id = workout_id and w.user_id = (select auth.uid()) and w.status = 'IN_PROGRESS'));
create policy workout_exercises_update on public.workout_exercises for update to authenticated
using (exists (select 1 from public.workout_sessions w where w.id = workout_id and w.user_id = (select auth.uid()) and w.status = 'IN_PROGRESS'))
with check (exists (select 1 from public.workout_sessions w where w.id = workout_id and w.user_id = (select auth.uid()) and w.status = 'IN_PROGRESS'));
create policy workout_exercises_delete on public.workout_exercises for delete to authenticated
using (exists (select 1 from public.workout_sessions w where w.id = workout_id and w.user_id = (select auth.uid()) and w.status = 'IN_PROGRESS'));

grant select, insert, update, delete on public.workout_sets to authenticated;
create policy workout_sets_select on public.workout_sets for select to authenticated
using (exists (
  select 1 from public.workout_exercises we join public.workout_sessions w on w.id = we.workout_id
  where we.id = workout_exercise_id and w.user_id = (select auth.uid())
));
create policy workout_sets_insert on public.workout_sets for insert to authenticated
with check (exists (
  select 1 from public.workout_exercises we join public.workout_sessions w on w.id = we.workout_id
  where we.id = workout_exercise_id and w.user_id = (select auth.uid()) and w.status = 'IN_PROGRESS'
));
create policy workout_sets_update on public.workout_sets for update to authenticated
using (exists (
  select 1 from public.workout_exercises we join public.workout_sessions w on w.id = we.workout_id
  where we.id = workout_exercise_id and w.user_id = (select auth.uid()) and w.status = 'IN_PROGRESS'
))
with check (exists (
  select 1 from public.workout_exercises we join public.workout_sessions w on w.id = we.workout_id
  where we.id = workout_exercise_id and w.user_id = (select auth.uid()) and w.status = 'IN_PROGRESS'
));
create policy workout_sets_delete on public.workout_sets for delete to authenticated
using (exists (
  select 1 from public.workout_exercises we join public.workout_sessions w on w.id = we.workout_id
  where we.id = workout_exercise_id and w.user_id = (select auth.uid()) and w.status = 'IN_PROGRESS'
));

-- Derived/authoritative tables: clients can read their own records but cannot write them directly.
grant select on public.xp_events, public.performance_observations, public.performance_benchmarks, public.weekly_goals to authenticated;
create policy xp_events_select on public.xp_events for select to authenticated using (user_id = (select auth.uid()));
create policy performance_observations_select on public.performance_observations for select to authenticated using (user_id = (select auth.uid()));
create policy performance_benchmarks_select on public.performance_benchmarks for select to authenticated using (user_id = (select auth.uid()));
create policy weekly_goals_select on public.weekly_goals for select to authenticated using (user_id = (select auth.uid()));

-- Trigger/internal functions are never browser RPCs.
revoke all on function public.touch_updated_at() from public;
revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.validate_profile_timezone() from public;
revoke all on function public.add_group_creator_as_owner() from public;
revoke all on function public.prepare_workout_session() from public;
revoke all on function public.refresh_parent_workout_from_set() from public;

-- Function grants. Internal helpers are not callable directly by browser roles.
revoke all on function public.is_active_group_member(uuid) from public;
revoke all on function public.current_group_role(uuid) from public;
revoke all on function public.users_share_active_group(uuid) from public;
revoke all on function public.group_role_for_user(uuid, uuid) from public;
revoke all on function public.complete_onboarding(text, text, smallint) from public;
revoke all on function public.schedule_weekly_target(smallint) from public;
revoke all on function public.join_group_by_invite(uuid) from public;
revoke all on function public.remove_group_member(uuid, uuid) from public;
revoke all on function public.set_group_member_role(uuid, uuid, public.group_role) from public;
revoke all on function public.transfer_group_ownership(uuid, uuid) from public;
revoke all on function public.leave_group(uuid) from public;

grant execute on function public.is_active_group_member(uuid) to authenticated;
grant execute on function public.current_group_role(uuid) to authenticated;
grant execute on function public.users_share_active_group(uuid) to authenticated;
grant execute on function public.complete_onboarding(text, text, smallint) to authenticated;
grant execute on function public.schedule_weekly_target(smallint) to authenticated;
grant execute on function public.join_group_by_invite(uuid) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.set_group_member_role(uuid, uuid, public.group_role) to authenticated;
grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
