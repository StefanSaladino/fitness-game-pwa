# Changelog

## 0.4.5 — Picker drill-down + timer intent synchronization

- Changed muscle-group icons from toggle filters into exercise-library navigation destinations.
- Added dedicated muscle-group screens with workout-type narrowing and in-group search.
- Kept a separate Search all exercises path across the canonical catalogue.
- Added explicit back navigation from picker detail screens.
- Added immediate start/resume display timing and exact click-time pause freezing.
- Added intent-aware start/pause/resume RPCs that exclude ordinary request latency from persisted workout time.
- Lifecycle RPCs now return their session snapshot directly to remove a second network round trip.
- Clarified Phase 6.3 set tracking: every set has independent weight/reps/type/completion values.
- No scoring changes.

## 0.4.4 — Targeted group invitations

- Replaced reusable group join codes with recipient-specific invitations.
- Owners/admins can invite by username or stable `FG-...` profile invite ID.
- Added pending invitation inbox with Accept and Decline actions.
- Accept, decline, and revoke remove the invitation row immediately.
- Added stable profile invite IDs and surfaced them in group/setup UI.
- Removed the active token/URL join path and blocked direct browser invite-table writes.
- Updated integration, group, permission, and pgTAP coverage for the new lifecycle.

## 0.4.3 — Phase 6.1C.1 muscle-group icon filter + picker/timer fixes

- Replaced the muscle-group dropdown with accessible icon + visible-label toggle controls.
- Added optimized transparent muscle assets for the targeted muscle groups, including Core/Abs and Obliques.
- Added explicit `OBLIQUES` catalogue taxonomy with a small migration for rotational/side-core exercises.
- Kept workout-type filtering text-first and preserved two-axis filtering.
- Made the exercise picker panel fully opaque while retaining a dimmed translucent backdrop.
- Fixed paused timer double-counting when `last_resumed_at` remains populated after a pause.
- Added regression tests for icon selection, oblique taxonomy, and paused timer display.
- No set-logging or scoring-rule changes.

## 0.4.2 — Phase 6.1C / 6.2 exercise picker and search

- Added a self-contained 356-exercise canonical catalogue migration.
- Added primary muscle-group and workout-type taxonomy metadata.
- Added aliases including RDL/OHP and common equipment abbreviations.
- Added authenticated picker-catalog RPC with user-scoped completed-workout recents.
- Added deterministic local case-insensitive search with conservative typo tolerance.
- Added phone-first picker UI with Muscle Groups / Workout Types browse modes and cross-filters.
- Added duplicate-add presentation, background-scroll lock, and Escape close behavior.
- Kept all new picker styling in `ExercisePicker.module.css`.
- No scoring or set-logging changes.

## 0.4.1 — Phase 6.1B workout exercise composition

- Added authenticated-only add/remove/move RPCs for active workout exercises.
- Added one-canonical-exercise-per-workout and dense ordering invariants.
- Revoked direct authenticated mutation of `workout_exercises`.
- Added ordered exercise composition service/hook boundaries.
- Active workout presentation now renders persisted exercises with move/remove controls.
- Added pgTAP, service, hook, component, and structural regression coverage.

## 0.4.0 — Phase 6.1A active lifting session foundation

- Added idempotent Start Lift and active-session recovery.
- Added persisted pause/resume timer state and server-computed finish/cancel duration.
- Added a one-active-in-app-lift database invariant.
- Revoked direct authenticated workout-session mutation in favor of guarded lifecycle RPCs.
- Added the Workouts product surface and dashboard Start Lift entry point.
- Added service, hook, timer, component, structural, and pgTAP coverage.

## 0.3.6 — Phase 5.7 integration validation

- Added cross-feature integration coverage for onboarding -> group setup -> dashboard and group administration.
- Added create-group and full-invite-URL join journeys with persisted membership refreshes.
- Added owner/member permission-presentation checks across real controllers and hooks.
- Added optional service injection to ProductController and DashboardController without changing production Supabase defaults.
- Added a dedicated `test:integration` command.

## 0.3.5 — Phase 5.6 group administration

- Added multi-group administration UI and product-level Home/Groups navigation.
- Added member, invite, role, removal, leave, rename, and ownership-transfer controls.
- Added explicit authenticated-only EXECUTE permissions for group mutation RPCs.
- Added group-administration tests and colocated CSS Modules.

## 0.3.3 — Phase 5.5C profile pictures

- Added optional upload/replace/remove profile pictures.
- Added `profiles.profile_picture_path` and a public-read `profile-pictures` Storage bucket.
- Restricted Storage mutation to each authenticated user's own UUID folder.
- Added JPEG/PNG/WebP and 2 MiB bucket limits.
- Added reusable PFP + initials fallback components with CSS Modules.
- Added PFP path to group-member identity for future leaderboard/activity rendering.
- No avatar/customization system was introduced.

# Changelog

## 0.3.4 — Phase 5.5D real lifting dashboard

- Replaced the foundation preview with a persisted lifting-first dashboard.
- Added weekly lifting-day progress from qualifying strength sessions.
- Added lifting-v1 weekly XP breakdown, recent lift summaries, and personal-record reads.
- Added a membership-gated group leaderboard RPC over authoritative scoring events.
- Rendered real profile pictures/fallbacks in the dashboard and leaderboard.
- Added a restrained responsive dashboard using colocated CSS Modules only.
- Kept cardio secondary and deliberately avoided inventing a level formula or fake chart data.

## 0.3.2 — Phase 5.5B group setup UI

- Added create-group and join-by-invite production forms.
- Added authenticated group gating after onboarding.
- Added controller-driven create/join transitions backed by the Phase 5.5A service layer.
- Added CSS Modules for all new group UI styling.
- Preserved multi-group architecture and database/RLS ownership boundaries.
- Added component/controller/gate regression tests.


## v0.3.1 — group application foundation

- Added typed multi-group summaries, memberships, invites, and group-role contracts.
- Added pure group-name/invite validation and invite-link normalization.
- Added the Supabase-only group service for list/create/member/invite/join operations.
- Added `useGroups`, `useCreateGroup`, and `useJoinGroup` controller hooks.
- Preserved database-controlled owner creation and RPC-only invite joining.
- Added group service/validation/controller tests without adding group UI or CSS.
- Added profile pictures (not avatars) to the Phase 5.5 roadmap.

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
