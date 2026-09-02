-- Top Set — Phase 17.7 release-candidate security hardening
-- group_role_for_user is an internal SECURITY DEFINER authorization helper.
-- It accepts an arbitrary user id so it must never be directly callable by a browser role.
-- Existing SECURITY DEFINER group-management RPCs continue to call it as the function owner.

revoke execute on function public.group_role_for_user(uuid, uuid) from authenticated;

comment on function public.group_role_for_user(uuid, uuid) is
  'Internal group authorization helper used by guarded server-side RPCs. Not a browser RPC.';

notify pgrst, 'reload schema';
