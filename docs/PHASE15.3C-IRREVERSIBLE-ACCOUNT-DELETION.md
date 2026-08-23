# Phase 15.3C — Irreversible Account Deletion

Status: **DONE in patch; hosted migration, pgTAP, Edge Function, advisors, and the full project gate are required before commit/tag.**

## Boundary

This non-visual security slice implements one irreversible deletion engine for both:

- an ACTIVE platform administrator deleting another non-admin account after the existing first-step request; and
- an ordinary ACTIVE user requesting and confirming deletion of their own account.

It adds no user-management UI and no Settings deletion control. Phase 15.3D still owns the administrator visual gate. The ordinary-user control belongs in the later Phase 15.6 Profile/Settings visual slice and must call the service contract added here.

## Two deliberate confirmations

Deletion never begins from one client-side click.

1. The first request changes the account from `ACTIVE` or `SUSPENDED` to `DELETION_PENDING` and records an append-only `ACCOUNT_DELETION_REQUESTED` audit event.
2. The server derives the exact second-confirmation phrase as `DELETE <username>`.
3. The Edge Function validates the caller token and sends the represented actor, target, mode, and exact phrase to a service-role-only preparation RPC.
4. PostgreSQL re-checks every destructive precondition and appends `ACCOUNT_DELETION_CONFIRMED` only once.

The confirmation phrase is not authorization by itself. Administrator mode independently requires a currently ACTIVE platform administrator who is not the target. Self mode forces actor and target to be the authenticated caller and requires that caller to have requested the pending deletion.

## Deletion preconditions

Both modes fail closed unless:

- the target still exists and remains `DELETION_PENDING`;
- the exact server-derived confirmation matches;
- the target is no longer a platform administrator;
- the target owns no group; ownership must be transferred first;
- the represented actor and deletion mode match any retry already in progress.

The platform-admin restriction preserves the existing final-admin protection. Group ownership is never silently reassigned and groups are never deleted as a side effect of account removal.

## Storage, Auth, and database ordering

`private.platform_account_deletion_jobs` retains UUID-only coordination state, a monotonic revision, mode, lifecycle timestamps, and a stable failure code. It stores no username, email, bearer token, Storage object metadata, or provider error body.

The Edge Function performs this order:

1. prepare or retry the exact deletion revision;
2. list every object under `profile-pictures/<target-user-id>` through the Supabase Storage API;
3. remove objects through Storage API batches of at most 1,000;
4. mark that exact revision `STORAGE_CLEARED`;
5. call `auth.admin.deleteUser(targetUserId, false)` for a hard Auth deletion.

Storage tables are never mutated with SQL. If Storage or Auth deletion fails, the private job records only a stable error code and the operation is retryable. A retry after completed Storage cleanup skips duplicate cleanup and proceeds to Auth deletion.

## Direct-delete protection and atomic completion

A `BEFORE DELETE` trigger on `auth.users` permits deletion of an application user only when a matching job is `STORAGE_CLEARED` and all destructive preconditions still hold. It advances the job to `AUTH_DELETE_STARTED` inside the Auth deletion transaction.

A `BEFORE DELETE` trigger on `public.profiles` then requires that Auth-started state. Direct profile deletion is rejected even when Storage cleanup happened. During the Auth cascade, the trigger:

- advances the retained job to `COMPLETED`;
- appends `ACCOUNT_DELETED` with stable actor/target UUIDs;
- then permits the profile cascade.

If any trigger or foreign-key cascade fails, the Auth deletion transaction rolls back. Manual deletion of an application-backed Auth user without the prepared job is intentionally blocked.

## Data-retention and product effects

The existing foreign keys define the deletion result:

- the Auth user and public profile are hard-deleted;
- workouts, exercises/sets through workouts, scoring events, progression/benchmark state, weekly state/goals, badges, mutation receipts, group memberships/invites/reactions, and other profile-owned product rows cascade away;
- groups survive and require ownership transfer before deletion;
- leaderboard and social reads no longer find the deleted profile or membership;
- `private.platform_account_state` and Auth coordination rows cascade away with the profile;
- `private.platform_admin_audit_log` and `private.platform_account_deletion_jobs` survive with UUID-only operational history.

The application does not claim anonymous retention of historical scoring. Authoritative user-linked scoring is deleted with the account, matching the existing `ON DELETE CASCADE` contract.

An already-issued JWT may remain cryptographically valid until expiry, but `DELETION_PENDING` blocks product Data API/Storage access before deletion and no account state/profile remains after hard deletion.

## Self-service cancellation

The first self-service request may be cancelled before the exact second confirmation. Because `DELETION_PENDING` is blocked by the Data API pre-request hook, cancellation is coordinated through the JWT-verified Edge Function and a service-only RPC.

Once the irreversible confirmation job exists, neither an administrator nor the user can cancel. The safe operation is to retry the incomplete deletion.

## Validation

Hosted order, without Docker:

1. apply `supabase/migrations/20260822172823_platform_account_irreversible_deletion.sql`;
2. run `supabase/tests/032_platform_account_irreversible_deletion.test.sql` and require 68/68;
3. re-run canonical pgTAP 030 and 031 for lifecycle/session regression coverage;
4. deploy `supabase/functions/platform-account-auth/index.ts` with JWT verification enabled;
5. run Supabase security and performance advisors;
6. run the six-command local application gate documented in `docs/CI-VALIDATION.md`.

The pgTAP suite is rollback-safe and creates only transaction-scoped test users. Validation must never invoke the deletion Edge action against a real hosted user.

## Explicit non-goals

- no administrator account UI before Phase 15.3D visual approval;
- no ordinary-user Settings control before the Phase 15.6 visual slice;
- no data export feature;
- no soft-deletion or recovery claim after exact confirmation;
- no silent group transfer or group deletion;
- no direct SQL deletion from Storage tables;
- no Docker or local Supabase stack.
