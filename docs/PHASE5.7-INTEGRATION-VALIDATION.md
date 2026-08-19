# Phase 5.7 — Integration Validation

Phase 5.7 is a reliability gate before workout capture begins. It adds no scoring rules, database schema, or product styling.

## Validated journeys

- completed onboarding advances into persisted group membership gating;
- zero memberships exposes create/join setup;
- creating a group refreshes persisted memberships before the dashboard appears;
- joining from a full invite URL refreshes persisted memberships before the dashboard appears;
- the dashboard and group administration controllers can share injected service instances in tests while defaulting to Supabase in production;
- owner controls can create invites and promote a member;
- ordinary members do not receive invite-management controls and can leave a group;
- dashboard reads remain scoped to the selected group and current user.

## Test boundary

`tests/integration/group-product-journey.test.tsx` exercises real React controllers, hooks, forms, navigation, loading transitions, and permission-driven presentation together. It uses stateful in-memory implementations of the existing service interfaces so the test does not require a developer's hosted Supabase project or privileged credentials.

Database authorization remains covered separately by pgTAP and RLS/RPC tests. Integration tests must not replace database permission tests.

## Production impact

The only production refactor is dependency injection at the Product/Dashboard controller boundary. When no service is supplied, the existing Supabase-backed service is created exactly as before.
