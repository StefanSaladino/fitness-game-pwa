# Changelog

## Unreleased - Phase 20.5 adaptive progression

- Added `training-program-adaptation-v1` deterministic future-prescription adaptation driven only by completed linked workout evidence.
- Added append-only adaptation/audit tables with owner RLS, idempotent trigger-workout uniqueness, source/result revision tracking, compact evidence snapshots, and per-field old/new change rows.
- Added conservative double progression: establish an open weighted target from successful standard work, progress load only after all required standard sets reach the top of the rep range, and never auto-reduce load after one poor workout.
- Added plain-bodyweight rep-range progression while deferring automatic added-weight/assisted bodyweight progression.
- Reused the existing `muscle-volume-v2` performance-aware seven-day recommendation engine for bounded future set changes instead of creating another volume model.
- Advanced set edits do not automatically drive load/rep progression.
- Adaptation mutates only later unstarted `PLANNED` prescriptions; completed, started, missed, and ordinary workout evidence remain untouched.
- Added persisted `NO_CHANGE` evaluations so retrying the same completed workout cannot progress a program twice.
- Added a guarded optimistic-revision apply RPC plus an invoker-mode adaptation-context read boundary.
- Hosted end-to-end validation confirmed a completed 100 kg x 8 squat trigger remained unchanged while three future 100 kg prescriptions advanced once to 102.5 kg.

## Unreleased - Phase 20.4 durable program persistence

- Added RLS-protected persistent program, planned-workout, and program-exercise tables.
- Added immutable generation-source snapshot storage and one-active-program-per-user lifecycle enforcement.
- Added atomic guarded program creation with catalogue, bodyweight capability, `muscle-volume-v2`, order, and Superset validation.
- Added programmed-workout launch through the existing preset-start workout boundary.
- Planned working-set counts and optional starting load/bodyweight mode are copied into ordinary editable workout sets; planned rep ranges do not masquerade as completed reps.
- Added explicit started/completed programmed and own-workout lineage plus missed planned-session state.
- Ordinary workout completion automatically finalizes linked program lineage; cancellation returns an in-progress planned slot to `PLANNED`.
- Added a client persistence service for create/read/lifecycle/launch/own-workout/missed operations.
- Phase 20.5 remains responsible for append-only adaptive program revisions.

## Unreleased - Phase 20.3A program configuration and scheduling

- Expanded `training-program-v1` from fixed 4-week generation to explicit 4- or 8-week duration.
- Added deterministic date-only scheduling from a user-selected start date and exact training weekdays.
- Added a frequency-compatible split registry with Auto plus explicit Full Body, Upper/Lower, PPL, and mixed variants.
- Generator source snapshots now retain duration, start date, normalized weekdays, requested split, and resolved split.
- Every planned workout now carries an exact scheduled calendar date.
- Eight-week generation preserves the baseline structure without pretending Phase 20.5 adaptive progression has already occurred.
- Formalized planned-vs-actual lineage for programmed workouts, own workouts, and missed planned sessions while keeping actual workout history authoritative.
- No database migration was added; Phase 20.4 owns durable program-instance persistence.

## Unreleased - Phase 20.3 exercise constraints and substitutions

- Added independently revisioned per-user exercise constraints with hard `EXCLUDE` and soft `PREFER` semantics.
- Added bounded reasons for preference, physical-limitation intent, unavailable exercises, and other exclusion intent without storing diagnosis text.
- Added RLS-protected constraint persistence and guarded optimistic-revision RPCs.
- Exercise catalogue foreign keys use delete restriction so catalogue deletion cannot silently mutate a users constraint revision.
- Generator hard exclusions are applied before ranking; compatible preferences are a bounded ranking signal.
- Fixed the v2 generator boundary so broad `BACK`/`SHOULDERS` picker taxonomy does not exclude granular back/deltoid candidates.
- Generated prescriptions now retain granular target muscle, direct/indirect contribution role, and compound/accessory selection intent.
- Added deterministic fail-closed substitution preserving v2 target, contribution role, selection intent, measurement/bodyweight mode, equipment access, and hard exclusions.
- Program source snapshots now record the real independent constraint revision.
- User-facing constraint/substitution controls remain deferred to the Phase 20 UI slice.

## Unreleased - Phase 19.10 muscle-volume-v2

- Kept BACK and SHOULDERS as human-facing exercise/workout categories while splitting volume analytics into lats, upper back, traps, spinal erectors, front delts, side delts, and rear delts.
- Seeded muscle-volume-v2 as an inactive methodology so production remains on v1 until compatible client code is deployed.
- Preserved all 568 exercise rules and 418 eligible exercises; v2 contains 825 reviewed contribution rows and no broad BACK/SHOULDERS volume rows.
- Added independent subgroup benchmark calibration with conservative evidence-confidence labels.
- Preserved legacy muscle-volume-v1 report readability.
- Updated Phase 20 generator internals to consume granular muscle targets while retaining conventional Full Body, Upper/Lower, Push/Pull/Legs session names.

