# Phase 15.6 — Profile/Settings + notification preferences contract

## Status

**LOCKED; 15.6A–15.6C IMPLEMENTED.**

This document defines the functional architecture for the authenticated `/settings` surface. It is an ordinary user-facing PWA area, not an administrator console, and later visual work must preserve these behaviors.

## Route and access

`/settings` is the canonical authenticated Profile/Settings route.

- it requires an authenticated Supabase session;
- it is available to ordinary users regardless of platform-admin status;
- once the user's profile exists, account settings must not depend on fitness-group membership;
- group membership problems must not prevent a signed-in user from reaching their own account/settings surface;
- administrator discovery inside Settings follows the separate Phase 15.2 authorization contract.

The implementation branches `/settings` from the authenticated/profile boundary before `GroupGate`, while incomplete profile onboarding continues to use the existing onboarding flow.

## Settings information architecture

The mobile-first Profile/Settings surface provides these sections.

### 1. Profile + identity

- profile picture;
- display name;
- username;
- email/account identity;
- timezone;
- weekly lifting target;
- preferred lifting weight unit (`kg` / `lb`) as a persisted account preference;
- account/member-since context when trustworthy source data is available.

Editable identity fields use authoritative service/RPC boundaries rather than writing arbitrary profile columns directly from presentation components.

### 2. Notifications

Notifications are a first-class account setting, not a hidden browser-only preference.

The section exposes a master control:

```text
Notifications  [ON/OFF]
```

The account persists independent optional category preferences for:

- workout reminders;
- weekly goal reminders;
- badges + achievements;
- personal-record alerts;
- group activity;
- group invitations.

A category appears as a working switch only when a real supported delivery behavior exists. Phase 15.6C implements real Web Push delivery for **badges + achievements**, **personal-record alerts**, and **group invitations**. Workout reminders, weekly goal reminders, and generic group activity remain persisted for future explicitly defined behavior, but are shown as unavailable rather than as decorative/fake switches because no reminder timing or generic group-activity push contract has been approved.

### Notification preference semantics

Notification preferences are **account-level server-persisted preferences**. They do not rely only on localStorage, IndexedDB, or a single browser installation.

The master switch is authoritative for optional notification delivery:

- master OFF suppresses all optional notification delivery for the account;
- supported child category controls are disabled while master OFF;
- turning master OFF preserves the user's individual category selections so re-enabling notifications can restore the prior choices;
- master ON does not automatically grant browser/OS notification permission.

Required in-app account, security, moderation, suspension, or ACTION_REQUIRED notices are not optional push/reminder preferences. Disabling optional notifications never hides mandatory in-app account-state or policy messages.

### Device/browser permission is separate

PWA/browser notification capability is device-specific and is represented separately from the account preference.

Supported device states include:

- permission not requested/default;
- permission granted;
- permission denied/blocked;
- notifications unsupported on this device/browser;
- iPhone/iPad browser session that must first be installed to the Home Screen before Web Push permission can be requested.

Rules:

- never auto-prompt for notification permission merely because `/settings` loads;
- request permission only after an explicit user action such as `Enable on this device`;
- denying permission on one device must not silently set the account-level master preference to OFF;
- if account notifications are ON but device permission is blocked, Settings explains that this device cannot currently deliver notifications without implying the account preference changed;
- push subscriptions are device-specific and are registered/revoked independently of the account-level preference;
- multiple authorized devices may each have their own subscription while sharing the same account preferences;
- a browser subscription is re-associated with the currently authenticated account when that same endpoint is presented after an account switch, preventing delivery to a previously signed-in account;
- disabling one device does not disable the account preference or another registered device.

### Push delivery boundary

Phase 15.6C adds a durable server delivery path for supported categories.

- subscription endpoint/key capability data stays in private database state with no direct browser-table access;
- browser callers can only use authenticated self-service registration/revocation/device-summary/test boundaries;
- VAPID private material and the background dispatch credential remain server-side and never enter Vite/browser code;
- the `push-notifications` Edge Function manually verifies ACTIVE user JWTs before returning the public subscription key;
- background queue draining uses a separate server-only dispatch credential because hosted `pg_net`/cron calls do not carry an end-user JWT;
- every actual send re-checks ACTIVE account state plus the current master/category preference so queued optional delivery can still be suppressed before provider dispatch;
- one queued event fans out to independent active devices, with per-device success/expiry/retry state;
- expired provider endpoints are revoked and transient provider failures remain retryable through the hosted queue/cron path;
- service-worker notification clicks accept only same-origin application paths.

### 3. Account + security

- email/account identity;
- change password;
- sign out;
- future active-session/device management only when a trustworthy backend lifecycle exists.

