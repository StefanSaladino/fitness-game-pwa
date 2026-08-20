# Group creation RLS hotfix

Apply this over the current v0.4.0 tree.

## Why

The browser previously used `.from('groups').insert(...).select(...)`. The `groups_select`
RLS policy only exposes groups to active members, while OWNER membership is established by
the group-created trigger. Returning the inserted row therefore creates an avoidable RLS
boundary during creation.

## What changes

- Adds authenticated `create_group(text)` SECURITY DEFINER RPC.
- RPC derives ownership from `auth.uid()` instead of trusting a client-supplied user id.
- Existing `group_created_owner` trigger still establishes the single OWNER membership.
- Revokes direct `INSERT` on `groups` from `authenticated`.
- Changes `groupService.createGroup` to use the RPC.
- Adds 10 pgTAP assertions and updates the unit test.

## Apply

1. Run `supabase/migrations/20260819000700_create_group_rpc.sql` in Supabase SQL Editor.
2. Run `supabase/tests/012_create_group_rpc.test.sql`.
3. Apply the two TypeScript files.
4. Run the normal local validation suite.
