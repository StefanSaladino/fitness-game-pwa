# Phase 15.6B — Notification Preference Persistence

Status: **DONE**

Hosted migration: `20260823175728_phase15_6b_notification_preferences`

Hosted pgTAP: **37/37 passed**

## Objective

Persist the ordinary user's optional notification choices as account-owned server state without pretending browser permission, push subscriptions, or notification delivery already exist.

Phase 15.6B is persistence only. Phase 15.6C remains responsible for PWA/device permission, device-specific push subscriptions, and actual optional delivery integration.

## Delivered database boundary

`public.notification_preferences` stores one row per profile with:

- master `notifications_enabled`;
- workout reminders;
- weekly goal reminders;
- badges + achievements;
- personal-record alerts;
- group activity;
- group invitations.

All optional preferences default to `false`. Existing profiles are backfilled and newly inserted profiles receive a row through the profile trigger.

The table cascades with profile deletion and therefore follows the existing Phase 15.3C account-deletion lifecycle without creating retained notification identity data.

## Authorization

Browser roles do not mutate the table directly.

- `authenticated` receives RLS-scoped `SELECT` only;
- the only browser-visible table policy exposes `auth.uid() = user_id`;
- `anon` receives no table access;
- insert/update/delete table privileges remain revoked from browser roles;
- mutation runs through `public.update_my_notification_preferences(...)`;
- the RPC calls `private.require_active_account()` and therefore rejects suspended/deletion-blocked callers according to the existing account-state boundary;
- the RPC is deny-by-default, pins an empty search path, and grants execution explicitly to `authenticated` only.

## Master preference semantics

The master preference and category selections are persisted independently.

Turning the master preference OFF does **not** clear category selections. This allows a later OFF -> ON transition to restore the user's previous category choices without rewriting them.

Phase 15.6C delivery code must treat effective optional delivery as:

```text
master enabled AND category enabled AND usable device permission/subscription
```

The account master preference must never be silently rewritten merely because one device is denied, blocked, unsupported, unsubscribed, or unavailable.

## Mandatory in-app notices

These optional preferences do not govern required in-app account/security/moderation notices, suspension/account-status messages, or `ACTION_REQUIRED` administrator messages. Those continue to follow their existing durable in-app delivery rules.

## Application service boundary

`notificationPreferenceService` owns the browser/Supabase boundary for loading and updating these preferences.

It:

- reads only the current user's RLS-scoped preference row;
- maps persistence rows to an application model;
- performs one atomic self-update RPC;
- sends every category value even when the master is OFF, preserving child selections;
- fails closed on malformed server responses;
- does not call browser notification APIs, service-worker push APIs, or localStorage.

The Settings screen remains non-interactive for notifications in this slice. It may accurately state that server preferences now exist, but working controls remain deferred until Phase 15.6C can connect them to real device permission/subscription/delivery behavior.

## Database verification

Canonical suite:

`supabase/tests/038_phase15_6b_notification_preferences.test.sql`

The 37 rollback-safe assertions prove:

- table/column/RLS existence;
- browser table privileges are read-only and self-scoped;
- anonymous/PUBLIC execution is denied;
- new-profile initialization;
- default-off consent;
- own-row visibility and other-row denial;
- independent category persistence;
- master OFF preserves categories;
- master ON restores those preserved selections;
- null inputs fail closed;
- another user's row is not altered;
- suspended users cannot mutate preferences;
- the RPC remains a pinned `SECURITY DEFINER` boundary;
- notification changes do not create scoring events or award badges.

Hosted result: **37/37 passed**, with the fixture transaction rolled back.

## Advisor review

Hosted security advisors were run after DDL. There were no new ERROR findings. The new RPC receives the expected generic warning for an authenticated executable `SECURITY DEFINER` function; this exposure is intentional and bounded by `private.require_active_account()`, self-derived `auth.uid()`, explicit EXECUTE grants, and pgTAP authorization coverage.

Hosted performance advisors are part of the release gate for this slice.

## No-Docker workflow

Phase 15.6B follows the project's current no-Docker architecture. Runtime migration and pgTAP validation use hosted Supabase. GitHub uses `npm run db:test:ci` for repository migration/test contracts and does not start a local Supabase stack.

The stale Docker-first setup/validation documentation is removed in this same slice so the documented workflow matches executable CI.

## Non-goals

Phase 15.6B does not add:

- browser/OS notification permission prompts;
- Web Push subscriptions;
- VAPID/provider credentials;
- push delivery jobs;
- per-device subscription storage;
- automatic permission prompts on Settings load;
- notification controls that imply unsupported delivery;
- scoring, XP, badge-award, ranking, workout, or group-rule changes.

Those delivery/device concerns belong to Phase 15.6C.
