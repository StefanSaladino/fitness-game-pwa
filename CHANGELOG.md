# Changelog

## Phase 5.1 — onboarding foundation (unreleased)

- Added required visual-design gate before substantial UI implementation.
- Added atomic username-aware onboarding migration.
- Added onboarding validation, state, and Supabase service layers.
- Added TypeScript and pgTAP coverage for onboarding identity rules.
- Preserved Vitest/Playwright separation and deterministic auth-shell testing.
- Expanded the canonical exercise seed catalogue.


## v0.2.0 — Phase 4 foundation

Added:

- detailed onboarding README and roadmap
- Supabase setup/architecture/database/testing/domain documentation
- expandable many-to-many group schema
- owner/admin/member controls and invite RPCs
- profiles and one-time onboarding RPC
- pending weekly target scheduling foundation
- workout/exercise/set persistence
- database-derived workout qualification
- XP ledger and performance benchmark/observation infrastructure
- Row Level Security and restricted grants
- email/password Auth UI foundation
- forgot-password and reset-password flow
- pgTAP schema/RLS/group/qualification/onboarding tests
- project structural validation script
- GitHub Actions database validation job

Not yet implemented:

- workout product UI
- authoritative persisted base/performance XP reconciliation
- benchmark generation from workout metrics
- weekly target activation job/function
- badges
- group leaderboard/activity feed
- offline IndexedDB workout persistence

## v0.2.1 — Environment safety/documentation

- Strengthened `.gitignore` to exclude all real environment files and common private-key formats while retaining sanitized `*.example` templates.
- Updated `.env.example` for the hosted Supabase Dashboard workflow.
- Added `docs/ENVIRONMENT.md` with exact local/deployment variables and secret-handling rules.
- Clarified that Supabase secret/service-role keys, database URLs, and database passwords must never enter the React/Vite environment.