## Unreleased - Phase 20.2 personalized program generator

- Added nullable explicit `STRENGTH` / `HYPERTROPHY` / `BALANCED` program goal and 1-6 requested sessions/week to the shared revisioned training-program profile.
- Added a guarded generator-candidate RPC returning the locked 512 normally loggable active exercises plus `muscle-volume-v1` eligibility/contribution metadata.
- Added a conservative explicit exercise-to-equipment resolver; unrepresented equipment requirements fail closed.
- Added a deterministic four-week generator with 1-6 day split structures, equipment filtering, conventional/familiar exercise preference, Phase 19 volume-signal set adjustments, and no random swaps.
- Same-exercise target weight is reused only from sufficiently established observed history when the reference set already matches the generated repetition range; sparse history leaves load open.
- Generator muscle-slot selection uses only Phase-19-eligible candidates and does not duplicate `muscle-volume-v1`.
- Generated program persistence remains Phase 20.4; exclusions/substitutions remain Phase 20.3.

## Unreleased â€” Phase 20.1 equipment/access profile

- Added an explicit personalized-program access profile with `COMMERCIAL_GYM` and `CUSTOM` modes; an absent profile remains unconfigured rather than silently assuming full-gym access.
- Added the source-controlled equipment taxonomy covering dumbbells, barbell/rack/bench, pull-up/dip stations, cables, machines, bands, kettlebells, landmine, rings, plyometric box, GHD/back-extension equipment, medicine ball, specialty bars, and strongman equipment.
- Added a user-owned `training_program_profiles` persistence boundary with RLS, read-only browser table access, active-account RPC writes, normalized equipment keys, and optimistic revision conflict protection.
- Added Settings â†’ Training equipment/access editing with bodyweight-only custom setups supported and commercial-gym assumptions kept separate from specialty/strongman equipment.
- Locked the 2026-09-22 generator-loggability audit at 568 active exercises / 512 `WEIGHT_REPS` or `BODYWEIGHT_REPS` exercises / 56 deferred by the current logging model.
- Kept Bands (0/15 generator-loggable) and Medicine Ball (0/8) profile-selectable but generator-ineligible instead of misrepresenting their resistance as weight or bodyweight load.
- No Phase 20.1 change alters `lifting-v1`, `muscle-volume-v1`, XP, workout history, or exercise progression.
## Unreleased â€” Phase 20.0 personalized-program foundation

- Locked `training-program-v1` as a deterministic four-week planning/template layer that launches into the ordinary lifting workflow rather than creating a second workout system.
- Added a pure TypeScript program-definition contract and validator for 1â€“6 sessions/week, four program weeks, the existing 8-exercise/session launch limit, canonical exercise uniqueness/order, rep/set ranges, bodyweight load modes, and optional Superset structure.
- Limited v1 generated prescriptions to currently loggable `WEIGHT_REPS` / `BODYWEIGHT_REPS` exercises; `DURATION` / `OTHER` remain excluded until normal set-completion semantics exist.
- Locked physical-limitation/injury input as exclusion intent only: no diagnosis, rehabilitation protocol, pain interpretation, or claim that a substitute is medically safe.
- Locked Phase 19 volume/performance read models as program inputs rather than duplicating hypertrophy-volume or progression methodology.
- Defined planned persistence responsibilities for program profile, explicit constraints, generated program/workout/exercise templates, source snapshots, and append-only adaptation history.
- Identified the current BAND catalogue gap as a Phase 20.1 prerequisite: all 15 active BAND exercises are `OTHER`, so band-only program generation must remain disabled until the logging model is reconciled.
## v1.1.1 - Exercise Catalogue and Load Capability Maintenance

- Reconciled the source-controlled exercise catalogue with the hosted 568-exercise state and retained explicit `muscle-volume-v1` coverage for every active canonical exercise.
- Added per-exercise `supports_added_weight` and `supports_assisted` capability flags for `BODYWEIGHT_REPS` movements and enforced those capabilities in both the set editor and guarded save RPC.
- Kept rep-based plyometrics loggable as bodyweight or added-load sets while removing nonsensical Assisted choices from plyometric movements.
- Refreshed the Phase 19 exercise-muscle matrix to 568 exercises / 418 eligible / 150 excluded-deferred with 781 contribution rows and updated the validator to lock those counts.
- Regenerated checked-in Supabase TypeScript types and documented the bodyweight load-capability model and current catalogue snapshot.
- Tightened the Phase 19.3B pgTAP reconciliation test from a minimum-count assertion to the exact locked 568-exercise catalogue count.
- No v1.1.1 maintenance change alters the authoritative `lifting-v1` XP/scoring model or the `muscle-volume-v1` contribution methodology.
## v1.1.0 - Phase 19 Muscle Volume Intelligence

