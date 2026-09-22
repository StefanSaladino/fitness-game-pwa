-- Phase 20.1 hotfix: correct COALESCE usage in the access-profile RPC.
-- The original applied migration incorrectly schema-qualified the SQL COALESCE
-- expression as pg_catalog.coalesce(...), causing authenticated writes to fail.

create or replace function public.update_my_training_program_access_profile(
  p_access_mode text,
  p_equipment_keys text[],
  p_expected_revision bigint
)
returns public.training_program_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_mode text;
  v_equipment_keys text[];
  v_current_revision bigint;
  v_after public.training_program_profiles%rowtype;
begin
  v_actor := private.require_active_account();

  v_mode := pg_catalog.upper(pg_catalog.btrim(coalesce(p_access_mode, '')));
  if v_mode not in ('COMMERCIAL_GYM','CUSTOM') then
    raise exception 'Training program access mode must be COMMERCIAL_GYM or CUSTOM'
      using errcode = '22023';
  end if;

  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Training program profile revision must be zero or greater'
      using errcode = '22023';
  end if;

  select coalesce(
    pg_catalog.array_agg(normalized_key order by normalized_key),
    '{}'::text[]
  )
  into v_equipment_keys
  from (
    select distinct pg_catalog.upper(pg_catalog.btrim(raw_key)) as normalized_key
    from pg_catalog.unnest(coalesce(p_equipment_keys, '{}'::text[])) as equipment(raw_key)
    where raw_key is not null
      and pg_catalog.btrim(raw_key) <> ''
  ) normalized;

  if exists (
    select 1
    from pg_catalog.unnest(v_equipment_keys) as equipment(key)
    where not (
      key = any(array[
        'DUMBBELLS','BARBELL','RACK','BENCH','PULL_UP_BAR','DIP_STATION',
        'CABLE_STATION','MACHINES','BANDS','KETTLEBELLS','LANDMINE','RINGS',
        'PLYOMETRIC_BOX','GHD_BACK_EXTENSION','MEDICINE_BALL','SPECIALTY_BARS','STRONGMAN'
      ]::text[])
    )
  ) then
    raise exception 'Training program equipment selection contains an unsupported key'
      using errcode = '22023';
  end if;

  if v_mode = 'COMMERCIAL_GYM' and pg_catalog.cardinality(v_equipment_keys) <> 0 then
    raise exception 'Commercial gym access must not store custom equipment selections'
      using errcode = '22023';
  end if;

  select tpp.revision
  into v_current_revision
  from public.training_program_profiles tpp
  where tpp.user_id = v_actor
  for update;

  if found then
    if v_current_revision <> p_expected_revision then
      raise exception 'Training program access profile changed. Reload and try again.'
        using errcode = '40001';
    end if;

    update public.training_program_profiles
    set access_mode = v_mode,
        equipment_keys = v_equipment_keys,
        revision = revision + 1,
        updated_at = pg_catalog.now()
    where user_id = v_actor
    returning * into v_after;
  else
    if p_expected_revision <> 0 then
      raise exception 'Training program access profile changed. Reload and try again.'
        using errcode = '40001';
    end if;

    insert into public.training_program_profiles (
      user_id,
      access_mode,
      equipment_keys,
      revision
    ) values (
      v_actor,
      v_mode,
      v_equipment_keys,
      1
    )
    returning * into v_after;
  end if;

  return v_after;
end;
$$;

revoke all on function public.update_my_training_program_access_profile(text,text[],bigint)
from public, anon, authenticated;
grant execute on function public.update_my_training_program_access_profile(text,text[],bigint)
to authenticated;

comment on function public.update_my_training_program_access_profile(text,text[],bigint) is
  'Creates or updates only the active callers Phase 20 equipment/access profile using optimistic revision control. Equipment keys are normalized and validated server-side.';
