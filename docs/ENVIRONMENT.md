# Environment Variables and Secret Handling

This document is the source of truth for environment configuration in the Fitness Game PWA.

## 1. What the React PWA needs

The browser application needs only three environment variables:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
VITE_APP_URL=http://localhost:5173
```

### `VITE_SUPABASE_URL`

Use the project's Supabase API URL. In the hosted Supabase Dashboard, copy the **Project URL** from the project's Connect panel or API settings.

Example shape:

```text
https://abcdefghijklmnop.supabase.co
```

### `VITE_SUPABASE_PUBLISHABLE_KEY`

Use the project's **Publishable key** (`sb_publishable_...`). This is the browser/client key used by `@supabase/supabase-js` together with Row Level Security.

If an older Supabase project exposes only legacy keys, the legacy `anon` key is browser-safe with RLS, but this project is intentionally named/configured for Supabase's newer publishable key and should use it when available.

### `VITE_APP_URL`

This is the public origin of the PWA and is used to construct authentication redirect URLs.

Local development:

```env
VITE_APP_URL=http://localhost:5173
```

Later staging example:

```env
VITE_APP_URL=https://staging.example.com
```

Later production example:

```env
VITE_APP_URL=https://example.com
```

Do not include a trailing path such as `/reset-password`; the app adds that route when required.

## 2. Create your local environment file

From the project root:

### macOS / Linux / Git Bash

```bash
cp .env.example .env.local
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env.local
```

Then open `.env.local` and replace the placeholders with your hosted Supabase values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_REAL_KEY
VITE_APP_URL=http://localhost:5173
```

Restart `npm run dev` whenever you change Vite environment variables.

## 3. Values that must NEVER go in the React environment

Do not put any privileged database/server credential in `.env.local` or any other Vite file, including:

```text
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
service_role JWTs
sb_secret_... keys
DATABASE_URL
Postgres passwords
JWT signing private keys
```

Anything prefixed with `VITE_` is intended to be available to browser code. Treat every `VITE_*` value as public.

If we later add server-only infrastructure (for example a trusted server or CI migration job), its secrets must be stored in that platform's secret manager or a separately ignored server environment file, never in the React bundle.

## 4. Git protection

The repository `.gitignore` ignores:

```text
.env
.env.*
```

and explicitly re-allows only sanitized templates:

```text
!.env.example
!.env.*.example
```

It also ignores common private key formats and Supabase local secret/temp files.

Before committing, verify:

```bash
git status
```

Your `.env.local` must **not** appear as an untracked or staged file.

A second useful check:

```bash
git check-ignore -v .env.local
```

It should report that `.gitignore` is ignoring the file.

## 5. Supabase Auth URL configuration

When the PWA runs locally, configure the hosted Supabase project:

**Authentication -> URL Configuration**

Site URL:

```text
http://localhost:5173
```

Allowed redirect URL:

```text
http://localhost:5173/reset-password
```

Add staging and production origins/redirects when those environments exist.

The application's forgot-password flow uses `VITE_APP_URL` to construct the reset redirect.

## 6. Deployment environments

Do not create or commit a real `.env.production` file just to deploy the app.

When we deploy to a host, add these values through the hosting provider's environment-variable UI:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_APP_URL
```

The production build will receive them from the deployment environment.

## 7. If a secret is accidentally committed

Adding it to `.gitignore` afterward does not make the leaked value safe.

Immediately:

1. Revoke/rotate the exposed credential in Supabase.
2. Remove it from the working tree and future commits.
3. If necessary, clean it from repository history before sharing/publishing the repository.
4. Reissue the application with the replacement credential.

For a leaked Supabase secret/service-role key, treat it as compromised because it can bypass normal Row Level Security protections.
