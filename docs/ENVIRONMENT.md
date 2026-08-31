# Environment Variables and Secret Handling

This document is the source of truth for browser environment configuration and server-only provider secrets in Top Set.

## 1. Browser environment

The React PWA requires two browser-safe Supabase values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

The app also supports one optional public-origin override:

```env
VITE_APP_URL=http://localhost:5173
```

Anything prefixed with `VITE_` is compiled for browser use and must be treated as public.

### `VITE_SUPABASE_URL`

Use the hosted project's Supabase API URL.

### `VITE_SUPABASE_PUBLISHABLE_KEY`

Use the project's browser-safe Publishable key (`sb_publishable_...`). RLS remains the security boundary.

### `VITE_APP_URL`

`VITE_APP_URL` is optional. It controls the origin used to construct confirmation and password-reset redirects.

Local development can set it explicitly:

```env
VITE_APP_URL=http://localhost:5173
```

For Netlify Deploy Previews and temporary branch deploys, **omit `VITE_APP_URL`**. `src/lib/supabase.ts` then uses `window.location.origin`, so the generated auth redirect follows the exact preview origin.

For the final production site, either:

1. leave it unset and use the browser's current production origin; or
2. set it to the exact canonical production origin once that origin is final.

Do not include `/reset-password`; the application adds that route.

## 2. Local environment

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Then replace the placeholders with the hosted Supabase URL and publishable key. Restart Vite after changing an environment variable.

## 3. Values that must never enter the browser environment

Never put privileged credentials in `.env.local`, `netlify.toml`, a `VITE_*` variable, or client source code:

```text
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
service_role JWTs
sb_secret_... keys
DATABASE_URL
Postgres passwords
JWT signing private keys
NETLIFY_AUTH_TOKEN
NETLIFY_ACCESS_TOKEN
NETLIFY_ACCOUNT_ID
NETLIFY_SITE_ID
```

Server-only credentials belong only in the relevant provider's secret store and only when a server-side feature actually requires them.

## 4. Git protection

The repository ignores `.env`, `.env.*`, Supabase generated state, and `.netlify/`. Only sanitized `*.example` environment templates may be committed.

Before committing:

```powershell
git status --short
git check-ignore -v .env.local
```

`.env.local` must be ignored.

## 5. Netlify build environment

Phase 17.5 keeps `netlify.toml` free of application values and secrets.

Configure only these browser-safe values through Netlify's environment-variable UI for deploy contexts that need the PWA:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

For Deploy Previews, do **not** set `VITE_APP_URL`. This lets the preview use its exact `window.location.origin`.

Do not add the retired `VITE_NETLIFY_CAPACITY_ENABLED` flag. Phase 17.6 uses a server-side provider boundary instead of exposing a Netlify credential or capacity switch to the browser.

## 6. Phase 17.6 Netlify provider secrets

The Netlify capacity adapter runs in the Supabase Edge Function `platform-capacity-netlify`. Its provider credentials belong in **Supabase Edge Function secrets**, never in Netlify's frontend build environment and never in a `VITE_*` variable.

Required server-only values:

```text
NETLIFY_ACCESS_TOKEN
NETLIFY_ACCOUNT_ID
NETLIFY_SITE_ID
```

`NETLIFY_ACCESS_TOKEN` is a Netlify personal access token with enough access to read the configured account/team and project. Do not paste it into issues, logs, screenshots, frontend environment files, or source code.

`NETLIFY_ACCOUNT_ID` must be the Netlify REST API account/team `id`, not merely the display name. Netlify documents retrieving it by querying `GET /api/v1/accounts/{account_slug}`.

`NETLIFY_SITE_ID` is the Netlify Project ID used by `GET /api/v1/sites/{site_id}`. For the current Top Set project, the verified Netlify Project ID is:

```text
20b8ab71-b089-497c-89bc-25af47d80ea8
```

The Edge Function uses these values only to verify that the configured account and project are reachable through Netlify's documented REST API. Netlify's documented public API does not currently expose authoritative Account Usage Insights billing-period totals for bandwidth, web requests, or credit usage. Those values therefore remain unavailable in Top Set instead of being estimated.

## 7. Supabase Auth URL configuration for Netlify

The app sends:

- signup/email-confirmation redirects to the app root;
- password resets to `/reset-password`.

For Netlify previews, add the specific preview pattern to **Authentication -> URL Configuration -> Redirect URLs**:

```text
https://**--YOUR_SITE_SLUG.netlify.app/**
```

Keep local development explicitly allowlisted as needed:

```text
http://localhost:5173/**
```

Do not change Supabase **Site URL** to a temporary preview. When the final production origin is chosen, set Site URL to that exact production origin and add exact production redirects, including `/reset-password`.

## 8. Production promotion

After the release candidate is approved:

1. confirm the intended production deploy source;
2. confirm `npm run build` and `dist` are read from `netlify.toml`;
3. set the required public Supabase values for production;
4. choose the final Netlify/custom production origin;
5. configure Supabase Site URL and exact production redirect URLs;
6. deploy the exact approved release commit;
7. run the Phase 17.7 deployed-auth/PWA/direct-route/security checks before the Phase 17.8 reset and launch.

## 9. If a secret is exposed

Revoke/rotate it immediately. `.gitignore` does not make a previously committed secret safe.
