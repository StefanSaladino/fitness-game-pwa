# Phase 15.3D — User Administration Visual Gate + UI

Status: **DONE — phone and desktop concepts approved; responsive production UI and critical-flow coverage implemented.**

Baseline: remote `master` at `337d0936ab246b9581a7b583fc57173b6ee828fd` (Phase 15.3C).

## Product boundary

This slice adds an ACTIVE-platform-admin-only account directory and account-detail workflow under `/platform-admin/users`. It reuses the Phase 15.3A–15.3C service and authorization contracts without changing database schema, Auth policy, Storage behavior, scoring, workouts, groups, progression, or ordinary-user Settings.

User reporting, moderator case intake, privacy-bounded activity review, and individual/group/all-user messaging are now explicit later roadmap requirements. They are not rendered as working controls in 15.3D because their server-side data, retention, authorization, notification, and audit contracts do not exist yet.

The screen must never expose email, password material, Auth identities, raw Auth metadata, access/refresh tokens, session rows, provider tokens, or service-role credentials.

## User goal and route behavior

An ACTIVE platform administrator can:

- find an account by username, display name, or exact UUID;
- filter the directory by ACTIVE, SUSPENDED, or DELETION_PENDING state;
- inspect the limited account and lifecycle metadata already returned by the guarded RPCs;
- suspend an ACTIVE account with a required reason and optional future review date;
- restore a SUSPENDED account with a required audit reason;
- request or cancel deletion with a required audit reason;
- irreversibly delete an already-DELETION_PENDING non-admin account only after typing the exact server-derived phrase `DELETE <username>`.

Entry is through the existing platform-administration rail after the current ACTIVE platform-admin check. `/platform-admin` continues to canonicalize to `/platform-admin/capacity`; `/platform-admin/users` is the explicit Users destination.

Unauthorized, non-admin, SUSPENDED, or DELETION_PENDING callers are replace-redirected to `/` without rendering privileged route content or an authorization oracle.

## Real data contract

### Directory rows

- stable user UUID;
- username;
- display name;
- ACTIVE, SUSPENDED, or DELETION_PENDING status;
- account creation timestamp;
- last sign-in timestamp, or unavailable;
- platform-admin flag;
- optional suspension review timestamp;
- optional deletion-request timestamp;
- total matching result count for pagination.

### Detail-only metadata

- current status reason;
- status update timestamp;
- deletion-request actor UUID when applicable.

No visual concept may invent email, plan, billing, device, session-count, IP-address, workout-summary, warning-count, or risk-score fields.

## Action matrix

| Target state | Primary lifecycle action | Secondary lifecycle action | Required safeguards |
|---|---|---|---|
| ACTIVE | Suspend | Request deletion | reason is 3–500 characters; review date is optional and future; server blocks self-suspension and protected administrator transitions |
| SUSPENDED | Restore | Request deletion | reason is 3–500 characters; restore remains fail-closed until Auth unban succeeds |
| DELETION_PENDING | Confirm irreversible deletion | Cancel deletion | cancellation requires a 3–500 character reason; irreversible deletion requires exact `DELETE <username>` confirmation |
| Any platform administrator target | Status action only where the server permits it | No deletion request | server rejects deletion while the target remains a platform administrator |
| Current administrator’s own row | Inspect only | None | destructive self-actions are not offered; the server remains authoritative |

Final deletion can still fail if the target owns a group. The UI must explain that group ownership needs to be transferred first; it must never transfer ownership or delete a group silently.

## Interaction sequence

### Directory

1. Load page 1 with 25 rows.
2. Submit trimmed search text or change the status filter; reset to page 1.
3. Show total results and bounded Previous/Next controls.
4. Selecting a row loads its current detail from `get_platform_account_detail` instead of assuming the list row is current.
5. After a successful mutation, reload both the detail and the current directory page.

Search is submit-driven rather than invoking a privileged query on every keystroke.

### Suspend or restore

1. Open a labeled dialog tied to the selected username.
2. Require a 3–500 character reason.
3. For suspension only, accept an optional future review date.
4. Disable duplicate submission while the server request is in progress.
5. On success, close the dialog, announce the new state, and refresh list/detail.
6. On error, retain the user’s input and show an inline error near the action controls.

### Deletion

