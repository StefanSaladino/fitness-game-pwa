# Phase 17.6 — Netlify Capacity Provider Boundary

Status: **IMPLEMENTED ON ISOLATED BRANCH — HOSTED EDGE FUNCTION / PROVIDER SECRETS PENDING VALIDATION**

Baseline commit: `8965fc275e78448e2d56e912438c5cb455a18afe`

Implementation branch: `phase17-6-netlify-capacity`

## Objective

Connect the existing platform Capacity page to a secured, server-side Netlify provider without exposing a Netlify credential to the browser and without presenting inferred billing usage as authoritative telemetry.

Phase 17.6 is deliberately provider-boundary work. It does not change workout scoring, badges, database schema, production statistics, or the Netlify production deployment.

## Current Netlify API boundary

Netlify's documented public REST API exposes account/team and project management endpoints, including account and site lookup. Netlify's Usage & billing UI exposes Account Usage Insights for bandwidth, web requests, credits, and other meters.

At this checkpoint, the documented public REST API does **not** expose a supported endpoint that returns the authoritative current billing-period Account Usage Insights totals needed by Top Set for:

- bandwidth;
- web requests;
- build / credit usage.

Top Set therefore treats those three metrics as unavailable. It does not reconstruct them from deploy counts, CDN responses, logs, pricing formulas, or other indirect signals.

## Architecture

```text
Platform admin browser
  -> authenticated supabase.functions.invoke(...)
  -> platform-capacity-netlify Edge Function
  -> Supabase verify_jwt boundary
  -> ACTIVE platform-admin re-check
  -> server-only Netlify personal access token
  -> documented Netlify account/site lookup
```

The browser receives only normalized provider capability state and unavailable metric records. It never receives the Netlify access token.

The existing database-local capacity RPC remains independent. A Netlify provider outage or missing provider secret must not hide database size, object storage, or PostgreSQL connection telemetry.

## Provider capability contract

The Edge Function returns:

- `providerReachable`: the authenticated Edge Function returned a valid provider envelope;
- `apiConfigured`: Netlify access token + account ID are configured server-side;
- `accountVerified`: the configured Netlify account ID resolves and matches;
- `siteConfigured`: a Netlify Project ID is configured;
- `siteVerified`: the configured project resolves and belongs to the verified account;
- `billingUsageApi: UNAVAILABLE`: authoritative Account Usage Insights totals are not exposed through the supported public API used by this phase.

Provider errors fail closed. Unavailable metrics always use `value: null`, never `0`.

## Netlify metrics

The existing metric keys remain stable:

```text
netlify_bandwidth_bytes
netlify_requests
netlify_build_usage
```

All three are account-scoped and unavailable until Netlify exposes an authoritative supported billing-usage API. The Capacity page renders that limitation explicitly instead of calculating a utilization percentage.

## Server-only configuration

Configure these as Supabase Edge Function secrets only:

```text
NETLIFY_ACCESS_TOKEN
NETLIFY_ACCOUNT_ID
NETLIFY_SITE_ID
```

`NETLIFY_ACCOUNT_ID` is the Netlify REST account/team `id`. Netlify documents resolving it through `GET /api/v1/accounts/{account_slug}`.

The current Top Set Netlify Project ID is:

```text
20b8ab71-b089-497c-89bc-25af47d80ea8
```

Never put these values in `VITE_*`, `.env.local`, `netlify.toml`, generated JavaScript, or the Git repository.

## Hosted deployment sequence

Do not deploy this Edge Function until the branch is green locally.

After local validation:

1. create or select a least-privilege Netlify personal access token with read access to the Top Set team/project;
2. determine the exact Netlify REST account/team ID;
3. add the three provider values to Supabase Edge Function secrets;
4. deploy only `platform-capacity-netlify` with JWT verification enabled;
5. sign in as an ACTIVE Top Set platform admin;
6. open Capacity and confirm `Account and project verified`;
7. confirm Bandwidth, Web requests, and Build / credit usage all remain `Not exposed`, not zero;
8. verify a non-admin caller cannot retrieve provider capability details;
9. confirm the Netlify token is absent from generated browser assets and logs.

## Local validation

Run the normal repository gate, including the focused Capacity tests:

```text
npm run typecheck
npm test -- --run src/features/admin/capacity
npm run test:structure
npm run build
git diff --check
```

The Phase 17.7 full release-candidate behavioral/visual matrix remains mandatory before launch.

## Badge audit recorded before implementation

The existing badge earning system was re-audited before Phase 17.6. The authoritative 14-badge model, database reconciliation, RLS, guarded summary RPC, dashboard copy, and pgTAP coverage are present.

Dedicated collectible badge artwork is **not** present in the repository. The dashboard currently renders earned badges as text cards. Badge artwork is a separate product-remediation item and is intentionally not mixed into this telemetry phase.

## Exit gate

Phase 17.6 is complete only when:

1. the branch validation gate is green;
2. the hosted Edge Function is deployed with `verify_jwt = true`;
3. the server-only Netlify account and project credentials are configured;
4. an ACTIVE platform admin sees verified provider connectivity;
5. unauthorized callers fail closed;
6. no Netlify secret reaches the browser; and
7. unsupported Netlify billing totals remain explicitly unavailable rather than inferred.

## Explicit non-goals

- no badge artwork implementation;
- no database migration;
- no workout/scoring changes;
- no production statistics reset;
- no Netlify production deploy;
- no Netlify project visibility change;
- no public launch;
- no scraping of Netlify's dashboard;
- no guessed bandwidth/request/credit usage;
- no Netlify token in frontend configuration.
