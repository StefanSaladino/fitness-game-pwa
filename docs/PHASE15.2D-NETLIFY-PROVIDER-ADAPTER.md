# Phase 15.2D — Netlify Provider Usage Adapter

Status: **PARTIAL — secure provider boundary delivered; authoritative account-usage feed blocked on a documented Netlify API/export.**

## Purpose

Phase 15.2D connects the provider-neutral capacity model to Netlify without ever placing a Netlify access token in the PWA. It follows the same fail-closed rule as the Supabase provider adapter: missing provider billing data is unavailable, never zero, guessed, scraped, or reconstructed from unrelated logs.

## Billing scope

Netlify billing/usage is primarily team/account scoped. The public API calls a Netlify team an `account`, so this provider uses `scope = ACCOUNT`.

`CapacityMetricScope` therefore now supports:

- `PROJECT`
- `ORGANIZATION`
- `ACCOUNT`

The optional configured site/project is verified only to establish that the target Netlify project belongs to the configured account. It does not convert account-level billing usage into a site-only quota.

## Secure request path

```text
Authenticated PWA
    | caller Supabase JWT
    v
platform-capacity-netlify Edge Function
    | public.get_my_platform_access()
    | require ACTIVE + is_platform_admin = true
    v
Netlify API
    | NETLIFY_ACCESS_TOKEN (server secret only)
    | NETLIFY_ACCOUNT_ID (server configuration)
    | NETLIFY_SITE_ID (optional server configuration)
    v
Sanitized provider capability envelope
```

The Netlify access token never authenticates the browser caller. The Edge Function first re-authorizes the signed-in user through the existing platform-access RPC. Unauthorized callers receive the same generic HTTP 404 / `Not found` response used by the other platform-admin boundaries.

`verify_jwt = true` remains enabled because the function is invoked by an authenticated PWA session.

## Server-side secrets/configuration

Required for account verification:

- `NETLIFY_ACCESS_TOKEN`
- `NETLIFY_ACCOUNT_ID`

Optional project verification:

- `NETLIFY_SITE_ID`

For this private operational integration, the token may be a Netlify personal access token with access to the target account. It belongs only in Supabase Edge Function secrets. It must never be placed in `VITE_*`, source control, localStorage, IndexedDB, browser logs, URLs/query strings, or response payloads.

The provider origin is fixed to `https://api.netlify.com/api/v1`; callers cannot override it.

## Documented API surfaces used

The adapter only uses current documented Netlify API surfaces:

- `GET /accounts/{account_id}` — verify the configured team/account;
- `GET /sites/{site_id}` — optionally verify the configured project and confirm its `account_id` matches the configured account.

Raw Netlify account/site payloads are not forwarded to the PWA.

## Account-usage API gap

As of **2026-08-22**, Netlify documents bandwidth, web requests, builds/compute and credit consumption in its Usage & billing UI. Netlify also maintains separate credit-based and legacy billing models. The current public Netlify OpenAPI reference (2.57.0) documents account/site management but does not expose stable public endpoints for the authoritative Account usage insights totals.

Accordingly this phase intentionally does **not**:

- invent an undocumented Netlify billing/usage endpoint;
- scrape the Netlify dashboard;
- derive billing bandwidth from CDN/access logs;
- count application requests and call them Netlify billable web requests;
- sum deploy durations and call them provider build-minute usage;
- infer credit consumption from published pricing tables;
- assume an account is credit-based or legacy from undocumented `type_id`/`type_name` values;
- hard-code Free/Personal/Pro/Legacy allowances into runtime application logic;
- convert missing provider values into zero.

The three reserved Netlify capacity metrics therefore remain `available = false`, `value = null`, and `limit = null` until Netlify exposes a documented machine-readable source suitable for billing/account usage.

## Provider metric identities

- `netlify_bandwidth_bytes` — account billing bandwidth bytes when an authoritative feed exists;
- `netlify_requests` — account billable web request count when an authoritative feed exists;
- `netlify_build_usage` — reserved provider build/credit usage identity. It remains unavailable until a documented feed lets us model the account's actual billing system without ambiguity.

`netlify_build_usage` continues to use the existing `credits` unit contract and must not be populated with legacy build minutes. If Netlify later exposes legacy minutes and credit-plan credits as separate machine-readable values, split them into explicit metric identities before presenting them as comparable data.

## Client adapter

`createNetlifyApiCapacityProvider()` validates the normalized server response and fails closed when:

- invocation throws;
- response source/scope is wrong;
- timestamps or units are malformed;
- an available metric has no finite non-negative value;
- an unavailable metric incorrectly contains a numeric value;
- a requested provider metric is absent.

A failed or missing provider measurement always remains unavailable; the adapter never substitutes `0`.

## Deployment/operator action

No Netlify credential is included in this patch. When an operator chooses to deploy the capability boundary:

```powershell
npx supabase secrets set NETLIFY_ACCESS_TOKEN="<set-locally>" NETLIFY_ACCOUNT_ID="<your-account-id>" NETLIFY_SITE_ID="<your-site-id>" --project-ref ijkmevahyojfkxqykcjp
npx supabase functions deploy platform-capacity-netlify --project-ref ijkmevahyojfkxqykcjp
```

`NETLIFY_SITE_ID` is optional. No database migration is required for this slice.

A real ACTIVE platform administrator is still required to receive the capability response. This phase does not bootstrap one.

## Completion state

### 15.2D1 — Secure Netlify API boundary + capability adapter — DONE

Delivered by this patch.

### 15.2D2 — Provider-authoritative account usage feed — BLOCKED ON DOCUMENTED NETLIFY API/EXPORT

Unblock when Netlify exposes a stable documented machine-readable Account usage insights source. The existing Edge boundary can then normalize provider totals without changing browser authorization.

### Next

Phase **15.2E — Capacity dashboard visual gate + implementation** may proceed using:

- real database-local metrics from 15.2B;
- explicit provider capability/unavailable states from 15.2C and 15.2D;
- no fake provider totals.

The visual-design gate remains mandatory before dashboard UI implementation.

## Explicit non-goals

- no dashboard UI;
- no GitHub push;
- no Edge Function deployment;
- no database migration;
- no platform-admin bootstrap;
- no scoring, XP, badges, rankings, workout, group, or ordinary-user behavior changes.
