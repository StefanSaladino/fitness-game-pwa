-- Top Set — authoritative badge progress read model
-- Adds a guarded read-only RPC for partial progress toward all badge thresholds.
-- Progress remains derived from the same authoritative history used by badge reconciliation.

create or replace function public.get_my_lifting_badge_progress()
returns table (
  pr_count integer,
  lifting_day_count integer,
  goals_hit integer,
  best_completed_week_streak integer,
  cardio_bonus_day_count integer,
  badges jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_today date;
  v_pr_count integer := 0;
  v_lifting_day_count integer := 0;
  v_goals_hit integer := 0;
  v_best_completed_week_streak integer := 0;
  v_cardio_bonus_day_count integer := 0;
  v_badges jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select p.timezone
  into v_timezone
  from public.profiles p
  where p.id = v_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = '22023';
  end if;

  v_today := (now() at time zone v_timezone)::date;

  -- Rebuild snapshots, streaks, and earned badges before exposing progress so
  -- historical corrections cannot leave the read model stale.
  perform public.reconcile_weekly_lifting_consistency_for_user(v_user_id, v_today);

  -- Match the reconciler's authoritative lifting-v1 event ledger exactly.
  select count(*)::integer
  into v_lifting_day_count
  from public.scoring_events se
  where se.user_id = v_user_id
    and se.scoring_version = 'lifting-v1'
    and se.event_type = 'LIFTING_WORKOUT';

  select count(*)::integer
  into v_cardio_bonus_day_count
  from public.scoring_events se
  where se.user_id = v_user_id
    and se.scoring_version = 'lifting-v1'
    and se.event_type = 'CARDIO_BONUS';

  -- Match the reconciler's PR definition: a valid observation only counts when
  -- it improves on a prior best for the same exercise + metric.
  select count(*)::integer
  into v_pr_count
  from (
    select
      o.metric_value,
      max(o.metric_value) over (
        partition by o.exercise_id, o.metric_type
        order by o.created_at, o.workout_id
        rows between unbounded preceding and 1 preceding
      ) as prior_best
    from public.exercise_progress_observations o
    where o.user_id = v_user_id
      and o.valid
  ) ordered_observations
  where ordered_observations.prior_best is not null
    and ordered_observations.metric_value > ordered_observations.prior_best;

  select
    coalesce(s.goals_hit, 0),
    coalesce(s.best_completed_week_streak, 0)
  into v_goals_hit, v_best_completed_week_streak
  from public.lifting_consistency_state s
  where s.user_id = v_user_id;

  v_goals_hit := coalesce(v_goals_hit, 0);
  v_best_completed_week_streak := coalesce(v_best_completed_week_streak, 0);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'badgeKey', ub.badge_key,
        'earnedAt', ub.earned_at
      )
      order by ub.earned_at desc, ub.badge_key
    ),
    '[]'::jsonb
  )
  into v_badges
  from public.user_badges ub
  where ub.user_id = v_user_id;

  return query
  select
    coalesce(v_pr_count, 0),
    coalesce(v_lifting_day_count, 0),
    coalesce(v_goals_hit, 0),
    coalesce(v_best_completed_week_streak, 0),
    coalesce(v_cardio_bonus_day_count, 0),
    coalesce(v_badges, '[]'::jsonb);
end;
$$;

revoke all on function public.get_my_lifting_badge_progress() from public, anon, authenticated;
grant execute on function public.get_my_lifting_badge_progress() to authenticated;
