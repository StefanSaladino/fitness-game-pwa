# Phase 15.6 — Profile/Settings + notification preferences contract

## Status

**LOCKED; 15.6A IMPLEMENTED.**

This document defines the functional architecture for the authenticated `/settings` surface. It is an ordinary user-facing PWA area, not an administrator console, and later visual work must preserve these behaviors.

## Route and access

`/settings` is the canonical authenticated Profile/Settings route.

- it requires an authenticated Supabase session;
- it is available to ordinary users regardless of platform-admin status;
- once the user's profile exists, account settings must not depend on fitness-group membership;
- group membership problems must not prevent a signed-in user from reaching their own account/settings surface;
- administrator discovery inside Settings follows the separate Phase 15.2 authorization contract.

The eventual implementation should branch `/settings` from the authenticated/profile boundary before `GroupGate`, while incomplete profile onboarding may continue to use the existing onboarding flow.

## Settings information architecture

The mobile-first Profile/Settings surface must provide these sections.

### 1. Profile + identity

- profile picture;
- display name;
- username;
- email/account identity;
- timezone;
- weekly lifting target;
- preferred lifting weight unit (`kg` / `lb`) once persisted as an account preference;
- account/member-since context when trustworthy source data is available.

Editable identity fields must use authoritative service/RPC boundaries rather than writing arbitrary profile columns directly from presentation components.

### 2. Notifications

Notifications are a first-class account setting, not a hidden browser-only preference.

The section must expose a master control:

```text
Notifications  [ON/OFF]
```

When the master switch is ON, the user may independently toggle supported optional categories:

- workout reminders;
- weekly goal reminders;
- badges + achievements;
- personal-record alerts;
- group activity;
- group invitations.

The category list may grow later, but implemented controls must map to real supported delivery behavior rather than decorative/fake toggles.

### Notification preference semantics

Notification preferences are **account-level server-persisted preferences**. They must not rely only on localStorage, IndexedDB, or a single browser installation.

The master switch is authoritative for optional notification delivery:

- master OFF suppresses all optional notification delivery for the account;
- child category controls are disabled while master OFF;
- turning master OFF preserves the user's individual category selections so re-enabling notifications can restore the prior choices;
- master ON does not automatically grant browser/OS notification permission.

Required in-app account, security, moderation, suspension, or ACTION_REQUIRED notices are not optional push/reminder preferences. Disabling optional notifications must not hide mandatory in-app account-state or policy messages.

### Device/browser permission is separate

PWA/browser notification capability is device-specific and must be represented separately from the account preference.

Supported device states include:

- permission not requested/default;
- permission granted;
- permission denied/blocked;
- notifications unsupported on this device/browser.

Rules:

- never auto-prompt for notification permission merely because `/settings` loads;
- request permission only after an explicit user action such as `Enable notifications on this device`;
- denying permission on one device must not silently set the account-level master preference to OFF;
- if account notifications are ON but device permission is blocked, Settings must explain that this device cannot currently deliver notifications without implying the account preference changed;
- push subscriptions are device-specific and must be registered/revoked independently of the account-level preference;
- multiple authorized devices may each have their own subscription while sharing the same account preferences.

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

Changing preferences must not rewrite historical authoritative workout/scoring data.

### 5. Groups

- current groups;
- pending invitations;
- navigation to the existing group-management surface.

Settings must link to group administration rather than duplicating group OWNER/ADMIN controls.

### 6. Privacy + data

Reserve a clear section for:

- privacy information;
- notification/data preferences;
- future data export;
- self-service account deletion backed by the completed Phase 15.3C lifecycle.

Data export must not appear as a functioning control until its backend exists. The account-deletion backend, retention rules, audit behavior, Storage cleanup, and social/scoring consequences are implemented by Phase 15.3C. The product owner approved the 15.6A implementation slice with a deliberate request/cancel/exact-confirmation Settings control; it uses the exact server-derived phrase and retains the group-ownership transfer requirement.

### 7. App / PWA

Expose useful application status where supported:

- application version;
- installed/standalone state;
- offline/connectivity status;
- update availability / update action;
- relevant storage-persistence status.

This section should reuse the existing PWA lifecycle state rather than inventing duplicate status logic.

### 8. Administration — conditional

Only a positively confirmed ACTIVE platform administrator may see the Administration section and its Admin action.

For everyone else—including normal users, group OWNER/ADMIN users, suspended platform admins, loading authorization, or failed access checks—the entire Administration section is absent with no placeholder, disabled control, or route clue.

The Admin action is navigation convenience only. `/platform-admin/*` re-authorizes through `PlatformAdminGate`, and protected RPCs independently enforce `private.require_active_platform_admin()`.

## Persistence and separation of concerns

Profile/Settings presentation components must not call Supabase directly.

Use dedicated settings/profile services and hooks so:

- account/profile preferences have typed read/update contracts;
- notification preference persistence is separate from browser push-subscription management;
- device permission/subscription code remains PWA/device infrastructure;
- group management stays in the Groups feature;
- platform-admin authorization stays in the admin feature;
- scoring, badges, rankings, and workout qualification remain unaffected by settings changes unless a future product rule explicitly says otherwise.

## Notification implementation slices

### 15.6A Profile/Settings foundation

- implement `/settings`;
- identity/account/training/groups/privacy/app sections;
- profile preference read/update services;
- deliberate two-step self-service deletion UI using `accountDeletionService`, including group-ownership transfer guidance and the exact server-derived confirmation phrase;
- keep group and admin authorization boundaries separate.

### 15.6B Notification preference persistence

- add server-persisted master and per-category preference state;
- authenticated read/update RPC/service contracts;
- master-off semantics that preserve category selections;
- authorization/RLS tests proving users can manage only their own preferences.

### 15.6C PWA notification permission + delivery integration

- explicit user-gesture permission request;
- device-specific push subscription lifecycle;
- supported-category delivery only;
- multi-device behavior;
- blocked/unsupported-device states;
- no infrastructure push credentials in the browser.

### 15.6D Settings integration gate

Validate:

- mobile and desktop Settings access;
- settings access without group membership;
- profile preference persistence;
- master notifications ON/OFF behavior;
- every supported category toggle;
- preserved child selections across master OFF -> ON;
- denied/default/granted/unsupported device permission states;
- no automatic permission prompt on page load;
- multi-device subscription separation;
- required in-app account/moderation notices remain visible;
- conditional platform-admin discovery;
- no scoring/XP/badge-award regressions.
- self-deletion request, cancellation before confirmation, exact confirmation, group-owner blocking, and signed-out/deleted completion behavior.

## Non-negotiable rules

- Notifications must have a real user-controlled master ON/OFF switch in Profile/Settings.
- Optional notification category toggles must be independently controllable when the master switch is ON.
- Account preferences and device/browser permission are separate states.
- A notification control must not claim to work until the associated delivery behavior exists.
- Disabling optional notifications must never suppress required in-app account/security/moderation notices.
- Profile/Settings changes must not weaken platform-admin authorization or alter scoring rules.
- Self-service deletion UI must reuse the Phase 15.3C server boundary and must never treat a client-only confirmation as authorization.
