# Phase 15.3A — User Account Administration Foundation

Status: **DONE in patch; requires migration + pgTAP validation before commit/tag.**

## Boundary

This slice is deliberately non-visual. It establishes the database and browser-safe service contract that the later user-management screen will consume.

It does **not** add a Users item to the admin rail yet because the product-wide UI gate requires phone-first and desktop concepts before a substantial new administrator screen is implemented.

## Existing foundation reused

Phase 15.1 already owns:

- `public.platform_account_status` with `ACTIVE`, `SUSPENDED`, and `DELETION_PENDING`;
- `private.platform_account_state`;
- `private.platform_admins`;
- append-only `private.platform_admin_audit_log`;
- `private.require_active_platform_admin()`;
- final-active-platform-admin protection.

15.3A extends those objects rather than creating a second moderation/authorization model.

## Searchable account directory

`public.list_platform_accounts(...)` is platform-admin-only and supports:

- optional username/display-name/exact-UUID search;
- optional account-status filter;
- bounded 1-based pagination;
- stable user ID;
- username;
- display name;
- account status;
- Auth account creation time;
- last sign-in timestamp as limited operational metadata;
- platform-admin flag;
- suspension review date;
- deletion-request timestamp;
- total matching count.

It intentionally does **not** return email addresses, password material, identities, raw Auth metadata, access/refresh tokens, provider tokens, or secret fields.

`public.get_platform_account_detail(uuid)` returns the same minimal identity plus status reason/update metadata needed for a future deliberate admin action flow.

## Suspension lifecycle

`public.suspend_platform_account(...)`:

- requires an ACTIVE platform administrator at the database boundary;
- requires a 3–500 character reason;
- supports an optional future review date;
- prevents self-suspension;
- transitions only ACTIVE -> SUSPENDED;
- uses the existing final-active-admin trigger when the target is a platform administrator;
- appends `ACCOUNT_SUSPENDED` to the immutable audit log.

`public.restore_platform_account(...)`:

- transitions only SUSPENDED -> ACTIVE;
- requires an audit reason;
- clears the current suspension reason/review metadata from live account state;
- preserves the history in the immutable audit log.

## Two-step deletion foundation

`public.request_platform_account_deletion(...)` is only the **first** destructive step.

It:

- prevents self-deletion requests;
- refuses any target that is still a platform administrator;
- moves ACTIVE or SUSPENDED accounts to `DELETION_PENDING`;
- stores the prior live status/reason/review date so cancellation is lossless;
- records who requested deletion and when;
- appends `ACCOUNT_DELETION_REQUESTED`.

`public.cancel_platform_account_deletion(...)` reverses the pending request and restores the exact prior ACTIVE/SUSPENDED state. It appends `ACCOUNT_DELETION_CANCELLED`.

15.3A intentionally does **not** physically delete the Auth user or profile. Irreversible deletion needs its own server-side confirmation slice so Storage ownership, foreign-key behavior, audit retention, and Auth Admin deletion are reviewed before data is destroyed.

## Suspension enforcement contract

`private.require_active_account()` is added as the reusable ordinary-account guard:

- no authenticated user -> `Authentication required`;
- missing platform state -> `Account state not found`;
- SUSPENDED/DELETION_PENDING -> `Account is not active`;
- ACTIVE -> returns the authenticated UUID.

This slice does **not** pretend that merely defining the helper enforces every historical RPC. Phase 15.3B will apply the account-state gate across authenticated application RPC boundaries and coordinate server-side Supabase Auth ban/session behavior.

Supabase documents that temporary bans block sign-in but do not revoke already-issued sessions/access tokens. Existing access tokens remain valid until expiry unless sensitive operations also validate session state. Therefore 15.3B must not claim that `ban_duration` alone provides immediate revocation.

## Browser/service separation

`src/features/admin/accounts/platformAccountAdminService.ts` talks only to the guarded public RPCs.

No secret/service-role key, Auth Admin API, password hash, token, or raw Auth schema access exists in browser code.

## Database validation

Run in Supabase Dashboard SQL Editor after the migration:

1. `supabase/migrations/20260822120300_platform_account_administration_foundation.sql`
2. `supabase/tests/030_platform_account_administration_foundation.test.sql`

The pgTAP script is rollback-safe.

## Explicit non-goals

- no user-management UI yet;
- no admin-rail Users destination yet;
- no Auth secret/service-role key in browser code;
- no irreversible Auth user deletion;
- no claim that suspension already covers every historical application RPC;
- no scoring, XP, badge, workout, ranking, group, or progression changes.
