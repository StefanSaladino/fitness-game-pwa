# Phase 15.2B — Database-local telemetry + historical snapshots

## Purpose

Phase 15.2B establishes the non-visual PostgreSQL persistence and authorization boundary for platform-capacity monitoring. It does not create the administrator dashboard, route components, or provider-management integrations.

All capacity data in this slice is operational only. It does not affect scoring, XP, qualification, badges, rankings, workouts, groups, or ordinary-user visibility.

## Authorization boundary

The private operational data remains in the non-exposed `private` schema. Browser roles receive no direct table or private-helper access.

Every browser-reachable capacity RPC independently calls:

```sql
private.require_active_platform_admin()
```

The future `PlatformAdminGate` remains a UX/navigation guard only. It does not replace the database authorization boundary.

The public RPCs are executable only by the authenticated role, then perform the active-platform-admin check internally:

- `public.get_platform_capacity_current()`
- `public.capture_platform_capacity_snapshot()`
- `public.get_platform_capacity_history(integer)`

Ordinary users, group OWNERs, group ADMINs, suspended platform administrators, and unauthenticated callers cannot read or capture platform-capacity telemetry.

## Private persistence

### `private.platform_capacity_allowances`

Stores trusted operational/provider allowance values by telemetry source and metric code. Allowances are not hard-coded into the browser.

No real allowance is inserted by the Phase 15.2B migration. If no trusted allowance exists for a metric, the returned limit stays `null`; the Phase 15.2A capacity model therefore treats the metric as `UNCONFIGURED` rather than inventing a quota.

### `private.platform_capacity_snapshots`

Stores append-only snapshot headers:

- source;
- captured timestamp;
- platform administrator who captured the snapshot.

### `private.platform_capacity_snapshot_metrics`

Stores normalized metric measurements associated with each snapshot. The stored `limit_value` is frozen with the measurement so historical utilization can be interpreted using the allowance that applied at capture time.

Snapshot headers and metric rows reject UPDATE and DELETE operations through the shared immutable-history trigger boundary.

## Database-local measurements

`private.read_database_local_capacity_metrics()` produces six measurements.

| Metric | Unit | Meaning |
| --- | --- | --- |
| `database_bytes` | bytes | Actual PostgreSQL database size from `pg_database_size(current_database())`. This is not provider disk/WAL usage. |
| `storage_bytes` | bytes | Aggregate object bytes derived from trusted `storage.objects` metadata. |
| `storage_objects` | count | Current Storage object count. |
| `postgres_connections` | count | Current PostgreSQL connections for the project database. Its limit comes from live `max_connections`, not a client constant. |
| `auth_users_total` | count | Local Auth user count. This is an operational count, not a provider billing metric. |
| `auth_users_30d` | count | Users whose `last_sign_in_at` is within 30 days. This is explicitly **not Supabase billable monthly active users**. |

Provider-authoritative MAU, egress, Realtime usage, billing windows, and other Supabase quota data remain Phase 15.2C work.

## Snapshot API

### Current telemetry

`public.get_platform_capacity_current()` returns the six current `DATABASE_LOCAL` measurements plus any trusted configured local allowance.

### Capture

`public.capture_platform_capacity_snapshot()` captures one immutable snapshot containing all six current database-local measurements.

This slice does not schedule automatic captures. A later trusted server-side operational flow can decide cadence without exposing credentials or creating browser-owned automation.

### History

`public.get_platform_capacity_history(p_snapshot_limit integer default 30)` returns normalized rows for the newest requested snapshots.

`p_snapshot_limit` is deliberately bounded to `1..365`.

## Hosted validation

The hosted Supabase migration is recorded as:

```text
20260822040727_platform_capacity_local_telemetry
```

The canonical pgTAP suite is:

```text
supabase/tests/029_platform_capacity_local_telemetry.test.sql
```

It contains 42 rollback-safe assertions covering schema, grants, private-data denial, current telemetry, allowance merging, append-only snapshots, bounded history, group OWNER/ADMIN denial, suspended-admin denial, and unauthenticated denial.

The hosted test transaction rolled back completely. After validation there were:

```text
capacity allowances:  0
capacity snapshots:   0
snapshot metric rows: 0
platform admins:      0
```

No real administrator was bootstrapped and no production capacity history or allowance was seeded by this phase.

## Advisor notes

The Security Advisor reports `rls_enabled_no_policy` INFO notices for the three new private tables. This is intentional: the `private` schema and tables are not exposed to browser roles and access is mediated by guarded RPCs.

It also reports authenticated SECURITY DEFINER warnings for the three public capacity RPCs. Their authenticated EXECUTE grants are intentional because each function immediately re-authorizes through `private.require_active_platform_admin()`.

The Performance Advisor currently reports the new `(source, captured_at desc)` history index as unused. That is expected before production snapshots/history reads exist and is not a reason to remove the index before the dashboard/provider slices begin using it.

## Next slice

Phase 15.2C adds provider-authoritative Supabase quota telemetry behind a secure server/Edge boundary. Supabase management credentials, service-role keys, and equivalent secrets must never enter Vite/browser code.