- Added the versioned `muscle-volume-v1` effective-volume methodology, reviewed exercise-to-muscle contribution matrix, personalized set-quality confidence, and rolling 7/28-day read model.
- Added Progress Training Volume plus performance-aware volume recommendations and bounded next-7-day corrective plans.
- Added completed weekly/monthly Reports with exact completed-period semantics and frozen, fingerprinted monthly structured source snapshots.
- Added real multi-page monthly PDFs with deterministic QA/stress coverage and private latest-PDF retention in Supabase Storage.
- Verified the hosted workout -> volume/performance -> frozen snapshot -> report UI -> PDF chain using an authorized disposable QA account.
- Verified retained-PDF reuse: repeated download of the same completed month leaves one artifact row and one private Storage object.
- Hardened PDF promotion/cleanup behind `report_private` SECURITY DEFINER helpers with public SECURITY INVOKER wrappers and reviewed hosted advisors.
- Completed hosted capacity/retention measurement and retained long-term compact monthly snapshots plus latest-only PDFs without introducing destructive workout-history cleanup.
- Recorded current Supabase Free-plan provider usage with all visible Phase 19 capacity signals comfortably below quota.
- Added browser-level Reports regression coverage for exact UTF-8 navigation/date presentation and responsive visual-audit coverage.
- Final release validation passed the normal browser suite, the Reports regression across all three configured browser projects, the 36-case Reports responsive visual audit, and the hosted Phase 19.9 pgTAP/security checks.
- No Phase 19 change alters the authoritative `lifting-v1` XP/scoring model.

## Unreleased — Phase 17 test infrastructure cleanup

- Removed the unsupported Docker/local-Supabase test runner and its package alias.
- Retired unreachable legacy/no-op structural validators and the historical hosted-test sentinel.
- Separated the normal behavioral Playwright suite from the dedicated visual matrix and 44-case Chromium admin geometry suite.
- Kept canonical pgTAP discovery, transaction/plan/rollback structure, and security-critical migration/service boundaries in the repository database gate.
- Stopped JavaScript validators from duplicating exact pgTAP plan counts and assertion prose; hosted rollback-safe SQL execution remains authoritative for database behavior.
- Aligned CI and Supabase documentation with the supported hosted-only database workflow and current full local acceptance gate.
- Added no product, scoring, authorization, persistence, migration, Edge Function, or hosted-environment change.

## Unreleased — Phase 15.9 recipient inbox deletion + member-only group chat

- Added recipient-only deletion for received platform messages without rewriting shared message content, other deliveries, revision history, or administrator audit.
- Required the current acknowledgement-required revision to be acknowledged before inbox deletion.
- Added a dedicated Groups Chat tab with a persistent plain-text composer, cursor-paginated conversation, emoji reactions, live refresh, and explicit delete confirmation.
- Added author self-delete plus group OWNER/ADMIN moderation using body-free retained tombstones.
- Kept chat separate from the automated Competition activity feed and completely outside scoring, XP, badges, rankings, and workout privacy.
- Added RPC-only public chat tables with RLS, explicit direct-table denial, private Realtime membership authorization, content-free Broadcast invalidation, duplicate protection, and a ten-message rolling-minute rate limit.
- Added covering indexes for both group-chat reaction foreign keys after the hosted Performance advisor identified the missing access paths.
- Added focused service/component coverage, 27 inbox-deletion pgTAP assertions, 45 group-chat pgTAP assertions, and static database/composition regression guards.
- Applied and recorded the three hosted migrations, passed 27/27 plus 45/45 rollback-safe pgTAP, regenerated hosted TypeScript database types, and reviewed Security/Performance advisors.
- Made no Realtime setting change, application deployment, GitHub push, or secret change; public-channel access still requires an operator Dashboard check before release.

## Unreleased — Phase 16.10A application-composition reset

