# Top Set

Top Set is a lifting-first fitness game and installable PWA built with React, TypeScript, Vite, and Supabase. It combines durable workout logging, lifting progression, groups/competition, badges, social features, offline recovery, platform administration, and performance-aware muscle-volume intelligence.

The active product scoring model is `lifting-v1`. Lifting is primary; cardio is an accessory bonus. The separate Phase 19 muscle-volume analytics methodology is `muscle-volume-v1` and does not change XP/scoring. See [`docs/DOMAIN-RULES.md`](docs/DOMAIN-RULES.md) for the authoritative domain rules.

## Current development status

Phase 19 is complete in **Top Set v1.1.0**. Muscle Volume Intelligence, performance-aware recommendations, completed-period reports, frozen monthly source snapshots, private latest-PDF retention, hosted end-to-end proof, capacity/security validation, and the final browser release gate are complete. **Phase 20 - Personalized Training Programs - is next.**

The completed Phase 19 release includes completed-period Reports UI, idempotent frozen monthly source snapshots, deterministic development QA, real `pdf-lib` PDF generation, hosted workout-to-report E2E validation, verified private latest-PDF retention with short-lived signed downloads, and measured capacity/security validation. Long-term structured snapshots plus latest-only PDF retention remain the shipped retention contract; destructive workout-history cleanup is deferred.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the milestone view and completed Phase 19 release and Phase 20 next milestone.

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

Phase 19 report validation included the training-report model, service, hook, screen, QA-fixture, and PDF tests. The synthetic stress fixture also re-opens its generated PDF with `pdf-lib` and requires at least three pages, so pagination is tested rather than only the PDF file signature.

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
