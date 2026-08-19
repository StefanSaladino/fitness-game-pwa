-- Phase 5.5D security hotfix
-- The leaderboard is authenticated-only.
-- PostgreSQL functions can otherwise inherit EXECUTE through PUBLIC.

revoke execute
  on function public.get_group_lifting_leaderboard(uuid, date)
  from public;

revoke execute
  on function public.get_group_lifting_leaderboard(uuid, date)
  from anon;

grant execute
  on function public.get_group_lifting_leaderboard(uuid, date)
  to authenticated;