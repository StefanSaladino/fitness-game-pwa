# Changelog

## Unreleased — Phase 15.2 foundation + CI reliability

- Added Phase 15.2C1's authenticated `platform-capacity-supabase` Edge Function and browser-neutral Supabase Management capacity adapter.
- Kept Supabase billing telemetry explicitly organization-scoped and split cached egress, Realtime messages, and Realtime peak connections into unambiguous metric identities before UI implementation.
- Re-authorized Edge requests through `public.get_my_platform_access()` and preserved administrator non-disclosure with a generic 404 for unauthorized callers.
- Locked the Management API PAT and organization slug to server-side Edge Function secrets; no provider credential is committed or exposed through Vite/browser code.
- Used only documented Supabase organization/entitlements Management API surfaces for capability checks and never forwards raw provider payloads to the PWA.
- Marked provider billing-cycle MAU/egress/Realtime totals UNAVAILABLE because Supabase does not currently document a stable machine-readable billing usage endpoint; no Dashboard scraping, Auth-log reconstruction, hard-coded plan quota, or fake zero is used.
- Marked Phase 15.2C2 blocked on a documented provider billing-usage API/export and advanced independent Phase 15.2D Netlify provider work to NEXT.
- No Edge Function was deployed, no Supabase migration was added, and no real platform administrator or provider secret was created by this patch.
- Added Phase 15.2B private capacity allowance storage plus append-only normalized telemetry snapshots.
- Added active-platform-admin-only current, snapshot-capture, and bounded history RPCs, each re-authorizing through `private.require_active_platform_admin()`.
- Added six database-local operational metrics: database bytes, Storage bytes/object count, current Postgres connections, total Auth users, and 30-day recent sign-ins.
- Kept local Auth counts explicitly separate from Supabase provider-authoritative billable MAU and left unknown allowances null rather than inventing quota values.
- Applied hosted migration `20260822040727_platform_capacity_local_telemetry` and validated the Phase 15.2B authorization/history boundary with 42 rollback-safe pgTAP assertions.
- Left production capacity history empty: no real platform administrator, allowance row, or snapshot was bootstrapped/seeded by the migration or test run.
- Advanced Phase 15.2C Supabase provider quota adapter to NEXT.
- Added Phase 15.2A pure capacity semantics and provider-neutral telemetry contracts with 60% WATCH / 75% WARNING / 85% CRITICAL planning bands.
- Locked `/platform-admin` and `/platform-admin/capacity`, ACTIVE-platform-admin authorization, generic unknown-route fallback for unauthorized authenticated callers, and database-side `private.require_active_platform_admin()` enforcement.
- Reserved `/settings` as the ordinary authenticated Profile/Settings surface and the only discoverable in-PWA admin entry, shown only to positively confirmed ACTIVE platform administrators.
- Locked the Profile/Settings information architecture and server-persisted notification master/category preferences, with browser permission and device push subscriptions treated separately.
- Repaired GitHub CI so application, browser, and database gates run independently under Node 24 using `npm ci`.
- Added a tracked non-secret `supabase/config.toml` with PostgreSQL major version 17 to match the hosted project.
- Added a cross-platform canonical database-test runner that selects only `supabase/tests/*.test.sql`; the historical `_all-hosted-tests.sql` aggregate is replaced by a one-plan compatibility sentinel so it can no longer emit multiple TAP plans.
- GitHub database CI still uses Docker on the hosted runner, while Docker remains optional and unnecessary for the normal developer workflow that validates database changes against hosted Supabase.
- No scoring, XP, badge-award, ranking, workout, or ordinary-user behavior changed.

## v0.13.0 — Phase 15.1 platform-admin authorization + audit foundation

