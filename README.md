# Targeted invite pgTAP test fix

This patch changes tests only. Do not grant SELECT on `public.group_invites` to `authenticated`.

Replace:
- `supabase/tests/003_groups.test.sql`
- `supabase/tests/016_targeted_group_invitations.test.sql`

The tests now inspect pending invites through the authenticated SECURITY DEFINER read RPCs:
- `public.get_group_pending_invites(uuid)`
- `public.get_my_pending_group_invites()`

This keeps the production privilege boundary intact while still verifying create, accept, decline, revoke, duplicate-idempotence, and cleanup behavior.
