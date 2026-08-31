# Phase 17.5 — Netlify Hosting + Production Configuration

Status: **IMPLEMENTED LOCALLY — FIRST NETLIFY PROJECT / DEPLOY PREVIEW PENDING**

Baseline branch: `checkpoint/phase17-local-20260830-171045`

Baseline commit before this phase: `58946ff2c5f37be2a63dac88bc4c5a2afa3dc4ff`

Production branch: `master`

## Objective

Make the frozen Top Set client deployable to Netlify with an explicit, reviewable production-host contract before any production statistics reset occurs.

Phase 17.5 does not add product features, modify scoring rules, change database schema, execute the production reset, or implement Netlify account-capacity telemetry.

## Repository hosting contract

`netlify.toml` is authoritative for:

- build command: `npm run build`
- publish directory: `dist`
- build runtime: Node 24
- baseline security headers
- browser cache behavior for Vite hashed assets
- revalidation of PWA/service-worker metadata

The existing `public/_redirects` remains the SPA routing contract:

```text
/*    /index.html   200
```

Vite copies this file into `dist`, so direct navigation and refresh on application routes are rewritten to the SPA shell.

## Security headers

Phase 17.5 adds host-level headers that are safe before the final production origin is known:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- a restrictive `Permissions-Policy` for unused device capabilities

A Content Security Policy (CSP) is deliberately **not guessed in this phase**. The final CSP must be validated against the real deployed Supabase Auth, Realtime, Storage/image, PWA, and notification behavior during the release-candidate security pass. CSP remains a Phase 17.7 release-candidate item.

## Cache behavior

- `/assets/*`: Vite content-hashed assets receive one-year browser caching with `immutable`.
- `/sw.js`: revalidates every visit/update check.
- `/asset-manifest.json`: revalidates.
- `/manifest.webmanifest`: revalidates.
- `/index.html`: revalidates.
- Netlify's deploy-aware CDN may cache immutable deploy files independently and invalidates them when a deploy changes.

The service worker remains responsible for the app's offline shell. Netlify configuration must not make `sw.js` immutable.

## Environment boundary

Netlify needs only the browser-safe Supabase values for the PWA:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

For Deploy Previews, **omit `VITE_APP_URL`**. The existing `getAppUrl()` implementation falls back to `window.location.origin`, which gives each preview its own exact redirect origin.

Never place service-role, secret Supabase, database, or Netlify access credentials in `VITE_*` variables or `netlify.toml`.

The obsolete `VITE_NETLIFY_CAPACITY_ENABLED` browser switch is removed. Phase 17.6 will decide whether authoritative Netlify account telemetry is available through a secured server-side boundary.

## First Netlify project setup

There is no pre-existing Netlify deployment to preserve.

Create the first project from the GitHub repository with these invariants:

1. Git repository: `StefanSaladino/fitness-game-pwa`.
2. Production branch: `master`.
3. Do not override build command or publish directory in the UI; `netlify.toml` owns both.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` through Netlify environment variables.
5. Leave `VITE_APP_URL` unset for the first preview.
6. Do not add any service-role/database/Netlify personal token to the frontend build environment.
7. Enable a Deploy Preview or temporary branch deploy for the Phase 17 checkpoint rather than treating the checkpoint branch as production.

## Supabase Auth setup after Netlify assigns the site slug

Before auth testing, add the narrow Netlify preview wildcard for the new site to Supabase Redirect URLs, for example:

```text
https://**--YOUR_SITE_SLUG.netlify.app/**
```

Do not point Supabase Site URL at a temporary Deploy Preview.

When the final production origin is selected:

- set Supabase Site URL to that exact origin;
- add the exact production root/redirect paths;
- verify `/reset-password`;
- verify email confirmation;
- keep preview wildcard entries only while previews are required.

## Local validation

Run:

```text
npm run test:hosting
npm run test:structure
npm run build
git diff --check
```

The full behavioral/visual release matrix is intentionally not repeated just for the static hosting files. It remains mandatory in Phase 17.7.

## Deploy Preview exit checks

The first preview must prove:

1. root loads over HTTPS;
2. a direct application route loads and refreshes without 404;
3. `sw.js`, `manifest.webmanifest`, `asset-manifest.json`, and icons return successfully;
4. hashed `/assets/*` files return successfully;
5. security headers are present;
6. service worker is not served with an immutable browser cache policy;
7. Supabase sign-in works;
8. signup/email confirmation redirect works;
9. password-reset email returns to `/reset-password`;
10. session restore works after refresh;
11. PWA installability/offline shell/update behavior has no hosting regression;
12. no privileged secret appears in generated JavaScript or deploy logs.

## Exit gate

Phase 17.5 is complete only when an approved Netlify Deploy Preview passes the production-like checks above.

Until then, repository implementation may be green, but the phase remains **preview pending**.

## Explicit non-goals

- no production statistics reset;
- no production launch;
- no custom-domain cutover;
- no Netlify capacity/usage provider implementation;
- no service-role credential in Netlify frontend environment;
- no broad Supabase migration operation;
- no new application feature.