- Added a platform-admin authorization model completely separate from group OWNER / ADMIN roles.
- Added private operational account state and private platform-admin membership without client-controlled admin claims.
- Added a one-time operator-only first-admin bootstrap and guarded authenticated grant/revoke RPCs.
- Added append-only platform-admin audit history with actor, target, reason, timestamp, and before/after state.
- Protected the final active platform administrator from revocation, suspension-state transition, and profile deletion.
- Added pgTAP coverage for admin, normal-user, suspended-admin, unauthenticated, direct-private-access, final-admin, and audit-immutability boundaries.
- Lazy-loaded authenticated product sections from direct controller modules and moved Vite 8 chunk configuration to Rolldown's supported `codeSplitting` API.
- Removed the groups barrel from the initial app path so group administration remains a true lazy chunk without an ineffective-dynamic-import build warning.
- Added a production build gate that fails if any emitted JavaScript chunk exceeds 500 kB.
- Added a generated asset manifest plus service-worker precaching of every emitted lazy app asset, with Chromium E2E coverage, so code splitting does not regress installed-PWA offline availability.
- Added the page-by-page mobile-first visual overhaul as Phase 16 and moved public-release hardening to Phase 17.
- Expanded Phase 16 with reserved badge-display space plus a dedicated badge visual-design/asset implementation slice before the final visual integration gate.
- No scoring, XP, workout persistence, progression, cardio, or social behavior changed.

## v0.12.1 — Phase 13B weekly/monthly lifting summaries

- Added a focused authenticated calendar-summary RPC over completed strength sessions instead of N per-exercise history requests.
- Added bounded weekly/monthly buckets with zero-activity periods so trend context remains calendar-accurate.
- Added personal session, exercise, completed-working-set, analytics-only volume, and PR counts.
- PR counts reuse authoritative progression observations and exclude baseline observations.
- Calendar anchoring uses the signed-in user's profile timezone.
- Added current-versus-previous week/month deltas plus weekly and monthly volume charts.
- Kept calendar-summary failure isolated from existing per-exercise analytics.
- Added pgTAP, service, pure analytics, hook, component, integration, and responsive E2E coverage.
- No scoring/XP, workout-write, social-comparison, or per-exercise progression behavior changed.

## v0.12.0 — Phase 13A per-exercise lifting analytics

- Added pure per-exercise analytics derivation over the existing authoritative progress history read model.
- Added lift-by-lift e1RM/bodyweight-rep trend charts without changing progression calculations.
- Added per-session and total volume analytics while keeping volume completely outside XP/scoring.
- Added best working-set weight, best reps, exercise-frequency context, and a dedicated PR timeline.
- Preserved added-weight/assisted bodyweight work as analytics-only rather than mixing it into plain-bodyweight progression.
- Added responsive Progress-screen browser coverage across desktop Chromium, Android Chromium, and iPhone-class WebKit.
- No Supabase migration, scoring, XP, cardio, social, or workout-write behavior changed.

## v0.11.3 — Phase 12D mobile PWA validation

- Added Android-class Chromium to the Playwright matrix while retaining iPhone/WebKit coverage.
- Mobile foreground and pageshow events now wake the persisted mutation retry scheduler without bypassing retry/conflict policy.
- PWA lifecycle state refreshes connectivity, standalone mode, platform identity, and storage-persistence state after resume.
- Added iOS Home Screen guidance without pretending `beforeinstallprompt` exists on iOS-class browsers.
- Added best-effort versus persistent storage reporting and an explicit persistent-storage request for installed apps when supported.
- Added mobile lifecycle/storage unit coverage and iOS/Android-specific browser assertions.
- Documented storage eviction limits and a physical-device release checklist for installed iOS/Android PWAs.
- No database migration, scoring, XP, progression, cardio, or social behavior changed.

## v0.11.2 — Phase 12C reconnect + retry hardening

- Added bounded exponential automatic retry for retryable IndexedDB-backed workout mutations.
- Persisted retry timing continues across app restart using the existing queue-v1 attempt metadata.
- Automatic replay stops after four failed attempts and exposes the existing explicit Retry sync recovery path.
- Manual retry preserves the original idempotency key and persists its reset retry state before network replay.
- Pending legacy/high-attempt items normalize to blocked on hydration rather than remaining silently stuck.
- Conflict items remain outside automatic retry and continue to require the explicit server-version decision.
- Reconnect now orders queue replay before authoritative server rereads, with another reconciliation after later successful replay.
- Added app-restart integration coverage proving an ambiguous committed mutation does not duplicate server effects.
- No database migration, scoring, XP, progression, cardio, or social behavior changed.

