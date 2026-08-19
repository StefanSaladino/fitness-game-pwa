-- Workout Game PWA — Phase 5.6 group administration permissions
-- Group membership mutations are authenticated-only RPCs. Authorization still happens inside each function.

revoke execute on function public.join_group_by_invite(uuid) from public;
revoke execute on function public.join_group_by_invite(uuid) from anon;
grant execute on function public.join_group_by_invite(uuid) to authenticated;

revoke execute on function public.remove_group_member(uuid, uuid) from public;
revoke execute on function public.remove_group_member(uuid, uuid) from anon;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

revoke execute on function public.set_group_member_role(uuid, uuid, public.group_role) from public;
revoke execute on function public.set_group_member_role(uuid, uuid, public.group_role) from anon;
grant execute on function public.set_group_member_role(uuid, uuid, public.group_role) to authenticated;

revoke execute on function public.transfer_group_ownership(uuid, uuid) from public;
revoke execute on function public.transfer_group_ownership(uuid, uuid) from anon;
grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;

revoke execute on function public.leave_group(uuid) from public;
revoke execute on function public.leave_group(uuid) from anon;
grant execute on function public.leave_group(uuid) to authenticated;
