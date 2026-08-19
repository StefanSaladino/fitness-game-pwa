-- Workout Game PWA — Phase 5.5D dashboard read models
-- Adds a safe group leaderboard read function over authoritative lifting-v1 scoring events.

create or replace function public.get_group_lifting_leaderboard(
  p_group_id uuid,
  p_week_start date
)
returns table (
  member_user_id uuid,
  username text,
  display_name text,
  profile_picture_path text,
  xp bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_active_group_member(p_group_id) then
    raise exception 'Not a group member' using errcode = '42501';
  end if;

  return query
  select
    gm.user_id,
    p.username,
    p.display_name,
    p.profile_picture_path,
    coalesce(sum(se.amount), 0)::bigint as xp
  from public.group_members gm
  join public.profiles p on p.id = gm.user_id
  left join public.scoring_events se
    on se.user_id = gm.user_id
   and se.scoring_version = 'lifting-v1'
   and se.scoring_date between p_week_start and (p_week_start + 6)
  where gm.group_id = p_group_id
    and gm.status = 'ACTIVE'
  group by gm.user_id, p.username, p.display_name, p.profile_picture_path
  order by coalesce(sum(se.amount), 0) desc, lower(p.display_name), gm.user_id;
end;
$$;

revoke all on function public.get_group_lifting_leaderboard(uuid, date) from public;
grant execute on function public.get_group_lifting_leaderboard(uuid, date) to authenticated;

comment on function public.get_group_lifting_leaderboard(uuid, date) is
  'Returns active group members ranked by lifting-v1 XP for the supplied Monday-Sunday scoring week. Caller must be an active member of the group.';