Email-change functionality, when added, must use the provider's verified email-change flow rather than a direct profile-field edit.

### 4. Training preferences

- timezone;
- weekly lifting target;
- preferred `kg` / `lb` display/input unit.

Changing preferences does not rewrite historical authoritative workout/scoring data.

### 5. Groups

- current groups;
- pending invitations;
- navigation to the existing group-management surface.

Settings links to group administration rather than duplicating group OWNER/ADMIN controls.

### 6. Privacy + data

Reserve a clear section for:

- privacy information;
- notification/data preferences;
- future data export;
- self-service account deletion backed by the completed Phase 15.3C lifecycle.

Data export must not appear as a functioning control until its backend exists. The account-deletion backend, retention rules, audit behavior, Storage cleanup, and social/scoring consequences are implemented by Phase 15.3C. The approved 15.6A implementation uses a deliberate request/cancel/exact-confirmation Settings control, the exact server-derived phrase, and the group-ownership transfer requirement.

### 7. App / PWA

Expose useful application status where supported:

- application version;
- installed/standalone state;
- offline/connectivity status;
- update availability / update action;
- relevant storage-persistence status.

This section reuses the existing PWA lifecycle state rather than inventing duplicate status logic.

### 8. Administration — conditional

Only a positively confirmed ACTIVE platform administrator may see the Administration section and its Admin action.

For everyone else—including normal users, group OWNER/ADMIN users, suspended platform admins, loading authorization, or failed access checks—the entire Administration section is absent with no placeholder, disabled control, or route clue.

The Admin action is navigation convenience only. `/platform-admin/*` re-authorizes through `PlatformAdminGate`, and protected RPCs independently enforce `private.require_active_platform_admin()`.

## Persistence and separation of concerns

Profile/Settings presentation components do not call Supabase directly.

Dedicated settings/profile/notification services and hooks ensure:

- account/profile preferences have typed read/update contracts;
- notification preference persistence is separate from browser push-subscription management;
- device permission/subscription code remains PWA/device infrastructure;
- server push dispatch remains separate from browser subscription orchestration;
- group management stays in the Groups feature;
- platform-admin authorization stays in the admin feature;
- scoring, badges, rankings, and workout qualification remain unaffected by settings changes unless a future product rule explicitly says otherwise.

## Notification implementation slices

### 15.6A Profile/Settings foundation — DONE

- implement `/settings`;
- identity/account/training/groups/privacy/app sections;
- profile preference read/update services;
- deliberate two-step self-service deletion UI using `accountDeletionService`, including group-ownership transfer guidance and the exact server-derived confirmation phrase;
- keep group and admin authorization boundaries separate.

### 15.6B Notification preference persistence — DONE

- add server-persisted master and per-category preference state;
- authenticated read/update RPC/service contracts;
- master-off semantics that preserve category selections;
- authorization/RLS tests proving users can manage only their own preferences.

### 15.6C PWA notification permission + delivery integration — DONE

- explicit user-gesture permission request;
- default/granted/denied/unsupported/install-required device states;
- device-specific push subscription lifecycle;
- supported delivery for badge awards, authoritative personal records, and targeted group invitations;
- multi-device behavior and independent device revocation;
- durable server queue with immediate dispatch plus retry path;
- blocked/unsupported-device states do not rewrite account preferences;
- no infrastructure push credentials in the browser;
- persisted unsupported categories remain unavailable rather than becoming fake controls.

### 15.6D Settings integration gate — NEXT

Validate:

- mobile and desktop Settings access;
- settings access without group membership;
- profile preference persistence;
- master notifications ON/OFF behavior;
- every supported category toggle;
- preserved child selections across master OFF -> ON;
- denied/default/granted/unsupported/install-required device permission states;
- no automatic permission prompt on page load;
- multi-device subscription separation;
- explicit per-device test delivery;
- required in-app account/moderation notices remain visible;
- conditional platform-admin discovery;
- no scoring/XP/badge-award regressions from settings changes;
- self-deletion request, cancellation before confirmation, exact confirmation, group-owner blocking, and signed-out/deleted completion behavior.

## Non-negotiable rules

- Notifications have a real user-controlled master ON/OFF switch in Profile/Settings.
- Optional category toggles are independently controllable only when their delivery behavior is real and the master switch is ON.
- Account preferences and device/browser permission are separate states.
- A notification control must not claim to work until the associated delivery behavior exists.
- Disabling optional notifications must never suppress required in-app account/security/moderation notices.
- Push subscription capability data and private server delivery credentials must remain outside direct browser access.
- Profile/Settings changes must not weaken platform-admin authorization or alter scoring rules.
- Self-service deletion UI must reuse the Phase 15.3C server boundary and must never treat a client-only confirmation as authorization.
