begin;

alter table public.profiles add column if not exists profile_code text;
update public.profiles
set profile_code = 'FG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
where profile_code is null;
alter table public.profiles alter column profile_code set default ('FG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)));
alter table public.profiles alter column profile_code set not null;
drop index if exists public.profiles_profile_code_unique;
create unique index profiles_profile_code_unique on public.profiles(upper(profile_code));

-- Retire reusable group tokens only when upgrading the legacy table. Re-running this
-- migration after the token column is gone must not delete legitimate pending invites.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='group_invites' and column_name='token'
  ) then
    delete from public.group_invites;
  end if;
end $$;
drop function if exists public.join_group_by_invite(uuid);
drop policy if exists group_invites_select on public.group_invites;
drop policy if exists group_invites_insert on public.group_invites;
drop policy if exists group_invites_update on public.group_invites;
revoke all on public.group_invites from anon, authenticated;

alter table public.group_invites add column if not exists invited_user_id uuid references public.profiles(id) on delete cascade;
alter table public.group_invites alter column invited_user_id set not null;
alter table public.group_invites drop column if exists token;
alter table public.group_invites drop column if exists expires_at;
alter table public.group_invites drop column if exists max_uses;
alter table public.group_invites drop column if exists use_count;
alter table public.group_invites drop column if exists revoked_at;
create unique index if not exists group_invites_one_pending_per_user_group on public.group_invites(group_id, invited_user_id);

create or replace function public.create_group_invite(p_group_id uuid, p_recipient text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_actor uuid:=auth.uid(); v_role public.group_role; v_target public.profiles%rowtype; v_invite public.group_invites%rowtype; v_input text;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  v_role:=public.group_role_for_user(p_group_id,v_actor);
  if v_role is null or v_role not in ('OWNER','ADMIN') then raise exception 'Not a group administrator' using errcode='42501'; end if;
  v_input:=trim(coalesce(p_recipient,''));
  if v_input='' then raise exception 'Recipient required' using errcode='22023'; end if;
  select * into v_target from public.profiles p
  where lower(p.username)=lower(regexp_replace(v_input,'^@','','g')) or upper(p.profile_code)=upper(v_input)
  order by case when lower(p.username)=lower(regexp_replace(v_input,'^@','','g')) then 0 else 1 end limit 1;
  if not found then raise exception 'User not found' using errcode='22023'; end if;
  if v_target.id=v_actor then raise exception 'You cannot invite yourself' using errcode='22023'; end if;
  if public.group_role_for_user(p_group_id,v_target.id) is not null then raise exception 'User is already an active group member' using errcode='22023'; end if;
  insert into public.group_invites(group_id,created_by,invited_user_id)
  values(p_group_id,v_actor,v_target.id)
  on conflict(group_id,invited_user_id) do nothing;
  select * into v_invite from public.group_invites where group_id=p_group_id and invited_user_id=v_target.id;
  return jsonb_build_object('id',v_invite.id,'group_id',v_invite.group_id,'invited_user_id',v_target.id,'invited_username',v_target.username,'invited_display_name',v_target.display_name,'created_at',v_invite.created_at);
end $$;

create or replace function public.get_group_pending_invites(p_group_id uuid)
returns table(id uuid,group_id uuid,invited_user_id uuid,invited_username text,invited_display_name text,created_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role public.group_role;
begin
  v_role := public.group_role_for_user(p_group_id, auth.uid());
  if v_role is null or v_role not in ('OWNER','ADMIN') then raise exception 'Not a group administrator' using errcode='42501'; end if;
  return query select i.id,i.group_id,p.id,p.username,p.display_name,i.created_at from public.group_invites i join public.profiles p on p.id=i.invited_user_id where i.group_id=p_group_id order by i.created_at desc;
end $$;

create or replace function public.get_my_pending_group_invites()
returns table(id uuid,group_id uuid,group_name text,invited_by_user_id uuid,invited_by_username text,invited_by_display_name text,created_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
  select i.id,i.group_id,g.name,creator.id,creator.username,creator.display_name,i.created_at
  from public.group_invites i join public.groups g on g.id=i.group_id join public.profiles creator on creator.id=i.created_by
  where i.invited_user_id=auth.uid() order by i.created_at desc
$$;

create or replace function public.accept_group_invite(p_invite_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_invite public.group_invites%rowtype;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into v_invite from public.group_invites where id=p_invite_id and invited_user_id=v_user for update;
 if not found then raise exception 'Invite not found' using errcode='22023'; end if;
 insert into public.group_members(group_id,user_id,role,status,joined_at,removed_at) values(v_invite.group_id,v_user,'MEMBER','ACTIVE',now(),null)
 on conflict(group_id,user_id) do update set role='MEMBER',status='ACTIVE',joined_at=now(),removed_at=null;
 delete from public.group_invites where id=p_invite_id;
 return v_invite.group_id;
end $$;

create or replace function public.decline_group_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 delete from public.group_invites where id=p_invite_id and invited_user_id=auth.uid();
 if not found then raise exception 'Invite not found' using errcode='22023'; end if;
end $$;

create or replace function public.revoke_group_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_group uuid; v_role public.group_role;
begin
 select group_id into v_group from public.group_invites where id=p_invite_id for update;
 if not found then raise exception 'Invite not found' using errcode='22023'; end if;
 v_role := public.group_role_for_user(v_group, auth.uid());
 if v_role is null or v_role not in ('OWNER','ADMIN') then raise exception 'Not a group administrator' using errcode='42501'; end if;
 delete from public.group_invites where id=p_invite_id;
end $$;

revoke execute on function public.create_group_invite(uuid,text) from public,anon;
revoke execute on function public.get_group_pending_invites(uuid) from public,anon;
revoke execute on function public.get_my_pending_group_invites() from public,anon;
revoke execute on function public.accept_group_invite(uuid) from public,anon;
revoke execute on function public.decline_group_invite(uuid) from public,anon;
revoke execute on function public.revoke_group_invite(uuid) from public,anon;
grant execute on function public.create_group_invite(uuid,text) to authenticated;
grant execute on function public.get_group_pending_invites(uuid) to authenticated;
grant execute on function public.get_my_pending_group_invites() to authenticated;
grant execute on function public.accept_group_invite(uuid) to authenticated;
grant execute on function public.decline_group_invite(uuid) to authenticated;
grant execute on function public.revoke_group_invite(uuid) to authenticated;

notify pgrst,'reload schema';
commit;
