-- Workout Game PWA — group creation RLS hotfix
-- Group creation is an authenticated database operation so the caller never has
-- to INSERT a row and immediately SELECT it before owner membership is visible.

create or replace function public.create_group(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_name text;
  v_group public.groups%rowtype;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Keep the database boundary defensive even though the client already normalizes names.
  v_name := regexp_replace(trim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g');
  if char_length(v_name) not between 1 and 80 then
    raise exception 'Group name must be between 1 and 80 characters' using errcode = '22023';
  end if;

  insert into public.groups (name, created_by)
  values (v_name, v_user)
  returning * into v_group;

  -- group_created_owner fires as part of the insert and establishes OWNER membership.
  return jsonb_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'created_at', v_group.created_at
  );
end;
$$;

-- Browser clients no longer create groups by inserting directly into the table.
revoke insert on public.groups from authenticated;

revoke execute on function public.create_group(text) from public;
revoke execute on function public.create_group(text) from anon;
grant execute on function public.create_group(text) to authenticated;

notify pgrst, 'reload schema';
