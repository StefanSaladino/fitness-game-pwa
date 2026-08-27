# Phase 15.2E — Capacity Dashboard

Status: **IMPLEMENTED AFTER APPROVED VISUAL GATE**

## Purpose

Phase 15.2E turns the Phase 15.2 capacity contracts into the first real platform-administration surface. It is an operational tool, not a billing dashboard and not a generic admin template.

The implementation follows `docs/UI-ANTI-AI-LAYOUT-RULES.md`.

## Real routes

- `/settings` — ordinary authenticated Profile/Settings surface after onboarding; does not require fitness-group membership.
- `/platform-admin` — authorized admin root; canonicalizes to `/platform-admin/capacity` only after ACTIVE platform-admin authorization.
- `/platform-admin/capacity` — real capacity dashboard.

Authenticated users who are not ACTIVE platform administrators are replace-redirected to `/` with no admin-specific denial state. Arbitrary authenticated unknown routes use the same ordinary-home fallback.

Unauthenticated callers see the normal sign-in experience and no administrator shell.

## Settings discovery

The existing Product `Profile` navigation destination now opens `/settings`.

Settings renders real profile information already persisted by onboarding:

- display name;
- username;
- time zone;
- weekly lifting target.

The Administration section and `Platform administration` action are rendered only when `public.get_my_platform_access()` resolves to:

```text
account_status = ACTIVE
is_platform_admin = true
```

While the access check is loading, unavailable, errored, suspended, or negative, Settings remains usable and no Administration heading, placeholder, disabled row, reserved gap, or explanatory admin copy appears.

## Admin authorization

`PlatformAdminRoute` is evaluated before `ProfileGate`, onboarding/group routing, and `GroupGate`.

The React guard is UX defense only. The capacity RPCs remain independently protected by `private.require_active_platform_admin()` in PostgreSQL, and each provider Edge Function re-checks the caller through the server-backed platform-access RPC.

## Capacity data shown

### Database-local project telemetry

The dashboard reads `public.get_platform_capacity_current()` and shows only returned measurements:

- `database_bytes`;
- `storage_bytes`;
- `storage_objects`;
- `postgres_connections`;
- `auth_users_total`;
- `auth_users_30d`.

The local Auth counts remain operational signals and are never labeled as Supabase billable MAU.

A utilization bar/percentage is rendered only when a positive trustworthy limit exists. Postgres connections can therefore use live `max_connections`; metrics without allowances are explicitly **Unconfigured** and receive no fake progress visualization.

### Snapshot history

`public.get_platform_capacity_history(30)` provides bounded append-only history.

States:

- 0 snapshots — `No snapshots yet`; no chart or fabricated trend;
- 1 snapshot — explain that another comparable sample is required;
- 2+ snapshots — show recent real snapshot rows and a database growth-per-day statement only when the latest comparable samples produce positive growth.

`Record snapshot` calls `public.capture_platform_capacity_snapshot()` and reloads the dashboard.

Snapshots are manual in this slice. No automatic hourly schedule or "next snapshot" time is displayed because no scheduler exists.

### Supabase project telemetry and provider boundary

The Overview always reads real project telemetry through `public.get_platform_capacity_current()` and labels that successful guarded RPC connection as **Supabase connected**. This does not imply that a separate provider billing feed is available.

The dashboard invokes the Phase 15.2C adapter through `platform-capacity-supabase`.

Until the documented billing-cycle source exists, provider billing metrics remain `UNAVAILABLE`/null. The UI says **Management usage unavailable** and does not report zero usage, a plan allowance, or reconstructed MAU/egress.

Scope: **ORGANIZATION**.

### Netlify provider

The browser does not invoke the Phase 15.2D adapter by default. The UI reports **Setup deferred** and the client returns fail-closed unavailable metrics. After the server-side function and credentials are configured, an operator may set `VITE_NETLIFY_CAPACITY_ENABLED=true` to allow the authenticated browser to invoke `platform-capacity-netlify`.

Until Netlify exposes a supported authoritative account-usage feed for the reserved metrics, those values remain `UNAVAILABLE`/null. The UI does not derive bandwidth/requests/build credits from logs or deploy timing.

Scope: **ACCOUNT**.

## Real actions

- `Refresh` — reload current local telemetry, history, and provider adapter results.
- `Record snapshot` — append one database-local snapshot using the guarded RPC and reload.
- `Back to app` — navigate to ordinary authenticated home.

No Export, View details, quota editor, provider settings, auto-refresh schedule, or other admin actions are added in this phase.

## Responsive hierarchy

### Phone

- compact sticky header with Back and Overview;
- title/context;
- two touch-sized actions;
- one-column telemetry rows;
- snapshot history beneath telemetry;
- provider billing-feed rows last;
- no desktop sidebar and no product bottom navigation inside the admin console.

### Desktop

- narrow admin rail containing only real destinations: Overview and Back to app;
- content max-width for readable operational scanning;
- telemetry becomes a two-column row grid inside one section, not a wall of individual cards;
- history and providers remain separate functional sections.

## Styling constraints

The admin module intentionally uses:

- solid surfaces;
- restrained borders;
- compact 10px control radii;
- no gradients;
- no glow;
- no decorative box-shadow system;
- no card wall;
- text labels for every state;
- color only as supporting state information.

## Component boundaries

```text
App / path routing
    |
    +-- /settings
    |      SettingsScreen
    |      usePlatformAccess
    |
    +-- /platform-admin/*
           PlatformAdminRoute
           usePlatformAccess
                |
                +-- authorized -> CapacityDashboardController
                                    useCapacityDashboard
                                         |
                                         +-- CapacityDashboardService
                                             - database RPCs
                                             - Supabase provider adapter
                                             - Netlify provider adapter
```

Presentation components receive view data/actions. Direct Supabase calls stay in service layers.

## Direct-route hosting

`public/_redirects` adds the Netlify SPA fallback `/* /index.html 200` so direct loads of `/settings` and `/platform-admin/capacity` reach the React routing boundary instead of returning a static-host 404. Authorization still occurs in the application and database/server boundaries.

## Database changes

None. Phase 15.2E consumes the already-applied Phase 15.1/15.2B authorization and telemetry RPCs.

## Provider deployment note

The capacity page safely works if provider Edge Functions are absent or unconfigured: provider adapters fail closed to unavailable values. Provider secrets remain server-side and are not required for local UI compilation.

## Explicit non-goals

- no new provider billing reconstruction;
- no database migration;
- no platform-admin bootstrap;
- no capacity allowance editor;
- no general user-administration UI;
- no moderation/messaging UI;
- no notification Settings implementation;
- no scoring, XP, badge-award, ranking, workout, or group behavior changes.
