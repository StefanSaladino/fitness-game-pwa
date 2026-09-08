create or replace function public.start_lifting_workout_from_preset(
  p_exercise_ids uuid[],
  p_superset_groups jsonb,
  p_action_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_groups jsonb := coalesce(p_superset_groups, '[]'::jsonb);
  v_group jsonb;
  v_member_text text;
  v_member_id uuid;
  v_seen_members uuid[] := array[]::uuid[];
  v_group_id uuid;
  v_group_order integer;
  v_workout_id uuid;
  v_result jsonb;
  v_updated integer;
begin
  if jsonb_typeof(v_groups) <> 'array' then
    raise exception 'Preset Superset groups must be an array' using errcode = '22023';
  end if;

  for v_group in
    select value
    from jsonb_array_elements(v_groups)
  loop
    if jsonb_typeof(v_group) <> 'array' or jsonb_array_length(v_group) < 2 then
      raise exception 'Preset Superset groups require at least two exercises' using errcode = '22023';
    end if;

    for v_member_text in
      select value
      from jsonb_array_elements_text(v_group)
    loop
      begin
        v_member_id := v_member_text::uuid;
      exception when others then
        raise exception 'Preset Superset contains an invalid exercise id' using errcode = '22023';
      end;

      if v_member_id is null or not (v_member_id = any(p_exercise_ids)) then
        raise exception 'Preset Superset contains an exercise outside the preset' using errcode = '22023';
      end if;

      if v_member_id = any(v_seen_members) then
        raise exception 'Preset exercise cannot belong to more than one Superset' using errcode = '22023';
      end if;

      v_seen_members := array_append(v_seen_members, v_member_id);
    end loop;
  end loop;

  -- Reuse the existing guarded preset-start boundary. Because this overloaded
  -- function executes in the same transaction, any later grouping failure
  -- rolls back the session and exercise creation as one atomic unit.
  v_result := public.start_lifting_workout_from_preset(p_exercise_ids, p_action_at);
  v_workout_id := nullif(v_result ->> 'id', '')::uuid;

  if v_workout_id is null then
    raise exception 'Unable to start preset workout' using errcode = 'P0001';
  end if;

  for v_group in
    select value
    from jsonb_array_elements(v_groups)
  loop
    v_group_id := gen_random_uuid();
    v_group_order := 0;

    for v_member_text in
      select value
      from jsonb_array_elements_text(v_group)
    loop
      v_member_id := v_member_text::uuid;

      update public.workout_exercises
      set superset_group_id = v_group_id,
          superset_order = v_group_order
      where workout_id = v_workout_id
        and exercise_id = v_member_id;

      get diagnostics v_updated = row_count;
      if v_updated <> 1 then
        raise exception 'Preset Superset could not be applied atomically' using errcode = 'P0001';
      end if;

      v_group_order := v_group_order + 1;
    end loop;
  end loop;

  return v_result;
end;
$$;

revoke all on function public.start_lifting_workout_from_preset(uuid[], jsonb, timestamptz) from public;
revoke all on function public.start_lifting_workout_from_preset(uuid[], jsonb, timestamptz) from anon;
grant execute on function public.start_lifting_workout_from_preset(uuid[], jsonb, timestamptz) to authenticated;

comment on function public.start_lifting_workout_from_preset(uuid[], jsonb, timestamptz)
is 'Atomically starts a validated lifting preset and applies optional Superset membership/order while preserving the legacy non-Superset preset RPC.';
