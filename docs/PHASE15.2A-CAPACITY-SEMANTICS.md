# Phase 15.2A — Capacity semantics + provider contract

## Objective

Define the operational capacity model before adding provider credentials, persistence, or administrator UI. This slice makes warning levels, source identity, unavailable states, and growth projections deterministic and testable.

## Why this slice is separate

The Phase 15.2 dashboard needs two fundamentally different kinds of information:

1. **database-local operational measurements** that PostgreSQL can measure directly, such as database size, connection count, Storage object metadata, and recent sign-in counts; and
2. **provider-authoritative billing/quota measurements** such as Supabase billable MAU, monthly egress, Realtime quota, and Netlify usage/credits.

Those are not interchangeable. A local 30-day sign-in count must never be relabeled as Supabase billable MAU, and a missing provider metric must never be rendered as zero usage.

## Capacity status contract

The default planning bands remain:

- below 60%: `NORMAL`;
- 60% through 74.99%: `WATCH`;
- 75% through 84.99%: `WARNING`;
- 85% through 99.99%: `CRITICAL`;
- 100% or above: `EXCEEDED`.

Two additional states prevent misleading dashboards:

- `UNCONFIGURED`: the measurement is available but no trustworthy allowance/limit has been configured;
- `UNAVAILABLE`: the measurement source did not return a usable value.

Thresholds must be finite, strictly increasing percentages between 0 and 100.

## Growth contract

Growth estimates use two comparable samples only when metric code, source, and unit match and elapsed time is positive. Flat/shrinking series, unavailable values, reversed timestamps, and mismatched metrics produce no projection. A time-to-limit estimate is shown only when growth is positive and a trustworthy limit exists.

## Provider boundary

`CapacityTelemetryProvider` is deliberately provider-neutral. Planned adapters are:

- `DATABASE_LOCAL` — database-local operational telemetry;
- `SUPABASE_MANAGEMENT` — provider-authoritative Supabase quota/billing telemetry through a secure server-side boundary;
- `NETLIFY_API` — Netlify usage telemetry through a secure server-side boundary.

No provider management token, Supabase service-role/secret key, or Netlify access token belongs in Vite/browser code.

## Planning baseline observed on the hosted project

During Phase 15.2 planning on August 22, 2026, a read-only hosted query reported approximately:

- PostgreSQL database size: 16.6 MB;
- current PostgreSQL connections: 10 of a configured maximum of 60;
- Storage objects: 0;
- Storage bytes represented by object metadata: 0;
- auth users: 1;
- users with a sign-in in the previous 30 days: 1.

These values are a point-in-time operational baseline only. They are **not hard-coded product limits** and the recent-sign-in count is **not** treated as Supabase billable MAU.

## Non-goals

Phase 15.2A does not:

- add a database migration or snapshot table;
- call the Supabase Management API or Netlify API;
- store infrastructure credentials;
- build the administrator dashboard UI;
- change scoring, XP, badge awards, rankings, workouts, or user-visible product behavior.

## Locked administrator route + authorization contract

Before Phase 15.2B implementation, the administrator routing model is locked in `docs/PHASE15.2-ADMIN-ROUTE-AUTHORIZATION.md`: `/platform-admin` is the private admin shell, `/platform-admin/capacity` is the capacity route, the admin branch resolves before ordinary onboarding/group gating, `PlatformAdminGate` checks `public.get_my_platform_access()`, and every protected capacity RPC independently enforces `private.require_active_platform_admin()`. Client-side route checks are never the authoritative security boundary.

## Next slice

Phase 15.2B will add platform-admin-only database-local telemetry and historical snapshot persistence under that locked route/security contract. The administrator dashboard remains behind the product-wide UI design gate.
