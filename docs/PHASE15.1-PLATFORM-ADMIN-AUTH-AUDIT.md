# Phase 15.1 — Platform-admin authorization + audit foundation

Version target: **v0.13.0**

## Boundary

Phase 15.1 establishes the authorization and audit substrate required by the later platform-administration screens. It deliberately does **not** add an admin console, capacity provider integration, user suspension controls, account deletion controls, or admin-to-user messaging yet.

Platform administration is separate from group administration. A user can be an OWNER or ADMIN of any number of fitness groups without gaining platform privileges.

## Database model

Operational security data lives in the non-exposed `private` schema:

- `private.platform_account_state` — ACTIVE / SUSPENDED / DELETION_PENDING operational state;
- `private.platform_admins` — trusted platform-admin membership;
- `private.platform_admin_audit_log` — append-only bootstrap/grant/revoke history.

The private schema is explicitly revoked from `anon` and `authenticated`. Browser code never reads or writes these tables directly.

A profile-insert trigger creates an ACTIVE account-state row for every new profile. Existing profiles are backfilled during the migration.

## Browser/API surface

Only these Phase 15.1 public RPCs are browser-reachable:

- `get_my_platform_access()` — returns the caller's operational status and whether they are currently an active platform admin;
- `grant_platform_admin(target, reason)` — callable by authenticated users but succeeds only for an ACTIVE platform admin;
- `revoke_platform_admin(target, reason)` — same guarded boundary and refuses to remove the final active platform admin.

`private.bootstrap_platform_admin(...)` is intentionally **not executable by browser roles**. It is a one-time SQL Editor/server-operator action.

All security-definer functions use an empty `search_path` and fully-qualified object names. EXECUTE privileges are revoked from PUBLIC/anon before the minimum authenticated grants are added to the public RPC surface.

## Final-admin safety

The migration protects the administrative control plane at multiple layers:

- grant/revoke operations serialize platform-admin membership changes;
- revoke refuses to leave zero ACTIVE platform admins;
- account-state transitions refuse to suspend the final ACTIVE platform admin;
- profile deletion refuses to delete a profile while platform-admin membership still exists;
- therefore the final platform admin cannot be removed through a later ordinary account-deletion path unless another active admin exists first.

Phase 15.3 will reuse these invariants when audited suspend/restore/delete operations are added.

## Audit contract

Successful bootstrap, grant, and revoke operations append:

- actor user ID (null only for the operator bootstrap);
- target user ID;
- action;
- required reason;
- relevant before state;
- relevant after state;
- timestamp.

Audit actor/target UUIDs intentionally do not use profile foreign keys so historical audit identity can survive future profile deletion. UPDATE and DELETE are rejected by a trigger, and browser roles receive no direct table privileges.

## Apply order

Run the migration first:

```text
supabase/migrations/20260822000300_platform_admin_authorization_audit.sql
```

Then run the pgTAP suite:

```text
supabase/tests/028_platform_admin_authorization_audit.test.sql
```

Expected plan:

```text
1..38
```

The test transaction rolls back its fixture users/admin state.

## Bootstrap the first platform administrator

After the migration and pgTAP test are green, identify the intended account in the SQL Editor:

```sql
select id, username, display_name, created_at
from public.profiles
order by created_at;
```

Then run exactly once, substituting the chosen UUID:

```sql
select private.bootstrap_platform_admin(
  '<USER_UUID>'::uuid,
  'Initial trusted platform administrator'
);
```

Verify:

```sql
select
  pa.user_id,
  p.username,
  p.display_name,
  pas.status,
  pa.granted_at,
  pa.grant_reason
from private.platform_admins pa
join private.platform_account_state pas on pas.user_id = pa.user_id
join public.profiles p on p.id = pa.user_id;

select action, actor_user_id, target_user_id, reason, occurred_at
from private.platform_admin_audit_log
order by id;
```

Do not put an administrator UUID, service-role key, database password, or other infrastructure secret in the React code or environment files.

## Bundle/chunking gate included in v0.13.0

The previous production build emitted an approximately 590 kB minified main JavaScript chunk. Phase 15.1 also closes that release-quality issue:

- `ProductController` dynamically imports section-level feature modules using `React.lazy`;
- only the active authenticated section is loaded initially;
- Vite 8 uses `build.rolldownOptions.output.codeSplitting` to keep React and Supabase vendor code in stable chunks;
- `scripts/check-bundle-size.cjs` enforces a 500 kB maximum emitted JavaScript chunk;
- the Vite build emits `asset-manifest.json` containing every generated `/assets/` file;
- the service worker precaches that manifest and every emitted app asset so an unvisited lazy feature chunk is still available to an installed PWA offline;
- the Chromium PWA E2E gate verifies every emitted manifest asset is present in the active shell cache before the network is disabled;
- the bundle budget runs as part of `npm run build`, so future regressions fail the normal release gate instead of remaining warnings.

This is a loading/performance change only. It does not alter scoring, persistence, navigation semantics, or feature permissions.

## Full local gate

```powershell
npm install
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:e2e
npm run test:internal
```

Also run the Supabase Security Advisor after applying the migration. Security-definer RPCs intentionally executable by `authenticated` may be reported as informational; review the exact finding against the internal `auth.uid()` and ACTIVE-platform-admin checks rather than suppressing it blindly.

## Non-goals

- no capacity dashboard yet;
- no Netlify/Supabase Management API tokens;
- no user directory UI;
- no suspension/restore/delete RPCs yet;
- no admin messaging yet;
- no global suspension enforcement across every existing product RPC yet (that is completed in Phase 15.3/15.5);
- no XP/scoring/progression changes.
