-- Phase 20.2: complete reproducible generator inputs.
-- Durable generated-program persistence remains Phase 20.4.

alter table public.training_program_profiles
  add column goal text,
  add column sessions_per_week smallint;

alter table public.training_program_profiles
  add constraint training_program_profiles_goal_check
    check (goal is null or goal in ('STRENGTH','HYPERTROPHY','BALANCED')),
  add constraint training_program_profiles_sessions_check
    check (sessions_per_week is null or sessions_per_week between 1 and 6),
  add constraint training_program_profiles_generation_pair_check
    check ((goal is null) = (sessions_per_week is null));

comment on column public.training_program_profiles.goal is
  'Explicit training-program-v1 goal. Null until configured.';
comment on column public.training_program_profiles.sessions_per_week is
  'Explicit requested lifting sessions/week for training-program-v1. Null until configured.';

create or replace function public.update_my_training_program_generation_preferences(
  p_goal text,
  p_sessions_per_week integer,
  p_expected_revision bigint
)
returns public.training_program_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_goal text;
  v_current_revision bigint;
  v_after public.training_program_profiles%rowtype;
begin
  v_actor := private.require_active_account();
  v_goal := pg_catalog.upper(pg_catalog.btrim(coalesce(p_goal, '')));

  if v_goal not in ('STRENGTH','HYPERTROPHY','BALANCED') then
    raise exception 'Training program goal must be STRENGTH, HYPERTROPHY, or BALANCED'
      using errcode = '22023';
  end if;

  if p_sessions_per_week is null
     or p_sessions_per_week < 1
     or p_sessions_per_week > 6 then
    raise exception 'Training program sessions per week must be between 1 and 6'
      using errcode = '22023';
  end if;

  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception 'Training program profile revision must be one or greater'
      using errcode = '22023';
  end if;

  select tpp.revision
  into v_current_revision
  from public.training_program_profiles tpp
  where tpp.user_id = v_actor
  for update;

  if not found then
    raise exception 'Configure training equipment access before program preferences'
      using errcode = '22023';
  end if;

  if v_current_revision <> p_expected_revision then
    raise exception 'Training program profile changed. Reload and try again.'
      using errcode = '40001';
  end if;

  update public.training_program_profiles
  set goal = v_goal,
      sessions_per_week = p_sessions_per_week::smallint,
      revision = revision + 1,
      updated_at = pg_catalog.now()
  where user_id = v_actor
  returning * into v_after;

  return v_after;
end;
$$;

revoke all on function public.update_my_training_program_generation_preferences(text,integer,bigint)
from public, anon, authenticated;
grant execute on function public.update_my_training_program_generation_preferences(text,integer,bigint)
to authenticated;

comment on function public.update_my_training_program_generation_preferences(text,integer,bigint) is
  'Updates only the active callers explicit training-program-v1 goal and sessions/week using optimistic profile revision control.';

create or replace function public.get_my_training_program_candidate_catalog()
returns table (
  exercise_id uuid,
  canonical_name text,
  measurement_type text,
  primary_muscle_group text,
  workout_type text,
  supports_added_weight boolean,
  supports_assisted boolean,
  volume_eligible boolean,
  contributions jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_active_account();

  return query
  select
    e.id,
    e.canonical_name,
    e.measurement_type,
    e.primary_muscle_group,
    e.workout_type,
    e.supports_added_weight,
    e.supports_assisted,
    coalesce(r.volume_eligible, false),
    coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'muscleGroup', c.muscle_group,
          'role', c.contribution_role,
          'weight', c.contribution_weight
        )
        order by c.contribution_role, c.muscle_group
      ) filter (where c.exercise_id is not null),
      '[]'::jsonb
    )
  from public.exercise_catalog e
  left join public.muscle_volume_exercise_rules r
    on r.exercise_id = e.id
   and r.methodology_version = 'muscle-volume-v1'
  left join public.muscle_volume_exercise_contributions c
    on c.exercise_id = e.id
   and c.methodology_version = 'muscle-volume-v1'
  where e.active = true
    and e.measurement_type in ('WEIGHT_REPS','BODYWEIGHT_REPS')
  group by
    e.id,
    e.canonical_name,
    e.measurement_type,
    e.primary_muscle_group,
    e.workout_type,
    e.supports_added_weight,
    e.supports_assisted,
    r.volume_eligible
  order by e.canonical_name, e.id;
end;
$$;

revoke all on function public.get_my_training_program_candidate_catalog()
from public, anon, authenticated;
grant execute on function public.get_my_training_program_candidate_catalog()
to authenticated;

comment on function public.get_my_training_program_candidate_catalog() is
  'Authenticated training-program-v1 candidate read model: 512 active normally loggable exercises plus muscle-volume-v1 eligibility and contribution metadata.';
