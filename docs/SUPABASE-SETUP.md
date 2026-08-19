# Supabase Setup — Step by Step

This guide covers both local development and creation of a hosted Supabase project.

## A. Local development (recommended first)

### A1. Install dependencies

```bash
npm install
```

### A2. Install/start Docker Desktop

The Supabase local stack runs in Docker containers. Confirm Docker is running before continuing.

### A3. Initialize Supabase metadata

```bash
npx supabase init
```

This creates `supabase/config.toml`. The migrations/tests in this repository already exist; keep them.

Edit the generated local Auth configuration so confirmation/recovery redirects are allowed to return to Vite:

```toml
[auth]
site_url = "http://localhost:5173"
additional_redirect_urls = ["http://localhost:5173", "http://localhost:5173/reset-password"]
```

The CLI defaults to port 3000 for `auth.site_url`; this project runs Vite on 5173. If Supabase was already running when you edited `config.toml`, restart it with `npx supabase stop` then `npx supabase start`.

### A4. Start Supabase

```bash
npx supabase start
```

Useful local endpoints normally include:

- API: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- Mailpit: `http://localhost:54324`

Always trust the URLs printed by `npx supabase status` if your local ports differ.

### A5. Reset/apply migrations

```bash
npx supabase db reset
```

Expected behavior:

1. clean local DB
2. migrations applied in filename order
3. `supabase/seed.sql` applied

### A6. Test database

```bash
npx supabase test db
```

### A7. Lint database

```bash
npx supabase db lint --level warning
```

### A8. Create frontend environment file

macOS/Linux/Git Bash:

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Run:

```bash
npx supabase status
```

Copy the local API URL and browser-safe publishable/anon key into `.env.local`.

### A9. Start React

```bash
npm run dev
```

### A10. Test Auth email locally

Open Mailpit:

```text
http://localhost:54324
```

Use this for signup confirmation and password-reset emails.

## B. Hosted Supabase project

Do this only after local migrations/tests are green.

### B1. Create project

1. Sign in to Supabase Dashboard.
2. Create a new project.
3. Choose the organization.
4. Choose a project name.
5. Generate/store a strong database password.
6. Choose the nearest appropriate region.
7. Wait for provisioning.

### B2. Configure Auth URLs

In the project Dashboard:

**Authentication -> URL Configuration**

Set the Site URL to the deployed PWA origin.

Add redirect URLs for at least:

```text
http://localhost:5173/**
https://YOUR-STAGING-DOMAIN/**
https://YOUR-PRODUCTION-DOMAIN/**
```

The reset flow uses:

```text
/reset-password
```

Do not use permissive wildcard URLs in production beyond what your deployment actually requires.

### B3. Get browser credentials

Use the project API settings/Connect area to retrieve:

- Project URL
- publishable key (or browser-safe anon key, depending on dashboard terminology)

Place only browser-safe values in Vite env variables. For local development against the hosted project:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_REAL_KEY
VITE_APP_URL=http://localhost:5173
```

Get the Project URL and Publishable key from the Supabase **Connect** panel or **Settings -> API Keys**. Never put a secret/service-role key, `sb_secret_...` value, database password, or database URL in frontend env files. See `docs/ENVIRONMENT.md` for the full policy.

### B4. Login CLI

```bash
npx supabase login
```

### B5. Link repository to hosted project

From the project directory:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

The CLI may ask for your database password.

### B6. Review migration state

```bash
npx supabase migration list
```

### B7. Push migrations

After local reset/tests/lint are green:

```bash
npx supabase db push
```

Do not use a production database as the first place to discover a migration error.

## C. Password-reset test

### Local

1. Sign up.
2. Confirm via Mailpit if required.
3. Log out.
4. Click Forgot Password.
5. Submit the email.
6. Open Mailpit reset email.
7. Follow `/reset-password` link.
8. Set new password.
9. Log out.
10. Confirm old password fails.
11. Confirm new password succeeds.

### Hosted

Repeat the same flow using your configured SMTP/email delivery. Before a public release, configure a production SMTP provider instead of relying on Supabase's development-oriented default email delivery.

## D. Daily database workflow

Create a migration:

```bash
npx supabase migration new descriptive_name
```

Edit the generated SQL, then:

```bash
npx supabase db reset
npx supabase test db
npx supabase db lint --level warning
```

Regenerate DB types:

```bash
npx supabase gen types typescript --local > src/types/database.generated.ts
```

## E. Useful commands

```bash
npx supabase start
npx supabase status
npx supabase stop
npx supabase db reset
npx supabase test db
npx supabase db lint --level warning
npx supabase migration list
npx supabase gen types typescript --local
```

## F. Troubleshooting

### Docker error / cannot connect

Confirm Docker Desktop is running, then:

```bash
npx supabase stop
npx supabase start
```

### Migration error

Fix the migration and rerun:

```bash
npx supabase db reset
```

Do not modify production manually to hide a broken migration.

### React says Supabase is not configured

Confirm `.env.local` exists and restart Vite after editing it:

```bash
npm run dev
```

### Reset email link returns to wrong URL

Check:

1. `VITE_APP_URL`
2. Supabase Authentication -> URL Configuration
3. redirect URLs contain the exact development/staging/production origin

### Auth email is missing locally

Open Mailpit at the URL shown by `npx supabase status` (normally port 54324).
## Applying Phase 5 migrations in the hosted Dashboard

For the current Dashboard-first workflow, apply migrations in filename order. After the Phase 4 foundation is already present, run the full contents of:

```text
supabase/migrations/20260818000200_phase5_onboarding_foundation.sql
```

in **SQL Editor -> New query**. Then run the updated `005_profile_onboarding.test.sql` and the new `006_phase5_onboarding_username.test.sql`. Do not manually edit the `profiles` table or recreate the RPC in the Dashboard; the migration file remains the source of truth.

If the repository later switches to Supabase CLI deployment, reconcile the hosted project's migration history before using `db push`.


## Phase 5.4 / v0.3 lifting-first migration

For an existing project that already has the Phase 4 and Phase 5.1 migrations applied, run this next in the hosted SQL Editor:

```text
supabase/migrations/20260819000100_lifting_first_scoring_foundation.sql
```

Then run:

```text
supabase/tests/007_lifting_scoring_foundation.test.sql
```

This migration is additive. It introduces the new `lifting-v1` scoring/progression tables and explicit lifting/cardio qualification flags while retaining the v0.2 XP/performance tables as legacy migration history.

Do not manually delete the v0.2 tables. New scoring code must target `scoring_events`, `exercise_progress_observations`, and `exercise_progress` instead.
