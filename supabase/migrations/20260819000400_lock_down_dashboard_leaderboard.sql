-- Workout Game PWA — Phase 5.5D security hotfix
-- PostgreSQL functions may retain EXECUTE through role grants; explicitly restrict the leaderboard.

revoke execute on function public.get_group_lifting_leaderboard(uuid, date) from public;
revoke execute on function public.get_group_lifting_leaderboard(uuid, date) from anon;
grant execute on function public.get_group_lifting_leaderboard(uuid, date) to authenticated;
