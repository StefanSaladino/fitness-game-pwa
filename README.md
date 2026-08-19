# Lifting Game PWA

A React + TypeScript + Vite progressive web app for an expandable friend-group **lifting progression game**. The v0.3 product model rewards completing real lifting sessions, meaningful exercise work, and personal progression; cardio remains a small accessory bonus.

## Current phase

The project has completed **Phase 5.7: integration validation** across onboarding, group setup, dashboard entry, and group-permission presentation. The next product phase is Phase 6: lifting workout capture.

Current scoring version: `lifting-v1`.

Daily scoring layers:

- qualifying lifting workout: 50 XP/day max;
- exercise completion: 5 XP per canonical exercise with at least 2 working sets, max 30/day;
- personal exercise progression: 5/10/15 XP per improved exercise, max 30/day;
- cardio accessory bonus: best 5/10/15 duration tier, max 15/day;
- maximum daily total: 125 XP.

See `docs/DOMAIN-RULES.md` before changing scoring behavior.

## Stack

- React 19 + TypeScript
- Vite 8
- PWA manifest + service worker
- Supabase Auth/PostgreSQL/RLS
- Vitest + React Testing Library
- pgTAP database tests
- Playwright E2E

## Hosted Supabase workflow

This repository currently uses a hosted-Supabase Dashboard-first workflow.

Apply migrations in filename order through **Supabase -> SQL Editor**. For an existing environment, run only migration files not already applied.

For an environment already through the Phase 5.5D leaderboard migration, apply the remaining security/admin migrations in order:

```text
supabase/migrations/20260819000400_lock_down_dashboard_leaderboard.sql
supabase/migrations/20260819000500_group_administration_permissions.sql
```

Then run:

```text
supabase/tests/009_dashboard_read_models.test.sql
supabase/tests/010_group_administration_permissions.test.sql
```

The optional local Supabase CLI workflow remains documented in `docs/SUPABASE-SETUP.md`.

## Local app setup

```bash
npm install
```

Create the private local environment file:

```powershell
Copy-Item .env.example .env.local
```

Populate only browser-safe values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_REAL_KEY
VITE_APP_URL=http://localhost:5173
```

Never put service-role/secret keys, database passwords, or `sb_secret_...` values in `VITE_` variables.

Run:

```bash
npm run dev
```

## Validation

```bash
npm run typecheck
npm test
npm run build
npm run test:structure
npm run test:e2e
```

Dependency-independent domain oracle:

```bash
npm run test:internal
```

For hosted Supabase, run the pgTAP SQL files individually in SQL Editor after applying migrations.

## Project map

```text
src/
  app/                  Route-level application composition
  components/ui/        Shared accessible UI primitives
  components/layout/    Responsive shell/navigation
  domain/               Pure lifting/scoring/progression rules
  features/auth/        Auth UI/controller/service boundary
  features/onboarding/  Profile onboarding UI/controller/service boundary
  features/groups/      Multi-group setup/admin models, hooks, services, and CSS-Module UI
  features/dashboard/   Lifting dashboard read model/controller/presentation boundary
  features/profile-picture/ Optional PFP storage/controller/presentation boundary
  features/product/     Product-level Home/Groups navigation composition
  lib/                  Infrastructure clients
  pwa/                  Service worker
  styles/               Global tokens/reset/base + legacy compatibility styles

docs/
  ROADMAP.md             Detailed roadmap/status
  DOMAIN-RULES.md        lifting-v1 scoring source of truth
  CSS-ARCHITECTURE.md    CSS separation-of-concerns rules
  UI-ARCHITECTURE.md     Responsive/component boundaries
  TESTING.md             Test philosophy
  DATABASE.md            Persistence/RLS model
supabase/
  migrations/            Versioned database changes
  tests/                 pgTAP tests
  seed.sql               Exercise/catalog seed
```

## Development rules

1. Authoritative scoring is never calculated only in React.
2. `scoring_events` and exercise-progress snapshots are not client-writable.
3. Domain-rule changes require matching tests and documentation.
4. Another user's performance never affects personal progression scoring.
5. Cardio does not satisfy the weekly lifting target.
6. Raw training volume is tracked for analytics but does not directly award XP.
7. Canonical exercise IDs—not labels/aliases—are progression identity.
8. No hard-coded four-person group limit.
9. Never commit `.env.local` or privileged credentials.
10. New CSS follows `docs/CSS-ARCHITECTURE.md`; feature/component styles do not grow the legacy global stylesheet.

## Read next

Start with `docs/ROADMAP.md`, `docs/DOMAIN-RULES.md`, `docs/CSS-ARCHITECTURE.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, and `docs/TESTING.md`.
