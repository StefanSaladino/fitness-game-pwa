# Changelog

## v0.3.0 — lifting-first foundation

- Reframed the product from general fitness consistency to a lifting-progression game.
- Locked `lifting-v1`: 50 lifting-workout XP, up to 30 exercise XP, up to 30 progression XP, up to 15 cardio bonus XP, and a 125 daily cap.
- Made first valid exercise performance baseline-only and removed the v0.2 account-age gate, two-observation calibration, cooldown, and weekly-improvement XP.
- Changed weekly-target semantics to lifting days; cardio does not satisfy the weekly lifting target.
- Added canonical-exercise completion scoring and weighted/bodyweight progression rules.
- Added `scoring_events`, `exercise_progress_observations`, and `exercise_progress` persistence foundations plus explicit lifting/cardio qualification flags.
- Kept v0.2 XP/performance tables as migration-safe legacy structures only.
- Added CSS separation-of-concerns rules and split global tokens/reset/base from the legacy stylesheet entrypoint.
- Updated onboarding copy to describe lifting-day targets and the new scoring model.

## Phase 5.3A — production authentication + onboarding UI (unreleased)

- Added responsive production sign-in, account creation, email-verification, forgot-password, and reset-password presentation.
- Added `useAuthActions` so auth forms do not call Supabase services directly.
- Added generic user-facing Auth error mapping instead of exposing raw provider/database messages.
- Added a persisted profile gate after session restoration.
- Added production onboarding for username, display name, timezone, and 1–7 day weekly target.
- Added `useOnboarding` to load and refresh authoritative profile state around the atomic onboarding RPC.
- Added responsive phone/desktop onboarding layout and weekly-target picker.
- Added validation, component, hook, and browser-shell regression coverage.

## Phase 5.2 — shared UI foundation (unreleased)

- Approved phone, desktop, and future smartwatch visual directions.
- Added design tokens and responsive phone/tablet/desktop contracts.
- Added reusable Button, Card, ProgressBar, TextField, SelectField, and Icon primitives.
- Added AppShell, DesktopSidebar, MobileNav, PageHeader, and one shared navigation model.
- Added component-level accessibility/interaction tests.
- Kept Nutrition and calorie tracking out of implementation despite generated concept imagery.
- Documented that smartwatch support remains a separate future native companion.

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
