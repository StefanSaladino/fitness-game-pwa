# Phase 15.3B — Suspension Enforcement + Auth Session Coordination

Status: **DONE in patch; hosted migration, pgTAP, Edge Function, and full project gates are required before commit/tag.**

## Boundary

This is a non-visual security slice. It makes `private.platform_account_state` authoritative across authenticated product access and coordinates Supabase Auth ban/unban through a secured Edge Function.

It adds no user-management screen or navigation item. The Phase 15.3D visual gate still applies before UI work.

## Data API enforcement

The migrations install `api_hooks.enforce_active_account_request()` as PostgREST's `pgrst.db_pre_request` hook for the `authenticator` role. `api_hooks` is deliberately absent from the Data API exposed-schema list.

The hook is `SECURITY INVOKER` so its required anonymous execution privilege cannot become an anonymous privileged RPC. Only authenticated claims delegate to `api_hooks.is_current_account_session_active()`, a `SECURITY DEFINER` boolean helper that is not executable by `anon`, is not a public RPC, and exposes no Auth row data.

Every request whose JWT role is `authenticated` must have:

- a valid `auth.uid()`;
- an `ACTIVE` row in `private.platform_account_state`;
- a JWT `session_id` claim;
- a matching `auth.sessions` row for the same user;
- and no elapsed `auth.sessions.not_after` value.

This single boundary covers existing table/view access and public RPC calls served by the Supabase Data API. It avoids relying on every historical RPC author remembering to call a helper.

Anonymous and service-role requests retain their existing RLS/privilege boundaries. The service role is never accepted as proof of the represented administrator: the server-only transition RPCs also re-check that the actor UUID belongs to an `ACTIVE` platform administrator.

## Storage enforcement

PostgREST pre-request hooks do not cover the Storage or Realtime services.

The PWA currently has no Realtime subscription. Its only Storage mutation surface is the `profile-pictures` bucket, so all three authenticated own-folder policies now call `api_hooks.is_current_account_session_active()`.

The bucket remains public-read by design. Suspension blocks authenticated list/upload/delete behavior; it does not make already-public profile-picture URLs private.

## Auth Admin boundary

`platform-account-auth` is a JWT-verified Supabase Edge Function. It:

1. extracts the caller bearer token;
2. validates it with `auth.getUser(token)`;
3. re-checks `get_my_platform_access()` through the caller's own Data API session;
4. calls service-role-only preparation/completion RPCs;
5. calls `auth.admin.updateUserById(...)` with `ban_duration: '876000h'` for suspension or `ban_duration: 'none'` for restoration.

`SUPABASE_SERVICE_ROLE_KEY` is read only inside the hosted Edge Function runtime. It is never added to a `VITE_*` variable, browser module, response, or repository secret file.

The browser service invokes only `platform-account-auth` for suspend/restore. Direct authenticated execution of the historical state-only suspend/restore RPCs is revoked so a browser cannot bypass Auth coordination.

## Fail-closed transition ordering

The private `platform_auth_coordination` row stores a monotonic revision, represented actor, requested action/reason, desired ban state, completion time, and stable failure code.

Suspension ordering:

1. validate actor and target;
2. change database state to `SUSPENDED` and append the audit row;
3. record a new coordination revision;
4. request the Auth ban;
5. mark that exact revision complete.

If the Auth call fails, database state remains `SUSPENDED`, so normal product access is already blocked. A retry increments the revision and does not duplicate the lifecycle audit row.

Restoration ordering:

1. validate that the target remains `SUSPENDED`;
2. record a desired-unban revision without changing account state;
3. request Auth unban;
4. change database state to `ACTIVE` and append the restore audit only after Auth succeeds.

If Auth unban or completion fails, the account remains `SUSPENDED`. A stale completion cannot overwrite a newer revision.

## Session semantics

An Auth ban blocks later sign-in/refresh behavior but does **not** invalidate already-issued access JWTs. Phase 15.3B therefore does not claim `ban_duration` revokes sessions and does not directly mutate Supabase-managed `auth.sessions` rows.

Instead, every authenticated Data API/Storage mutation boundary checks both account state and the JWT's documented `session_id` against `auth.sessions`. Consequently:

- a suspended or deletion-pending user is rejected even while an old access JWT and session row still exist;
- a JWT whose session row was destroyed by sign-out is rejected immediately at the product boundary;
- an elapsed session `not_after` is rejected;
- restoration does not happen until Auth unban succeeds.

An access JWT can still be cryptographically valid until its `exp`; the application authorization boundary is what makes it unusable for product data during suspension.

## Validation

Hosted order:

1. apply `supabase/migrations/20260822161454_platform_account_suspension_enforcement.sql`;
2. run `supabase/tests/030_platform_account_administration_foundation.test.sql`;
3. run `supabase/tests/031_platform_account_suspension_enforcement.test.sql`;
4. deploy `supabase/functions/platform-account-auth/index.ts` with JWT verification enabled;
5. run security and performance advisors;
6. run all non-Docker repository/application/browser gates.

The 15.3B pgTAP suite is rollback-safe and covers privileges, Data API enforcement, live/missing/expired sessions, suspension/restore ordering, retries, stale revisions, deletion-pending enforcement, Storage policy integration, and non-deletion.

## Explicit non-goals

- no user-administration UI;
- no irreversible Auth user/profile deletion;
- no direct mutation of Supabase-managed Auth session rows;
- no claim that an Auth ban revokes issued JWTs;
- no Realtime policy work because the PWA has no Realtime subscription;
- no scoring, XP, badge, workout, ranking, group, or progression behavior changes;
- no Docker or local Supabase stack.
