# Top Set

Top Set is a lifting-first fitness game and installable PWA built with React, TypeScript, Vite, and Supabase. It combines durable workout logging, lifting progression, groups/competition, badges, social features, offline recovery, and platform administration.

The active product scoring model is `lifting-v1`. Lifting is primary; cardio is an accessory bonus. See [`docs/DOMAIN-RULES.md`](docs/DOMAIN-RULES.md) for the authoritative scoring rules.

## Current development status

Phase 18 is in progress. **Phase 18.4 Active Superset Flow is complete and passed its full validation gate. Phase 18.5 Superset Recovery & Reliability is next.**

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the milestone view and [`docs/PHASE18-LIVE-WORKOUT-ROADMAP.md`](docs/PHASE18-LIVE-WORKOUT-ROADMAP.md) for the detailed Phase 18 → native execution plan.

## Stack

- React 19 + TypeScript
- Vite
- Supabase Auth, PostgreSQL, Storage, RPCs, RLS, and Edge Functions
- IndexedDB-backed workout recovery
- Vitest + React Testing Library
- Playwright across desktop Chromium, Android-class Chromium, and iPhone-class WebKit
- Netlify hosting configuration

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

On PowerShell:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Populate `.env.local` only with browser-safe values described in [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md). Never place service-role keys, database passwords, provider tokens, or other secrets in `VITE_*` variables.

Top Set uses a **hosted-first Supabase workflow**. Docker and a local Supabase stack are not required by the supported development path. See [`docs/SUPABASE-SETUP.md`](docs/SUPABASE-SETUP.md).

## Validation

The canonical validation contract is [`docs/CI-VALIDATION.md`](docs/CI-VALIDATION.md). The normal full local acceptance gate is:

```bash
npm run typecheck
npm test
npm run test:integration
npm run test:internal
npm run db:test:ci
npm run test:structure
npm run build
npm run test:e2e
```

Run focused tests first while developing a slice, then the full gate before closing a phase or release checkpoint.

## Repository layout

```text
src/                 React application, domain logic, features, PWA code
supabase/migrations/ immutable versioned database migrations
supabase/tests/      rollback-safe pgTAP database/RLS tests
supabase/functions/  trusted server-side Edge Function boundaries
tests/e2e/           Playwright browser flows
scripts/             repository validation and release guardrails
docs/                canonical technical docs + historical phase records
```

## Documentation

Start with [`docs/README.md`](docs/README.md). It identifies the source of truth for each topic and distinguishes current reference documents from historical phase records.

Repository history belongs in Git and `CHANGELOG.md`. One-off patch manifests, handoff text files, hotfix READMEs, and duplicated validation instructions should not be committed.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for architecture boundaries, small-slice delivery rules, migration discipline, documentation policy, and release expectations.
