-- Phase 20.3: versioned exercise constraints for deterministic generation
-- and substitution. Constraint reasons describe user intent only; they are not
-- diagnoses or medical-safety determinations.

create table public.training_program_constraints (
  user_id uuid primary key
    references public.profiles(id) on delete cascade,
  revision bigint not null default 1
    check (revision >= 1),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.training_program_exercise_constraints (
  user_id uuid not null
    references public.training_program_constraints(user_id)
    on delete cascade,
  exercise_id uuid not null
    references public.exercise_catalog(id)
    on delete restrict,
  constraint_kind text not null
    check (constraint_kind in ('EXCLUDE','PREFER')),
  reason text not null
    check (reason in ('PREFERENCE','PHYSICAL_LIMITATION','UNAVAILABLE','OTHER')),
  created_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, exercise_id),
  constraint training_program_preference_reason_check
    check (constraint_kind = 'EXCLUDE' or reason = 'PREFERENCE')
);

create index training_program_exercise_constraints_exercise_idx
  on public.training_program_exercise_constraints(exercise_id);

alter table public.training_program_constraints enable row level security;
alter table public.training_program_exercise_constraints enable row level security;

create policy training_program_constraints_select_own
on public.training_program_constraints
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy training_program_exercise_constraints_select_own
on public.training_program_exercise_constraints
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.training_program_constraints
from public, anon, authenticated;
revoke all on table public.training_program_exercise_constraints
from public, anon, authenticated;

grant select on table public.training_program_constraints to authenticated;
grant select on table public.training_program_exercise_constraints to authenticated;

create or replace function public.get_my_training_program_constraints()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_revision bigint;
  v_entries jsonb;
begin
  v_actor := private.require_active_account();

  select tpc.revision
  into v_revision
  from public.training_program_constraints tpc
  where tpc.user_id = v_actor;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'exerciseId', tpec.exercise_id,
        'kind', tpec.constraint_kind,
        'reason', tpec.reason
      )
      order by tpec.exercise_id
    ),
    '[]'::jsonb
  )
  into v_entries
  from public.training_program_exercise_constraints tpec
  where tpec.user_id = v_actor;

  return pg_catalog.jsonb_build_object(
    'revision', coalesce(v_revision, 0),
    'entries', v_entries
  );
end;
$$;

revoke all on function public.get_my_training_program_constraints()
from public, anon, authenticated;
grant execute on function public.get_my_training_program_constraints()
to authenticated;

comment on function public.get_my_training_program_constraints() is
  'Returns the active callers versioned exercise exclusion/preference snapshot for training-program-v1.';

create or replace function public.replace_my_training_program_exercise_constraints(
  p_constraints jsonb,
  p_expected_revision bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_current_revision bigint;
  v_after public.training_program_constraints%rowtype;
  v_entries jsonb;
begin
  v_actor := private.require_active_account();

  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Training program constraint revision must be zero or greater'
      using errcode = '22023';
  end if;

  if p_constraints is null
     or pg_catalog.jsonb_typeof(p_constraints) <> 'array' then
    raise exception 'Training program constraints must be a JSON array'
      using errcode = '22023';
  end if;

  if pg_catalog.jsonb_array_length(p_constraints) > 200 then
    raise exception 'Training program constraints cannot exceed 200 exercises'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_constraints) item
    where pg_catalog.jsonb_typeof(item) <> 'object'
       or (item - 'exerciseId' - 'kind' - 'reason') <> '{}'::jsonb
       or coalesce(item->>'exerciseId','') !~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or coalesce(item->>'kind','') not in ('EXCLUDE','PREFER')
       or coalesce(item->>'reason','') not in (
         'PREFERENCE','PHYSICAL_LIMITATION','UNAVAILABLE','OTHER'
       )
       or (
         item->>'kind' = 'PREFER'
         and item->>'reason' <> 'PREFERENCE'
       )
  ) then
    raise exception 'Training program constraints contain an invalid entry'
      using errcode = '22023';
  end if;

  if (
    select pg_catalog.count(*)
    from pg_catalog.jsonb_array_elements(p_constraints)
  ) <> (
    select pg_catalog.count(distinct item->>'exerciseId')
    from pg_catalog.jsonb_array_elements(p_constraints) item
  ) then
    raise exception 'Training program constraints cannot repeat an exercise'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_constraints) item
    where not exists (
      select 1
      from public.exercise_catalog ec
      where ec.id = (item->>'exerciseId')::uuid
    )
  ) then
    raise exception 'Training program constraint exercise does not exist'
      using errcode = '22023';
  end if;

  select tpc.revision
  into v_current_revision
  from public.training_program_constraints tpc
  where tpc.user_id = v_actor
  for update;

  if found then
    if v_current_revision <> p_expected_revision then
      raise exception 'Training program constraints changed. Reload and try again.'
        using errcode = '40001';
    end if;

    update public.training_program_constraints
    set revision = revision + 1,
        updated_at = pg_catalog.now()
    where user_id = v_actor
    returning * into v_after;
  else
    if p_expected_revision <> 0 then
      raise exception 'Training program constraints changed. Reload and try again.'
        using errcode = '40001';
    end if;

    insert into public.training_program_constraints(user_id, revision)
    values (v_actor, 1)
    returning * into v_after;
  end if;

  delete from public.training_program_exercise_constraints
  where user_id = v_actor;

  insert into public.training_program_exercise_constraints(
    user_id,
    exercise_id,
    constraint_kind,
    reason
  )
  select
    v_actor,
    (item->>'exerciseId')::uuid,
    item->>'kind',
    item->>'reason'
  from pg_catalog.jsonb_array_elements(p_constraints) item;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'exerciseId', tpec.exercise_id,
        'kind', tpec.constraint_kind,
        'reason', tpec.reason
      )
      order by tpec.exercise_id
    ),
    '[]'::jsonb
  )
  into v_entries
  from public.training_program_exercise_constraints tpec
  where tpec.user_id = v_actor;

  return pg_catalog.jsonb_build_object(
    'revision', v_after.revision,
    'entries', v_entries
  );
end;
$$;

revoke all on function public.replace_my_training_program_exercise_constraints(jsonb,bigint)
from public, anon, authenticated;
grant execute on function public.replace_my_training_program_exercise_constraints(jsonb,bigint)
to authenticated;

comment on function public.replace_my_training_program_exercise_constraints(jsonb,bigint) is
  'Atomically replaces the active callers training-program-v1 exercise constraints using optimistic revision control.';

notify pgrst, 'reload schema';
