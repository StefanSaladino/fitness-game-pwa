# Top Set

Top Set is a lifting-first fitness game and installable PWA built with React, TypeScript, Vite, and Supabase. It combines durable workout logging, lifting progression, groups/competition, badges, social features, offline recovery, platform administration, and performance-aware muscle-volume intelligence.

The active product scoring model is `lifting-v1`. Lifting is primary; cardio is an accessory bonus. The separate Phase 19 muscle-volume analytics methodology is `muscle-volume-v1` and does not change XP/scoring. See [`docs/DOMAIN-RULES.md`](docs/DOMAIN-RULES.md) for the authoritative domain rules.

## Current development status

Phase 19 is in progress. **Phase 19.8 performance-aware volume recommendations is complete. Phase 19.9 weekly/monthly reporting, frozen monthly source snapshots, and monthly PDF generation are implemented through the synthetic QA checkpoint and remain in validation before the Phase 19 production-release gate.**

Current Phase 19.9 work includes completed-period Reports UI, an idempotent frozen monthly source snapshot, deterministic development-only QA fixtures, and real `pdf-lib` monthly PDF generation with multi-page pagination coverage. Remaining release work includes a true hosted end-to-end QA-account test, generated public database-type reconciliation, the still-planned private latest-PDF retention/storage lifecycle, capacity/retention validation, and the applicable full release gate.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the milestone view and current Phase 19.9 checkpoint.

## Stack

- React 19 + TypeScript
- Vite
- Supabase Auth, PostgreSQL, Storage, RPCs, RLS, and Edge Functions
- IndexedDB-backed workout recovery
- Vitest + React Testing Library
- Playwright across desktop Chromium, Android-class Chromium, and iPhone-class WebKit
- `pdf-lib` for generated monthly training-review PDFs
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

The canonical validation contract is [`docs/CI-VALIDATION.md`](docs/CI-VALIDATION.md). Use focused tests while developing a slice, then run the applicable full acceptance/release gate before closing a phase or release checkpoint.

For the current Phase 19.9 report slice, focused validation includes the training-report model, service, hook, screen, QA-fixture, and PDF tests. The synthetic stress fixture also re-opens its generated PDF with `pdf-lib` and requires at least three pages, so pagination is tested rather than only the PDF file signature.

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
