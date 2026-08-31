# Environment Variables and Secret Handling

This document is the source of truth for browser environment configuration in Top Set.

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

When the first Netlify project is created, configure these through Netlify's environment-variable UI for the deploy contexts that need the app:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

For the first Deploy Preview, do **not** set `VITE_APP_URL`. This lets the preview use its exact `window.location.origin`.

Do not add the retired `VITE_NETLIFY_CAPACITY_ENABLED` flag. Netlify capacity work belongs to Phase 17.6 and must use a server-side provider boundary if implemented.

## 6. Supabase Auth URL configuration for Netlify

The app sends:

- signup/email-confirmation redirects to the app root;
- password resets to `/reset-password`.

Before testing a Netlify preview, add the specific Netlify preview pattern to **Authentication -> URL Configuration -> Redirect URLs**.

Supabase supports wildcard redirect patterns for Netlify previews. Once the Netlify site slug exists, add only the pattern needed for that site, for example:

```text
https://**--YOUR_SITE_SLUG.netlify.app/**
```

Keep local development explicitly allowlisted as needed:

```text
http://localhost:5173/**
```

Do not change Supabase **Site URL** to a temporary preview. When the final production origin is chosen, set Site URL to that exact production origin and add exact production redirects, including `/reset-password`.

## 7. First production promotion

After the Deploy Preview is approved:

1. confirm the production branch in Netlify is `master`;
2. confirm `npm run build` and `dist` are read from `netlify.toml`;
3. set the required public Supabase values for production;
4. choose the final Netlify/custom production origin;
5. configure Supabase Site URL and exact production redirect URLs;
6. deploy the exact approved release commit;
7. run the Phase 17.7 deployed-auth/PWA/direct-route/security checks before the Phase 17.8 reset and launch.

## 8. If a secret is exposed

Revoke/rotate it immediately. `.gitignore` does not make a previously committed secret safe.
