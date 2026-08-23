# Phase 15.5 — Administration integration and security gate

Phase 15.5 closes the administration build-out with a deny-by-default database function boundary and cross-surface integration coverage. It does not add a new administrator role, change scoring, and does not require Docker.

## Function authorization hardening

The `public` schema is the Data API surface. New functions created by the `postgres` migration owner no longer inherit `EXECUTE` for `PUBLIC`, `anon`, or `authenticated`. Each browser RPC must receive a deliberate grant in the migration that owns it.

The migration also:

- revokes anonymous execution from every existing public function;
- revokes direct browser execution from every public trigger function;
- preserves explicit authenticated grants for user and guarded administrator RPCs;
- preserves explicit trusted `service_role` execution for Auth/Storage coordination while keeping the obsolete direct suspension/restore RPCs sealed;
- keeps every private operational table and helper outside direct browser access.

This is defense in depth around the existing runtime checks. Administrator RPCs still call `private.require_active_platform_admin()`, ordinary account RPCs retain their active-account checks, and the PostgREST pre-request hook rejects a suspended account before dashboard, workout, cardio, group, progress, social, reporting, messaging, or administration RPC dispatch.

## Integrated behavior proved

- An unauthorized deep link into `/platform-admin/messages`, including a preselected target query, redirects to the ordinary app without constructing the privileged controller or issuing its data request.
- Group ownership remains separate from platform-administrator authorization.
- A suspended platform administrator loses active administrator access and is rejected by both guarded administrator RPCs and the global request hook.
- A full-app send still requires server preview and exact confirmation, remains `NOTICE`-only, and reaches users as a dismiss-once “What’s new” popup.
- Existing Phase 15 suites remain authoritative for irreversible account deletion, Storage cleanup coordination, audit retention, reporter confidentiality, purpose-bounded activity review, capacity fallback, responsive administrator presentation, and explicit destructive confirmations.

## Validation

`supabase/tests/036_admin_integration_security_gate.test.sql` is rollback-safe and validates default ACLs, existing function grants, pinned `SECURITY DEFINER` functions, trigger isolation, ordinary-user and group-owner denial, suspension enforcement, and active administrator continuity.

`tests/integration/platform-admin-security-journey.test.tsx` proves the client deep-link boundary and the confirmed broadcast-to-popup journey across the real administrator composer and user message center.

The complete non-Docker release gate is:

```text
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:internal
npm run db:test:ci
```
