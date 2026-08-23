# Phase 15.6D — Settings integration gate

## Status

**IN PROGRESS.**

Phase 15.6D is the release gate for the ordinary authenticated Profile/Settings work delivered by Phases 15.6A–15.6C. It adds no new product behavior, scoring rule, database schema, push-delivery category, or administrator capability.

The purpose of this slice is to prove that the completed Settings behaviors compose correctly across feature boundaries before Phase 16 begins.

## Scope

The gate validates:

- `/settings` remains reachable once profile identity exists even when the user belongs to zero fitness groups;
- profile/training preferences stay behind the existing settings service/RPC boundary;
- the optional-notification master preference can be turned OFF and back ON without losing stored child selections;
- only categories with real delivery behavior expose working category switches;
- required account/security/moderation/ACTION_REQUIRED in-app messages remain visible when optional notifications are disabled;
- device permission/subscription state remains distinct from account notification preferences;
- default/not-requested permission is prompted only after `Enable on this device`;
- granted/subscribed state exposes test-delivery and per-device disable actions;
- denied/blocked and unsupported states do not rewrite the account master preference;
- disabling the current device does not disable another registered device or the account preference;
- Settings exposes Administration only after a positive ACTIVE-platform-admin result;
- direct `/platform-admin/*` access continues to re-authorize independently through the existing admin gate;
- Settings changes do not own or mutate workout qualification, scoring, XP, badge-award, ranking, or historical-workout rules;
- the existing deliberate Phase 15.3C self-deletion request/cancel/exact-confirmation boundary remains intact.

## New integration journey

`tests/integration/settings-integration-journey.test.tsx` composes the real Settings/notification/message-center presentation and hooks with typed in-memory service doubles.

It proves five cross-feature journeys:

1. ordinary Settings renders with zero group memberships and no Administration route clue;
2. notification child selections survive master OFF -> ON while an ACTION_REQUIRED in-app message stays visible;
3. default notification permission is not requested on load and is requested only after the explicit device action;
4. denied and unsupported device states remain separate from account preferences;
5. revoking the current subscribed device can leave another device active without changing the account preference.

Lower-level existing tests continue to prove the individual service/RPC/device behaviors, while the integration journey proves they compose without crossing ownership boundaries.

## Existing evidence retained by this gate

Phase 15.6D intentionally reuses rather than duplicates existing coverage:

- `src/features/settings/SettingsScreen.test.tsx` — profile/training persistence, exact self-deletion confirmation/cancellation, ACTIVE-admin-only discovery, fail-closed admin discovery;
- `src/features/settings/NotificationSettingsSection.test.tsx` — no automatic permission request, master preservation semantics, supported-category honesty, blocked-device behavior;
- `src/features/settings/notificationPreferenceService.test.ts` — typed server-persistence boundary;
- `src/pwa/pushNotificationService.test.ts` — browser permission/subscription lifecycle;
- `tests/integration/platform-admin-security-journey.test.tsx` and `src/features/admin/PlatformAdminRoute.test.tsx` — direct admin-route authorization remains independent of Settings navigation;
- hosted Phase 15.6B/15.6C pgTAP suites — account ownership, delivery suppression, subscription privacy, and server-side delivery authorization.

No new database migration or hosted SQL mutation is required for 15.6D.

## Responsive contract

Phase 15.6D does not redesign Settings. The existing mobile-first Settings CSS and responsive desktop adaptation remain unchanged. The production build and browser gate must remain green at the same application breakpoints before this phase can close. Phase 16 owns the later visual overhaul.

## Documentation reconciliation

The repository's current Supabase documentation was rechecked during this gate.

The supported path is already unambiguous:

- hosted Supabase is the authoritative runtime/database-validation environment;
- `npm run db:test:ci` is repository contract validation only;
- Docker, `supabase start`, local resets, and a local Supabase stack are not part of the supported developer or GitHub Actions workflow;
- legacy local-runner artifacts are retained only for historical structural compatibility.

The previously stale instructions in `supabase/README.md`, `docs/SUPABASE-SETUP.md`, and `docs/VALIDATION.md` have already been removed/reconciled on the Phase 15.6C base tree, so this slice does not churn those files merely to restate the same architecture.

## Exit criteria

Phase 15.6D is complete only when:

- the new Settings integration journey passes;
- all existing unit and integration tests pass;
- production build and bundle budget pass;
- structural and internal validation pass;
- browser E2E passes;
- repository database-contract validation passes;
- no production Settings behavior or authorization boundary had to be weakened to make the gate green.