1. Request deletion with a required 3–500 character reason. This changes the account to DELETION_PENDING but deletes nothing.
2. Show a separate irreversible-deletion panel only after refreshed detail confirms DELETION_PENDING.
3. State what is deleted, what UUID-only audit/coordination data remains, and that the action cannot be undone.
4. Require the exact case-sensitive phrase `DELETE <username>`.
5. Keep the final button disabled until the phrase matches exactly.
6. On success, return focus to the directory heading, announce completion, and reload the current page. If the now-shorter page is empty, move to the previous valid page.
7. If group ownership blocks deletion, keep the target pending and show transfer-first guidance. Do not imply that a retry will bypass the requirement.

Cancellation is available only before an irreversible deletion job exists. If the server rejects cancellation because deletion has begun, show that deletion must be retried instead.

## Required UI states

- initial directory loading;
- directory ready;
- no accounts in the selected filter;
- no search matches;
- directory load error with Retry;
- selected-detail loading;
- selected-detail error with Retry and a still-usable directory;
- no selected account on wider layouts;
- action dialog validation error;
- action network/server error;
- action in progress with duplicate submission disabled;
- action success announced through a polite live region;
- pagination in progress without clearing the existing rows;
- stale or deleted selected account returning the user to the directory safely.

## Visual direction for approval

Approval references:

- `docs/concepts/phase15.3d-users-phone.png`
- `docs/concepts/phase15.3d-users-desktop.png`

### Phone

- compact sticky admin header with Back, Users title, and result count;
- search field followed by a horizontally scrollable, text-labeled status filter;
- one-column operational rows with display name, `@username`, explicit text status, joined date, and platform-admin label when true;
- selecting a row opens a full-height detail view with a clear Back to users control;
- actions are grouped under Account controls, separated from identity and activity metadata;
- destructive actions use both words and visual treatment—never color alone.

### Desktop

- reuse the narrow platform-admin rail with Capacity and Users destinations;
- two-pane Users workspace: bounded directory on the left and selected-account detail on the right;
- search, filter, total, and pagination stay attached to the directory pane;
- the detail pane uses compact definition rows rather than a KPI-card wall;
- dangerous actions remain below the account record and never sit beside ordinary navigation controls.

The visual language remains the existing dark operational admin surface: opaque `#071019` / `#0c1722` backgrounds, quiet borders, compact typography, green only for primary non-destructive emphasis, and explicit danger copy for destructive actions.

## Responsive contract

- below 940 px, the desktop rail is removed and the compact sticky admin header is used;
- below 720 px, the directory and detail are separate views rather than squeezed columns;
- at 720–939 px, the directory may use wider rows but still presents detail as a dedicated view;
- at 940 px and above, directory and detail form a two-pane workspace;
- controls remain at least 42 px high and the page must not scroll horizontally at 320 px width;
- no native-watch administration UI is promised or implemented.

## Component and data boundaries

```text
PlatformAdminRoute
  -> PlatformAdminShell
      -> PlatformAdminRail
      -> UserAdministrationController
          -> UserDirectory
              -> UserSearchForm
              -> AccountStatusFilter
              -> UserDirectoryRow
              -> DirectoryPagination
          -> UserAccountDetail
              -> AccountIdentity
              -> AccountLifecycleMetadata
              -> AccountActionPanel
                  -> ReasonActionDialog
                  -> IrreversibleDeletionDialog

useUserAdministration
  -> PlatformAccountAdminService
      -> guarded Supabase RPCs
      -> JWT-verified platform-account-auth Edge Function

accountAdministrationValidation
  -> pure reason, review-date, and exact-confirmation validation
```

Visual components receive data and callbacks only. They do not import or call Supabase. The controller owns focus restoration and live announcements; the hook owns async state, stale-request protection, and reload coordination; the service remains the existing browser-safe transport boundary.

## Accessibility and validation gate

- semantic search form, list/table semantics appropriate to each viewport, headings, definition lists, and dialogs;
- visible focus for every interactive control;
- keyboard-complete row selection, filter, pagination, dialogs, cancellation, and destructive confirmation;
- dialog focus placement, focus trap, Escape behavior where cancellation is safe, and focus restoration;
- explicit labels and help/error associations for reason, review date, and confirmation fields;
- status text and admin labels in addition to color;
- polite success announcements and assertive destructive/server error announcements;
- reduced-motion behavior and no required animation;
- phone, desktop, 320 px overflow, service, hook, component, route-authorization, integration, and Playwright critical-flow coverage.

## Approval and implementation record

The product owner explicitly approved both concept references before implementation. The shipped surface uses the shared platform-administration shell, keeps Supabase access in the existing service boundary, restores dialog focus, rejects stale detail requests, prevents duplicate mutations, and includes unit, component, route, integration, and responsive Playwright coverage. This UI slice adds no migration, Edge Function, secret, or Docker requirement.
