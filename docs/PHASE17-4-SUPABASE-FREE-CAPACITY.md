# Phase 17.4 — Measurable Supabase Free capacity

Status: **CORRECTED, LOCAL VALIDATION REQUIRED**

The Capacity dashboard follows one rule:

> If Top Set cannot measure a value authoritatively, it is not presented as a telemetry card.

## Dashboard

Exactly three live project signals are shown:

- **Database size** — measured with `pg_database_size`, compared with the verified Supabase Free 500 MB per-project quota.
- **Postgres connections** — live connection count compared with the project's own `max_connections` setting.
- **Project Storage** — project object bytes from trusted Storage metadata. No utilization percentage is shown because the Free 1 GB Storage allowance is organization-wide.

Removed from the dashboard: Storage object count, total Auth users, rolling 30-day sign-ins, provider status, MAU, egress, Edge Function invocations, Realtime messages, Realtime peak connections, and any card whose durable state was only "usage unavailable".

## Network behavior

The Capacity page no longer calls Supabase or Netlify provider Edge Functions by default. It loads only the guarded database-local current/history RPCs.

The previously staged Phase 17.4 provider expansion is retracted to the Phase 17.3 baseline and must not be deployed.

## Hosted rollout

Phase 17.4 now requires only the corrected database migration that seeds the 500 MB `database_bytes` allowance.

After local validation:
1. apply the corrected migration,
2. verify live database size and connection capacity,
3. run hosted verification / pgTAP,
4. inspect Security and Performance advisors,
5. verify `/platform-admin/capacity` as a platform admin.

No production statistics reset is part of this phase.
