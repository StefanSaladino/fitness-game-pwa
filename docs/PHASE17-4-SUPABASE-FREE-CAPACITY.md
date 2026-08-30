# Phase 17.4 — Supabase Free-plan capacity

Status: **IMPLEMENTED, LOCAL VALIDATION REQUIRED**

Official Supabase limits were re-verified on 2026-08-29 before implementation.

## Server-owned allowances

| Metric | Free allowance | Scope |
| --- | ---: | --- |
| Database size | 500 MB | Project |
| Monthly active users | 50,000 | Organization |
| Storage | 1 GB | Organization |
| Uncached egress | 5 GB | Organization |
| Cached egress | 5 GB | Organization |
| Edge Function invocations | 500,000 | Organization |
| Realtime messages | 2,000,000 | Organization |
| Realtime peak connections | 200 | Organization |

The values are stored in `private.platform_capacity_allowances`; they are not frontend constants.

The existing project-local Storage measurement remains separate from the organization Storage billing allowance. Supabase bills Storage using average GB-hours over the billing cycle, so an instantaneous project-local byte count is not presented as organization billing utilization.

## Usage policy

If an authoritative provider billing-cycle numerator is unavailable, Top Set shows:

- the verified server-owned allowance,
- `Unavailable` for current usage,
- no utilization percentage,
- no fabricated zero.

The Supabase provider continues to verify the configured Management organization/entitlements boundary, but does not reconstruct billing usage from local auth, traffic, Storage, or Realtime activity.

## Deployment gate

Phase 17.4 implementation does not itself deploy the migration or Edge Function. After local validation:

1. apply the reviewed migration to hosted Supabase,
2. deploy `platform-capacity-supabase`,
3. run hosted pgTAP,
4. verify the eight allowance rows,
5. inspect Security and Performance advisors,
6. manually verify Platform Overview using an active platform-admin account.