## v0.11.1 — Phase 12B offline shell + install UX

- Upgraded the service worker to precache the production app shell and built same-origin assets on first install.
- Limited shell caching to same-origin application resources so Supabase/auth/data responses are never cached by the PWA shell.
- Added versioned cache cleanup and user-controlled service-worker update activation instead of automatic reloads.
- Added a compact global offline/install/update status surface with standalone-mode detection.
- Added browser-driven install prompting where supported and suppresses the affordance once installed.
- Added desktop/mobile Playwright coverage proving the production app reloads from the cached shell while offline.
- No database migration, reconnect/backoff changes, or scoring/XP behavior changed.

## v0.11.0 — Phase 12A IndexedDB workout durability

- Moved active-workout recovery persistence to asynchronous IndexedDB storage.
- Moved the durable workout mutation queue to the same IndexedDB database while preserving v1 queue/idempotency contracts.
- Added one-time migration from the existing v1 localStorage recovery and mutation keys; legacy keys are removed only after a successful IndexedDB write.
- Added a hydration gate so remote read failures cannot win a race against local durable-state recovery during offline refresh/startup.
- Queue writes are awaited before an offline mutation is reported as queued, preserving the existing "persist before replay" guarantee.
- Added browser fallback to the historical localStorage keys only when IndexedDB is unavailable or rejects a write.
- Added native-browser E2E coverage proving migration, reload persistence, queue ordering/idempotency identity, and explicit clearing.
- No database migration, scoring, XP, progression, cardio, or social behavior changed.

## v0.5.2 — Phase 6.4B idempotent workout mutation queue

- Added a durable per-user FIFO queue for workout-capture mutations.
- Added explicit UUID idempotency keys and PostgreSQL mutation receipts so ambiguous retries cannot duplicate workout data.
- Added the single `apply_lifting_workout_mutation` gateway for queued exercise/set writes.
- Added retryable transport/server failure classification while treating authorization/validation failures as terminal.
- Existing set edits can now enqueue safely while offline; structural/lifecycle actions remain gated until conflict safety is implemented.
- Reconnect replays pending writes in order and re-reads authoritative exercise/set state after successful replay.
- Added client unit/hook coverage and pgTAP duplicate-replay coverage.
- No scoring, XP, progression, or conflict-merge rules changed.

## v0.5.1 — Phase 6.4A local active-workout recovery

- Added a versioned local recovery snapshot separate from Supabase row shapes.
- Persisted the active session, exercise order, canonical set rows, display unit, and unsaved set-entry drafts.
- Active workouts now render from the local snapshot immediately after refresh/app restart while remote reads reconcile.
- Offline/local-only/recovering states are explicit in the workout controller and visible in the active-workout surface.
- Existing set drafts remain editable while offline; server-only mutations are gated until the server copy is available.
- Reconnect triggers one read-only reconciliation attempt for the session, exercises, sets, and picker catalogue.
- Corrupt/cross-user local snapshots are discarded safely and localStorage failures never block the authoritative workout flow.
- No mutation queue, conflict engine, database migration, or lifting-v1 scoring changes were introduced.

## v0.5.0 — Phase 6.3 per-set workout logging

- Added independent persisted set rows for every workout exercise.
- Added warmup/working set entry with per-set weight and reps.
- Added plain, added-weight, and assisted bodyweight modes without conflating progression identities.
- Added complete/reopen, copy-last, copy-row, delete, and dense set ordering.
- Added kg/lb display conversion while keeping kilograms canonical in storage.
- Moved workout-set writes behind authenticated active-workout RPCs.
- Added pgTAP, service, hook, conversion, component, and workout-screen regression coverage.
- No lifting-v1 XP award logic changed in this phase.

## 0.4.5 — Picker drill-down + timer intent synchronization

- Changed muscle-group icons from toggle filters into exercise-library navigation destinations.
- Added dedicated muscle-group screens with workout-type narrowing and in-group search.
- Kept a separate Search all exercises path across the entire canonical catalogue.
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
- weekly goal snapshots
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