- Established one authenticated shell gutter, content-width, scroll-owner, mobile scrollbar, and horizontal-overflow contract.
- Replaced browser-default selects with one accessible app-owned control: desktop popover, mobile bottom sheet, long-list search, and retained native form semantics.
- Rebuilt Home into bounded training, weekly status, history/progression, consistency, and group-rank regions; retired the oversized plate-banner hero composition.
- Rebuilt Settings as a category index with focused drill-in panels while preserving all profile, training, notification, security, group, privacy, app-status, and conditional administrator behavior.
- Rebuilt the Lift start and active-session hierarchy around contained task surfaces; removed the decorative workout banner and consolidated timer/session/sync context into one mobile task rail.
- Reworked phone set logging into one bounded vertical list with labeled fields, touch-sized controls, and verified 320px containment without horizontal scrolling.
- Made the exercise picker an opaque full-height mobile route with substantial Recent/Browse/result-group regions, focus containment/restoration, Escape back/close behavior, and locked background scroll.
- Added explicit, focus-managed Finish and Cancel confirmation sheets while retaining the existing lifecycle RPC and terminal-race protections.
- Rebuilt Progress into contained identity, calendar summary, tracked-lift, selected-lift, trend, milestone, and session-history regions; retired its oversized photo hero composition and added 320px chart/list containment.
- Rebuilt Cardio around one primary accessory quick-log task with separate summary and recent-history surfaces, touch-sized activity choices/actions, and 320px row reflow.
- Rebuilt Groups around one selected-group context plus focused Members, Invites, and Settings views; replaced the horizontal group rail with the shared app selector and retained role-gated member/invite actions.
- Split Competition into Standings and Activity views, retained a pinned current-user standing and privacy boundary, and contained leaderboard, feed, reaction, and report rows at 320px.
- Compressed the mobile authentication brand region so sign-in, registration, recovery, verification, configuration, and password-reset tasks remain immediately actionable without removing the photographic identity.
- Rebuilt onboarding as focused Identity, Training preferences, and Goal steps with per-step validation and a safe-area-aware mobile action rail while retaining one atomic profile submission.
- Aligned public legal pages and every platform-administration surface with the Top Set charcoal/orange composition system, one-pane phone/two-pane desktop workspaces, and non-scrolling mobile filters.
- Added shared bounded application-state geometry, moved PWA notices to one top notice language, and moved platform messages behind an app-chrome inbox trigger plus mobile sheet/desktop dialog instead of a competing unread bottom banner.
- Added deterministic Auth/Onboarding/Legal/Admin browser fixtures and explicit 320px horizontal-overflow coverage.
- Added a shared compact destination-banner system using existing optimized imagery on Home, Lift start, Cardio, Progress, Groups, and Compete while keeping focused task/operational screens image-free.
- Added canonical direct product paths, retained legacy query-link redirects, and corrected same-path query navigation.
- Moved Messages into explicit mobile/desktop shell slots, kept Settings unobscured, and added a one-tap mobile Sign out action plus a visible Settings account action.
- Renamed the admin landing surface to Overview, labeled its guarded Supabase RPC data as connected, and deferred Netlify invocation until explicitly enabled.
- Repaired the reported Playwright failures by aligning the workout fixture state with its completion-control assertion and updating stale PWA product copy.
- Added component and structural regression coverage plus a documented route-by-route cumulative migration queue.
- Added no scoring, authorization, persistence, database, Edge Function, hosted-environment, or release-version change.

### Earlier unreleased platform work

- Added a private, durable user-report and moderation-case queue without inventing a browser-only moderator role.
- Added active-account report submission with self-report protection, required category/reason, rolling rate limits, normalized duplicate protection, and current group/workout/social-activity reference validation.
- Added ACTIVE-platform-admin-only paginated queue/detail reads, assignment, append-only notes/events, and terminal RESOLVED/DISMISSED transitions.
- Kept reporter identity private from the target while retaining bounded identity snapshots across later account deletion.
- Defined a minimum two-year closed-case retention boundary and deferred any operator purge/legal-hold workflow.
- Added 88 rollback-safe pgTAP assertions plus ordinary-user and moderator TypeScript service coverage.
- Added no report UI, activity-review UI, message source, Edge Function, secret, scoring/XP change, or Docker requirement.

### Phase 15.3D user administration

- Added the approved ACTIVE-platform-admin-only `/platform-admin/users` directory and account-detail workflow.
- Added search, explicit account-state filters, pagination, bounded account metadata, and shared Capacity/Users administration navigation.
- Added audited suspend, restore, deletion-request, deletion-cancellation, and exact-confirmation irreversible-deletion dialogs over the existing server boundaries.
- Kept current-admin and platform-admin deletion safeguards visible while leaving the server authoritative for every transition and group-ownership block.
- Added stale-request protection, duplicate-mutation prevention, focus management, live announcements, mobile/desktop layouts, and responsive browser coverage.
- Reserved user reporting, privacy-bounded activity investigation, and individual/group/all-user administrator messaging for later server-backed, audited slices.
- Added no migration, Edge Function, provider secret, scoring change, or Docker requirement.

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
- GitHub database CI uses the non-Docker repository contract gate; runtime migration and pgTAP validation remain hosted-Supabase authoritative.
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
