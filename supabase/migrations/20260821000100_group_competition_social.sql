-- Fitness Game PWA — Phase 10 group competition/social (v0.9.0)
-- Group-scoped competition and privacy-safe social summaries over authoritative lifting-v1 data.
-- No XP or progression rules are changed by this migration.

create table if not exists public.group_activity_reactions (
  group_id uuid not null references public.groups(id) on delete cascade,
  activity_key text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, activity_key, user_id),
  constraint group_activity_reactions_key_length check (char_length(activity_key) between 8 and 240),
  constraint group_activity_reactions_type_check check (reaction_type in ('FIRE', 'STRONG', 'CLAP'))
);

create index if not exists group_activity_reactions_activity_idx
  on public.group_activity_reactions(group_id, activity_key, reaction_type);

alter table public.group_activity_reactions enable row level security;
revoke all on public.group_activity_reactions from public, anon, authenticated;

drop trigger if exists group_activity_reactions_touch_updated_at on public.group_activity_reactions;
create trigger group_activity_reactions_touch_updated_at
before update on public.group_activity_reactions
for each row execute function public.touch_updated_at();

create or replace function public.group_social_activity_key(p_kind text, p_identity text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select upper(p_kind) || ':' || encode(extensions.digest(p_identity, 'sha256'), 'hex');
$$;

revoke all on function public.group_social_activity_key(text, text) from public, anon, authenticated;

-- Internal target validation. Activity keys are deterministic opaque hashes.
-- PR identity avoids observation UUIDs because Phase 7 may rebuild those rows.
create or replace function public.group_social_activity_exists(
  p_group_id uuid,
  p_activity_key text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with active_members as (
    select gm.user_id
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.status = 'ACTIVE'
  ), pr_context as (
    select
      o.user_id,
      o.workout_id,
      o.exercise_id,
      o.metric_type,
      o.metric_value,
      max(o.metric_value) over (
        partition by o.user_id, o.exercise_id, o.metric_type
        order by o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as previous_best
    from public.exercise_progress_observations o
    join active_members am on am.user_id = o.user_id
    where o.valid
  )
  select exists (
    select 1
    from public.workout_sessions w
    join active_members am on am.user_id = w.user_id
    where w.source = 'IN_APP'
      and w.category = 'STRENGTH'
      and w.status = 'COMPLETED'
      and w.qualifies_lifting
      and p_activity_key = public.group_social_activity_key('LIFT', w.id::text)

    union all

    select 1
    from pr_context p
    where p.previous_best is not null
      and p.metric_value > p.previous_best
      and p_activity_key = public.group_social_activity_key(
        'PR',
        p.user_id::text || ':' || p.exercise_id::text || ':' || p.metric_type || ':' || p.workout_id::text
      )

    union all

    select 1
    from public.user_badges ub
    join active_members am on am.user_id = ub.user_id
    where p_activity_key = public.group_social_activity_key('BADGE', ub.user_id::text || ':' || ub.badge_key)

    union all

    select 1
    from public.weekly_lifting_snapshots wls
    join active_members am on am.user_id = wls.user_id
    where wls.achieved
      and p_activity_key = public.group_social_activity_key('GOAL', wls.user_id::text || ':' || wls.week_start::text)
  );
$$;

revoke all on function public.group_social_activity_exists(uuid, text) from public, anon, authenticated;

create or replace function public.get_group_competition_leaderboard(
  p_group_id uuid,
  p_period text default 'WEEK',
  p_week_start date default null
)
returns table (
  rank bigint,
  member_user_id uuid,
  username text,
  display_name text,
  profile_picture_path text,
  xp bigint,
  lifting_days bigint,
  pr_count bigint,
  badge_count bigint,
  is_current_user boolean,
  period_start date,
  period_end date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_period text := upper(coalesce(trim(p_period), ''));
  v_timezone text;
  v_start date;
  v_end date;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_group_id is null then
    raise exception 'Group id is required' using errcode = '22023';
  end if;
  if not public.is_active_group_member(p_group_id) then
    raise exception 'Active group membership required' using errcode = '42501';
  end if;
  if v_period not in ('WEEK', 'ALL_TIME') then
    raise exception 'Competition period must be WEEK or ALL_TIME' using errcode = '22023';
  end if;

  if v_period = 'WEEK' then
    select p.timezone into v_timezone from public.profiles p where p.id = v_user_id;
    v_start := coalesce(
      p_week_start,
      ((now() at time zone coalesce(v_timezone, 'UTC'))::date
        - (extract(isodow from (now() at time zone coalesce(v_timezone, 'UTC'))::date)::integer - 1))
    );
    if extract(isodow from v_start) <> 1 then
      raise exception 'Week start must be a Monday' using errcode = '22023';
    end if;
    v_end := v_start + 6;
  end if;

  return query
  with members as (
    select gm.user_id
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.status = 'ACTIVE'
  ), scoring as (
    select
      m.user_id,
      coalesce(sum(se.amount) filter (
        where se.scoring_version = 'lifting-v1'
          and (v_period = 'ALL_TIME' or se.scoring_date between v_start and v_end)
      ), 0)::bigint as xp,
      count(distinct se.scoring_date) filter (
        where se.scoring_version = 'lifting-v1'
          and se.event_type = 'LIFTING_WORKOUT'
          and (v_period = 'ALL_TIME' or se.scoring_date between v_start and v_end)
      )::bigint as lifting_days
    from members m
    left join public.scoring_events se on se.user_id = m.user_id
    group by m.user_id
  ), observations as (
    select
      o.user_id,
      o.scoring_date,
      o.created_at,
      o.workout_id,
      o.exercise_id,
      o.metric_type,
      o.metric_value,
      max(o.metric_value) over (
        partition by o.user_id, o.exercise_id, o.metric_type
        order by o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as previous_best
    from public.exercise_progress_observations o
    join members m on m.user_id = o.user_id
    where o.valid
  ), prs as (
    select
      m.user_id,
      count(o.workout_id) filter (
        where o.previous_best is not null
          and o.metric_value > o.previous_best
          and (v_period = 'ALL_TIME' or o.scoring_date between v_start and v_end)
      )::bigint as pr_count
    from members m
    left join observations o on o.user_id = m.user_id
    group by m.user_id
  ), badges as (
    select
      m.user_id,
      count(ub.badge_key) filter (
        where v_period = 'ALL_TIME'
          or ((ub.earned_at at time zone coalesce(bp.timezone, 'UTC'))::date between v_start and v_end)
      )::bigint as badge_count
    from members m
    left join public.user_badges ub on ub.user_id = m.user_id
    left join public.profiles bp on bp.id = m.user_id
    group by m.user_id
  ), ranked as (
    select
      p.id as member_user_id,
      p.username,
      p.display_name,
      p.profile_picture_path,
      s.xp,
      s.lifting_days,
      coalesce(pr.pr_count, 0)::bigint as pr_count,
      coalesce(b.badge_count, 0)::bigint as badge_count,
      p.id = v_user_id as is_current_user,
      dense_rank() over (
        order by s.xp desc, s.lifting_days desc, coalesce(pr.pr_count, 0) desc
      ) as competition_rank
    from members m
    join public.profiles p on p.id = m.user_id
    join scoring s on s.user_id = m.user_id
    left join prs pr on pr.user_id = m.user_id
    left join badges b on b.user_id = m.user_id
  )
  select
    r.competition_rank,
    r.member_user_id,
    r.username,
    r.display_name,
    r.profile_picture_path,
    r.xp,
    r.lifting_days,
    r.pr_count,
    r.badge_count,
    r.is_current_user,
    v_start,
    v_end
  from ranked r
  order by r.competition_rank, lower(r.display_name), r.member_user_id;
end;
$$;

create or replace function public.get_group_social_feed(
  p_group_id uuid,
  p_limit integer default 20,
  p_before_activity_at timestamptz default null,
  p_before_activity_key text default null
)
returns table (
  activity_key text,
  activity_type text,
  activity_at timestamptz,
  actor_user_id uuid,
  username text,
  display_name text,
  profile_picture_path text,
  metadata jsonb,
  fire_count bigint,
  strong_count bigint,
  clap_count bigint,
  my_reaction text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_group_id is null then
    raise exception 'Group id is required' using errcode = '22023';
  end if;
  if not public.is_active_group_member(p_group_id) then
    raise exception 'Active group membership required' using errcode = '42501';
  end if;
  if (p_before_activity_at is null) <> (p_before_activity_key is null) then
    raise exception 'Feed cursor requires both timestamp and activity key' using errcode = '22023';
  end if;

  return query
  with active_members as (
    select gm.user_id
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.status = 'ACTIVE'
  ), lift_activities as (
    select
      public.group_social_activity_key('LIFT', w.id::text) as activity_key,
      'LIFT'::text as activity_type,
      coalesce(w.ended_at, w.started_at) as activity_at,
      w.user_id as actor_user_id,
      jsonb_build_object(
        'scoringDate', w.scoring_date,
        'title', coalesce(nullif(trim(w.subtype), ''), 'Strength session'),
        'durationMinutes', greatest(0, round(w.active_duration_seconds / 60.0)::integer),
        'exerciseCount', (
          select count(distinct we.exercise_id)::integer
          from public.workout_exercises we
          where we.workout_id = w.id
        ),
        'xp', coalesce((
          select sum(se.amount)::integer
          from public.scoring_events se
          where se.user_id = w.user_id
            and se.workout_id = w.id
            and se.scoring_version = 'lifting-v1'
        ), 0)
      ) as metadata
    from public.workout_sessions w
    join active_members am on am.user_id = w.user_id
    where w.source = 'IN_APP'
      and w.category = 'STRENGTH'
      and w.status = 'COMPLETED'
      and w.qualifies_lifting
  ), observation_context as (
    select
      o.*,
      max(o.metric_value) over (
        partition by o.user_id, o.exercise_id, o.metric_type
        order by o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as previous_best
    from public.exercise_progress_observations o
    join active_members am on am.user_id = o.user_id
    where o.valid
  ), pr_activities as (
    select
      public.group_social_activity_key(
        'PR',
        o.user_id::text || ':' || o.exercise_id::text || ':' || o.metric_type || ':' || o.workout_id::text
      ) as activity_key,
      'PR'::text as activity_type,
      o.created_at as activity_at,
      o.user_id as actor_user_id,
      jsonb_build_object(
        'exerciseName', e.canonical_name,
        'metricType', o.metric_type,
        'metricValue', o.metric_value,
        'previousBest', o.previous_best,
        'weightKg', o.weight_kg,
        'reps', o.reps,
        'scoringDate', o.scoring_date
      ) as metadata
    from observation_context o
    join public.exercise_catalog e on e.id = o.exercise_id
    where o.previous_best is not null
      and o.metric_value > o.previous_best
  ), badge_activities as (
    select
      public.group_social_activity_key('BADGE', ub.user_id::text || ':' || ub.badge_key) as activity_key,
      'BADGE'::text as activity_type,
      ub.earned_at as activity_at,
      ub.user_id as actor_user_id,
      jsonb_build_object('badgeKey', ub.badge_key) as metadata
    from public.user_badges ub
    join active_members am on am.user_id = ub.user_id
  ), goal_activities as (
    select
      public.group_social_activity_key('GOAL', wls.user_id::text || ':' || wls.week_start::text) as activity_key,
      'GOAL'::text as activity_type,
      wls.finalized_at as activity_at,
      wls.user_id as actor_user_id,
      jsonb_build_object('weekStart', wls.week_start, 'liftingDays', wls.lifting_days, 'target', wls.target) as metadata
    from public.weekly_lifting_snapshots wls
    join active_members am on am.user_id = wls.user_id
    where wls.achieved
  ), all_activities as (
    select * from lift_activities
    union all select * from pr_activities
    union all select * from badge_activities
    union all select * from goal_activities
  ), page as (
    select a.*
    from all_activities a
    where p_before_activity_at is null
      or a.activity_at < p_before_activity_at
      or (a.activity_at = p_before_activity_at and a.activity_key < p_before_activity_key)
    order by a.activity_at desc, a.activity_key desc
    limit v_limit
  )
  select
    pg.activity_key,
    pg.activity_type,
    pg.activity_at,
    pg.actor_user_id,
    p.username,
    p.display_name,
    p.profile_picture_path,
    pg.metadata,
    count(r.user_id) filter (where r.reaction_type = 'FIRE')::bigint as fire_count,
    count(r.user_id) filter (where r.reaction_type = 'STRONG')::bigint as strong_count,
    count(r.user_id) filter (where r.reaction_type = 'CLAP')::bigint as clap_count,
    max(r.reaction_type) filter (where r.user_id = v_user_id) as my_reaction
  from page pg
  join public.profiles p on p.id = pg.actor_user_id
  left join public.group_activity_reactions r
    on r.group_id = p_group_id
   and r.activity_key = pg.activity_key
   and exists (
     select 1
     from public.group_members reacting_member
     where reacting_member.group_id = p_group_id
       and reacting_member.user_id = r.user_id
       and reacting_member.status = 'ACTIVE'
   )
  group by pg.activity_key, pg.activity_type, pg.activity_at, pg.actor_user_id,
           p.username, p.display_name, p.profile_picture_path, pg.metadata
  order by pg.activity_at desc, pg.activity_key desc;
end;
$$;

create or replace function public.set_group_activity_reaction(
  p_group_id uuid,
  p_activity_key text,
  p_reaction_type text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_reaction text := upper(nullif(trim(p_reaction_type), ''));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_group_id is null then
    raise exception 'Group id is required' using errcode = '22023';
  end if;
  if p_activity_key is null or char_length(p_activity_key) not between 8 and 240 then
    raise exception 'Activity key is invalid' using errcode = '22023';
  end if;
  if not public.is_active_group_member(p_group_id) then
    raise exception 'Active group membership required' using errcode = '42501';
  end if;

  if v_reaction is null then
    delete from public.group_activity_reactions
    where group_id = p_group_id
      and activity_key = p_activity_key
      and user_id = v_user_id;
    return;
  end if;

  if not public.group_social_activity_exists(p_group_id, p_activity_key) then
    raise exception 'Social activity is not available in this group' using errcode = '22023';
  end if;

  if v_reaction not in ('FIRE', 'STRONG', 'CLAP') then
    raise exception 'Unsupported reaction' using errcode = '22023';
  end if;

  insert into public.group_activity_reactions (group_id, activity_key, user_id, reaction_type)
  values (p_group_id, p_activity_key, v_user_id, v_reaction)
  on conflict (group_id, activity_key, user_id) do update
    set reaction_type = excluded.reaction_type,
        updated_at = now();
end;
$$;

revoke all on function public.get_group_competition_leaderboard(uuid, text, date) from public, anon, authenticated;
grant execute on function public.get_group_competition_leaderboard(uuid, text, date) to authenticated;
revoke all on function public.get_group_social_feed(uuid, integer, timestamptz, text) from public, anon, authenticated;
grant execute on function public.get_group_social_feed(uuid, integer, timestamptz, text) to authenticated;
revoke all on function public.set_group_activity_reaction(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_group_activity_reaction(uuid, text, text) to authenticated;

comment on table public.group_activity_reactions is
  'Phase 10 group-scoped lightweight reactions. Activity payloads remain derived from authoritative workout/scoring/progression/badge state.';
comment on function public.get_group_social_feed(uuid, integer, timestamptz, text) is
  'Returns cursor-paginated qualifying lift, PR, badge, and weekly-goal summaries. Raw sets and notes are never returned.';

notify pgrst, 'reload schema';
