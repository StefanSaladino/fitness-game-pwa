# Phase 15.6C — PWA Notification Permission + Delivery Integration

Status: **DONE**

Hosted migrations:

- `20260823182658_phase15_6c_pwa_push_delivery`
- `20260823182930_phase15_6c_fix_push_target_conflict`

Hosted pgTAP: **79/79 passed**

## Objective

Connect the Phase 15.6B server-persisted optional notification preferences to real device permission, device-specific Web Push subscriptions, durable server delivery, and the existing PWA service worker without inventing unsupported notification behavior.

Account preferences and device/browser permission remain separate. Loading `/settings` never opens a browser or OS permission prompt.

## Supported delivery categories

Phase 15.6C exposes working category controls only where the application already has an unambiguous authoritative event that can produce a useful push:

- **Badges + achievements** — when an authoritative badge row is awarded;
- **Personal-record alerts** — when authoritative `EXERCISE_PROGRESS` scoring records a new personal best;
- **Group invitations** — when a targeted group invitation row is created.

The persisted Phase 15.6B fields for workout reminders, weekly goal reminders, and generic group activity remain stored but do **not** appear as working switches. The repository has no approved reminder timing contract or generic group-activity push rule yet, so exposing those controls would falsely imply delivery behavior that does not exist.

## Device permission lifecycle

`pushNotificationService` owns browser/device capability and subscription behavior.

- `inspect()` reads feature support and existing permission/subscription state without requesting permission;
- `enable()` is the only path that may call `Notification.requestPermission()`;
- permission is requested only after the user presses **Enable on this device**;
- denied/blocked permission never changes the account-level master preference;
- disabling one device revokes that server subscription and unsubscribes that browser without changing the account preference;
- an already-granted existing browser subscription is re-registered during inspection so a shared browser/device cannot keep delivering to a previously signed-in account;
- multiple authorized devices remain independently registered for the same account.

On iPhone/iPad, Settings explains that Web Push must be enabled from the installed Home Screen web app. A normal Safari tab does not attempt to request notification permission.

## Browser/server separation

Browser code may call only self-service boundaries:

- `public.register_my_push_subscription(...)`;
- `public.revoke_my_push_subscription(text)`;
- `public.get_my_push_device_summary()`;
- `public.enqueue_my_push_test(text)`;
- the `GET_PUBLIC_KEY` action on the `push-notifications` Edge Function.

Push endpoint capability data, P-256 keys, the VAPID private key, the internal dispatch credential, and queue internals are never exposed through direct browser table access.

`GET_PUBLIC_KEY` manually verifies the caller JWT with Supabase Auth and requires the account to remain ACTIVE before returning only the VAPID public key.

## Hosted delivery architecture

The delivery path is:

```text
Authoritative application event
        ↓
private.enqueue_optional_push(...)
        ↓
private.push_delivery_queue
        ↓
pg_net immediate dispatch
        ↓
push-notifications Edge Function
        ↓
Web Push provider
        ↓
registered user devices
```

A hosted `pg_cron` retry job also re-dispatches eligible pending queue items once per minute. This prevents a transient Edge/provider failure from silently discarding a notification.

Before sending, `public.prepare_push_delivery(uuid)` re-checks:

- the account remains ACTIVE;
- the account-level master optional-notification preference is still ON;
- the specific category remains enabled;
- the subscription is still active.

That means a notification queued while enabled is suppressed if the user turns the master/category preference off before actual delivery.

## Multi-device delivery

Each queued optional event can resolve to multiple active subscription targets. `private.push_delivery_targets` tracks each device independently.

- one device may succeed while another remains retryable;
- expired provider endpoints are marked EXPIRED and revoked;
- transient provider errors remain retryable with a later `available_at` time;
- a test notification targets only the current selected subscription rather than every device;
- endpoint ownership moves to the currently authenticated account when the same browser subscription is re-registered after an account switch.

## Edge Function authorization

`push-notifications` uses `verify_jwt = false` intentionally because hosted `pg_net`/cron delivery does not have an end-user JWT.

