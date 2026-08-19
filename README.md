# Workout Game PWA

A React + TypeScript + Vite progressive web app for a private, expandable friend-group fitness game. The scoring model rewards **consistency first** and uses a small personal-improvement bonus only after account and per-benchmark calibration.

## Current phase

Phase 5 is in progress. The current work is intentionally non-visual onboarding architecture. Before the production onboarding/dashboard UI is implemented, follow `docs/UI-DEVELOPMENT-GATE.md`: generate and review a phone-first concept image, define responsive/component boundaries, then build the approved layout.

**Phase 4 / foundation v0.2:** Supabase schema, Row Level Security, expandable groups, workout persistence, XP/benchmark ledger infrastructure, authentication, and password recovery.

The app is intentionally not yet a polished workout tracker. The current goal is to make the rules, data model, permissions, and onboarding reproducible before feature UI grows around them.

## Stack

- React 19 + TypeScript
- Vite 8
- PWA manifest + service worker
- Supabase Auth
- Supabase/PostgreSQL
- Row Level Security (RLS)
- Vitest + React Testing Library
- Supabase CLI + pgTAP database tests
- Playwright E2E

## Prerequisites

Install:

1. Node.js 20+ (Node 22 is recommended for this repository)
2. npm
3. Git
4. Docker Desktop only if/when you choose to run the optional local Supabase CLI stack

## First-time local setup

### 1. Install JavaScript dependencies

```bash
npm install
```

### 2. Choose your Supabase workflow

The current project is using a **hosted Supabase Dashboard-first workflow**. You do not need Docker or a local Supabase stack for that path. Apply SQL files through the hosted SQL Editor as documented in `docs/SUPABASE-SETUP.md`.

If you later choose the optional local CLI workflow, initialize its metadata with:

```bash
npx supabase init
```

Do **not** delete the existing `supabase/migrations`, `supabase/tests`, or `supabase/seed.sql` files.

Open the generated `supabase/config.toml` and set the local Auth URLs to Vite:

```toml
[auth]
site_url = "http://localhost:5173"
additional_redirect_urls = ["http://localhost:5173", "http://localhost:5173/reset-password"]
```

If you change this while Supabase is already running, restart the local stack.

### 3. Optional local CLI only: start Docker Desktop

Skip this for the current hosted Dashboard workflow. If using the local CLI, wait until Docker reports that the engine is running.

### 4. Optional local CLI only: start local Supabase

```bash
npx supabase start
```

The first run downloads local service images. When it finishes, Supabase prints local URLs and keys.

Useful command:

```bash
npx supabase status
```

### 5. Apply migrations

For the hosted Dashboard workflow, run each migration file in filename order in **SQL Editor -> New query**, followed by `supabase/seed.sql` on a fresh project. For an already-configured Phase 4 project, apply only new migration files that have not been run yet.

For the optional local CLI workflow, apply all migrations from a clean database:


```bash
npx supabase db reset
```

This recreates the local database, applies every migration in order, then runs `supabase/seed.sql`.

### 6. Configure the Vite app

The exact environment-variable rules are documented in `docs/ENVIRONMENT.md`. For local development, copy the sanitized template:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Run:

```bash
npx supabase status
```

For a hosted Supabase project, copy the **Project URL** and **Publishable key** from the Supabase Connect/API Keys panel into `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_REAL_KEY
VITE_APP_URL=http://localhost:5173
```

Never place a Supabase secret/service-role key, database password, or `sb_secret_...` value in a `VITE_` variable. See `docs/ENVIRONMENT.md`.

### 7. Run database tests

For the hosted Dashboard workflow, paste each `supabase/tests/*.test.sql` file into SQL Editor and run it individually.

For the optional local CLI workflow:

```bash
npx supabase test db
```

### 8. Lint database functions/schema

```bash
npx supabase db lint --level warning
```

### 9. Run the frontend

```bash
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

## Local email testing / password reset

The local Supabase stack captures Auth emails in Mailpit. After `supabase start`, open:

```text
http://localhost:54324
```

1. Create an account in the app.
2. Open Mailpit and follow the confirmation email if local email confirmation is enabled.
3. On the sign-in screen choose **Forgot password?**.
4. Submit the account email.
5. Open the reset email in Mailpit.
6. Follow the link to `/reset-password`.
7. Set a new password.
8. Confirm the old password no longer signs in and the new password does.

For a hosted Supabase project, add the production `/reset-password` URL to **Authentication -> URL Configuration -> Redirect URLs**.

## Validation commands

Run these before opening a PR:

```bash
npm run typecheck
npm test
npm run build
npx supabase db reset
npx supabase test db
npx supabase db lint --level warning
```

Optional browser E2E:

```bash
npx playwright install
npm run test:e2e
```

Dependency-independent domain verification:

```bash
npm run test:internal
```

## Project map

```text
src/
  app/                  App shell
  domain/               Pure workout/scoring/progression rules
  features/auth/        Supabase authentication/recovery foundation
  lib/                  Supabase client bootstrap
  pwa/                  Service-worker registration
  styles/               Shared responsive styles

docs/
  ROADMAP.md             Detailed implementation roadmap/status
  DOMAIN-RULES.md        Product/scoring source of truth
  TESTING.md             Testing philosophy and commands
  ARCHITECTURE.md        Layering/security decisions
  DATABASE.md            Schema and RLS overview
  SUPABASE-SETUP.md      Local + hosted Supabase walkthrough
  VALIDATION.md          What was actually tested in this package
  ENVIRONMENT.md         Env variables, secret handling, and deployment setup
supabase/
  migrations/            Versioned database changes
  tests/                 pgTAP database/RLS tests
  seed.sql               Reproducible local seed data
```

## Development rules

1. Do not calculate authoritative XP in React.
2. Do not make `xp_events` or benchmark state client-writable.
3. Domain-rule changes require matching test-oracle updates.
4. Tests must assert intended behavior, not implementation details.
5. RLS/database permission rules must be tested at the database layer.
6. Never hard-code a four-person group limit.
7. Do not use another user's performance in personal-improvement calculations.
8. Never commit `.env.local`, service-role keys, database passwords, or production secrets.

## Read next

Start with `docs/ROADMAP.md`, then `docs/DOMAIN-RULES.md`, `docs/ARCHITECTURE.md`, `docs/SUPABASE-SETUP.md`, `docs/ENVIRONMENT.md`, `docs/TESTING.md`, `docs/VALIDATION.md`, and `docs/REFERENCES.md`.

## Deployment routing note

The password-reset page uses the client route `/reset-password`. Static hosting must rewrite that path to `index.html` so the React PWA can process the Supabase recovery session. Add the host-specific SPA fallback during deployment.
