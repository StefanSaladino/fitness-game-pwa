# Phase 15.2C — Supabase Provider Quota Adapter

Status: **PARTIAL — secure provider boundary delivered; billing-cycle usage feed blocked on a documented Supabase provider API/export.**

## Purpose

Phase 15.2C connects the provider-neutral capacity model to Supabase Cloud without ever placing Supabase Management credentials in the PWA. The implementation must prefer an explicit unavailable state over reconstructed, scraped, stale, or guessed billing data.

## Billing scope

Supabase billing is organization-scoped. Subscription plan, billing cycle, and included usage quotas belong to the organization and usage is aggregated across its projects. Therefore Supabase billing metrics use `scope = ORGANIZATION` and must not be presented as project-only quota consumption.

Database-local metrics from Phase 15.2B remain separate operational signals.

## Secure request path

```text
Authenticated PWA
    | caller Supabase JWT
    v
platform-capacity-supabase Edge Function
    | public.get_my_platform_access()
    | require ACTIVE + is_platform_admin = true
    v
Supabase Management API
    | SUPABASE_MANAGEMENT_ACCESS_TOKEN (server secret only)
    | SUPABASE_ORGANIZATION_SLUG (server configuration)
    v
Sanitized provider capability envelope
```

The Edge Function does not use a management token to authenticate the browser caller. It first re-authorizes the caller using the existing server-backed platform-access RPC. Unauthorized authenticated callers receive a generic HTTP 404 / `Not found`, preserving the locked admin-route non-disclosure policy.

`verify_jwt = true` is explicitly configured because this function is client-invoked with a real Supabase user session JWT. The Edge code resolves the current publishable-key environment mapping with the documented `SUPABASE_PUBLISHABLE_KEYS` shape and retains the legacy anon-key fallback during Supabase's key transition.

## Server-side secrets

Required when the provider capability check is enabled:

- `SUPABASE_MANAGEMENT_ACCESS_TOKEN`
- `SUPABASE_ORGANIZATION_SLUG`

The management access token is a Supabase account/Management API credential. It must be stored only as an Edge Function secret. It must never appear in `VITE_*`, browser code, localStorage, IndexedDB, source control, logs, response payloads, or client-accessible metadata.

The function uses the official Management API origin `https://api.supabase.com`; it does not accept a caller-controlled provider base URL.

## Documented provider surfaces used

The adapter uses only documented Management API surfaces to confirm that the configured Management API credential and organization are reachable:

- `GET /v1/organizations/{slug}`
- `GET /v1/organizations/{slug}/entitlements`

Raw Management API payloads are not forwarded to the PWA.

The entitlements endpoint is treated as a capability/reachability signal only. This slice does not assume undocumented JSON field names or translate an unknown entitlement schema into quotas.

## Billing-cycle usage API gap

As of **2026-08-22**, Supabase documents the authoritative billing-cycle values for Monthly Active Users, unified egress/cached egress, Realtime Message Count, and Realtime Peak Connections as values visible on the organization Usage page. The currently documented Management API reference does not expose a stable endpoint for those organization billing-cycle totals.

Accordingly this phase intentionally does **not**:

- do not invent or call an undocumented `/usage` Management API endpoint;
- scrape the Supabase Dashboard;
- reconstruct billable MAU from `auth.users`, `last_sign_in_at`, or the Phase 15.2B 30-day sign-in count;
- rebuild billable MAU from short-retention Auth logs;
- use the retiring `logs.all` Management API surface;
- infer unified billing egress from a partial project report;
- hard-code Free/Pro/Team quotas into runtime application logic;
- convert missing provider values into zero.

The provider metrics are therefore returned as `available = false`, `value = null`, and `limit = null` until Supabase exposes a documented machine-readable billing-cycle usage source suitable for this integration.

## Provider metric identities

The Supabase Management source now reserves explicit billing identities:

- `supabase_monthly_active_users` — count
- `supabase_egress_bytes` — uncached/unified billable egress bytes when a provider feed becomes available
- `supabase_cached_egress_bytes` — cached billable egress bytes
- `supabase_realtime_messages` — Realtime billing message count
- `supabase_realtime_peak_connections` — billing-cycle peak connections

The former ambiguous `supabase_realtime_usage` placeholder is removed before any UI depends on it.

## Client adapter

`createSupabaseManagementCapacityProvider()` consumes a future function invoker rather than importing provider credentials or Management API logic into browser code. It validates the normalized response and fails closed when:

- invocation throws;
- the response source/scope is wrong;
- timestamps or units are malformed;
- an available metric has no finite non-negative value;
- an unavailable metric incorrectly contains a numeric value;
- a requested provider metric is absent.

Missing or failed provider metrics remain `UNAVAILABLE`; the adapter never substitutes `0`.

## Deployment (later/operator action)

No secret is included in this patch. Before deploying the function, an operator can configure secrets directly with Supabase tooling, for example:

```powershell
npx supabase secrets set SUPABASE_MANAGEMENT_ACCESS_TOKEN="<set-locally>" SUPABASE_ORGANIZATION_SLUG="<your-org-slug>" --project-ref ijkmevahyojfkxqykcjp
npx supabase functions deploy platform-capacity-supabase --project-ref ijkmevahyojfkxqykcjp
```

Do not paste the Management API token into source code or a browser `.env` file.

A real platform administrator is still required before the protected function can return provider data. This phase does not bootstrap one.

## Completion state

### 15.2C1 — Secure Management API boundary + capability adapter — DONE

Delivered by this patch.

### 15.2C2 — Provider-authoritative billing-cycle usage feed — BLOCKED ON DOCUMENTED SUPABASE API/EXPORT

Unblock when Supabase provides a documented stable machine-readable source for the organization billing-cycle metrics. At that point the existing Edge boundary can normalize those values without changing the browser authorization architecture.

Phase 15.2D may proceed independently while 15.2C2 remains blocked.

## Explicit non-goals

- no dashboard UI;
- no GitHub push;
- no Edge Function deployment;
- no database migration;
- no platform-admin bootstrap;
- no scoring, XP, badges, rankings, workout, group, or ordinary-user behavior changes.