That does **not** make its privileged paths open:

- browser `GET_PUBLIC_KEY` requires a manually verified ACTIVE user JWT;
- background `DRAIN` requires a high-entropy server-only dispatch token stored in `private.push_runtime_config`;
- unauthorized requests receive a generic 404;
- service-role database access exists only inside the hosted Edge Function;
- VAPID private key and the dispatch token never enter Vite/browser code.

The VAPID key pair is generated server-side and initialized once. The public key may be returned to an authenticated client because Web Push subscription creation requires it; the private key stays server-side.

## Service worker

The production service worker now:

- receives Push API events;
- parses only bounded title/body/path/tag fields;
- shows a system notification with the existing app icon;
- accepts only same-origin navigation targets;
- focuses/navigates an existing same-origin app window when possible;
- otherwise opens the same-origin destination;
- advances the shell cache version to `v13-2` so the push-capable worker can replace the previous worker safely.

## Settings behavior

The Notifications section now exposes:

- the real account master optional-notification switch;
- working switches for badges/achievements, personal records, and group invitations;
- explicit unavailable states for workout reminders, weekly goal reminders, and generic group activity;
- device capability/permission/subscription state;
- active registered-device count;
- **Enable on this device**;
- **Disable on this device**;
- **Send test notification** when subscribed.

Turning the master preference OFF disables supported child switches in the UI but preserves their stored selections exactly as Phase 15.6B requires.

Mandatory in-app account, security, moderation, suspension, and `ACTION_REQUIRED` administrator notices remain completely separate and are never suppressed by optional push preferences.

## Hosted database verification

Canonical suite:

`supabase/tests/039_phase15_6c_pwa_push_delivery.test.sql`

The 79 rollback-safe assertions prove:

- private subscription/queue/target storage and RLS;
- no browser direct-table access;
- self-only registration/revocation/device-summary/test RPCs;
- service-role-only delivery preparation/runtime/result boundaries;
- suspension enforcement;
- multiple independent devices;
- shared-browser endpoint transfer between authenticated accounts;
- default-off consent;
- badge, personal-record, and invitation enqueue behavior;
- no false personal-record push from other scoring events;
- current master/category preferences are re-checked at send time;
- master-off suppression preserves category selections;
- one queue item fans out to multiple active devices;
- per-device success tracking;
- expired endpoint revocation;
- transient retry scheduling;
- pinned `SECURITY DEFINER` boundaries.

Hosted result: **79/79 passed**, with fixtures rolled back.

The first hosted test pass exposed PostgreSQL output-variable shadowing inside `prepare_push_delivery`: its `RETURNS TABLE queue_id` name made `ON CONFLICT (queue_id, subscription_id)` ambiguous. The first migration had already been applied, so it remains immutable. The narrow repair migration `20260823182930_phase15_6c_fix_push_target_conflict` replaces only that function and uses the named primary-key constraint instead.

## Edge runtime smoke test

After deploying `push-notifications`, hosted runtime configuration was pointed at the deployed Function and the private database dispatcher invoked an empty queue ID.

The hosted `pg_net` response was **HTTP 200**, the Edge Function returned a clean zero-target drain result, and the VAPID public/private key pair was initialized successfully. No browser credential or production push subscription was required for this server-boundary smoke test.

## No-Docker workflow

Phase 15.6C follows the project’s hosted-first no-Docker architecture:

- migrations were applied to hosted Supabase;
- pgTAP ran against hosted Supabase;
- the Edge Function was deployed to hosted Supabase;
- GitHub database validation remains the static `db:test:ci` repository-contract gate;
- neither normal development nor GitHub CI starts a local Supabase/Docker stack.

## Non-goals

Phase 15.6C does not invent:

- workout reminder timing;
- weekly-goal reminder timing;
- generic group-activity push semantics;
- email/SMS delivery;
- mandatory policy/security notices as optional push;
- scoring, XP, badge eligibility, ranking, workout qualification, or historical-workout changes.

Those unsupported notification categories remain persisted for a later explicitly defined delivery slice rather than being presented as fake controls.
