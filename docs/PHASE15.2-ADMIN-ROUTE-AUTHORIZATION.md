# Phase 15.2 — Administrator route + authorization contract

## Status

**LOCKED before Phase 15.2B implementation.**

This document defines the route and security architecture for the platform-administration console. Later Phase 15 slices may add screens beneath this shell, but they must not weaken or bypass this contract.

## Routes

Reserved administrator routes:

- `/platform-admin` — private platform-administration shell;
- `/platform-admin/capacity` — capacity + platform-health dashboard;
- later platform-admin user/message pages must remain children of `/platform-admin/*`.

The ordinary authenticated PWA also reserves `/settings` as the canonical Profile/Settings surface. `/settings` is **not** an administrator route and does not require platform-admin membership. It is the in-app discovery point for the conditional administrator entry described below.

The broader Profile/Settings information architecture, notification controls, and persistence rules are locked separately in `docs/PHASE15.6-PROFILE-SETTINGS-NOTIFICATIONS.md`. That contract does not weaken or replace the administrator authorization rules in this document.

The administrator console is not part of ordinary primary product navigation. Knowing or manually entering the URL does not grant access.

## Application routing order

The administrator branch must be resolved from the authenticated application boundary **before** normal onboarding and group gating.

```text
AuthProvider
  |
  +-- /platform-admin/*
  |     |
  |     +-- authenticated session required
  |     +-- PlatformAdminGate
  |     +-- ACTIVE platform admin required
  |     +-- administrator console
  |
  +-- ordinary application
        |
        +-- profile/onboarding gate
        +-- GroupGate
        +-- ProductController
```

A trusted platform administrator therefore does **not** need to belong to a fitness group merely to operate the platform console.

## Route/render guard

`PlatformAdminGate` must:

1. require a valid authenticated Supabase session;
2. call `public.get_my_platform_access()`;
3. render administrator content only when `account_status = ACTIVE` and `is_platform_admin = true`;
4. when an authenticated caller is not an ACTIVE platform administrator, use the same fallback behavior as any unknown/non-existent authenticated route: perform the same replace-redirect as any unknown/non-existent authenticated route to the canonical ordinary home URL `/`, with no admin-specific error, denial message, route label, or other indication that the requested path is reserved;
5. keep this fallback behavior identical for normal users, group OWNERs/ADMINs, and suspended platform administrators.

Expected route behavior:

| Caller | Result |
| --- | --- |
| Unauthenticated | Sign-in flow; no admin content |
| Normal authenticated user | Ordinary authenticated home; indistinguishable from an unknown route |
| Group OWNER | Ordinary authenticated home; indistinguishable from an unknown route |
| Group ADMIN | Ordinary authenticated home; indistinguishable from an unknown route |
| Suspended platform admin | Ordinary authenticated home; indistinguishable from an unknown route |
| Active platform admin | Admin console |

There must be **no `403`, `Access denied`, `Admin access required`, or equivalent admin-specific UI** for an authenticated unauthorized caller. The route guard may internally determine that authorization failed, but the visible navigation result must be the same as the application's generic authenticated unknown-route fallback. This is a route-disclosure/privacy behavior, not the security boundary.

Group membership and group `OWNER` / `ADMIN` roles are unrelated to platform-admin authorization.

## Authorized in-PWA discovery through Profile/Settings

The PWA must provide a normal authenticated Profile/Settings surface at `/settings`. This surface is available independently of platform-admin status and should remain reachable through the application's ordinary profile/account affordance.

Once the user's profile exists, `/settings` should resolve from the authenticated/profile boundary before `GroupGate` so a group-membership problem does not block access to personal account settings. Incomplete profile onboarding may continue through the existing onboarding flow.

For an authenticated user whose server-backed platform access resolves to `account_status = ACTIVE` and `is_platform_admin = true`, Profile/Settings must render an **Admin** action that navigates in-app to `/platform-admin` (which may default onward to `/platform-admin/capacity`). This is the supported discoverable entry point for a trusted administrator using the installed PWA.

For every caller who is not positively confirmed as an ACTIVE platform administrator:

- render no Admin button/link;
- render no Administration heading, disabled control, placeholder row, reserved gap, badge, tooltip, or explanatory copy;
- do not expose the reserved `/platform-admin` path in ordinary settings markup;
- while the platform-access check is loading or unavailable, fail closed by omitting the administrator entry while leaving ordinary settings usable.

The conditional Admin entry must be driven by the same server-backed platform-access result used by the administrator route guard (`public.get_my_platform_access()` or a shared application-layer wrapper around that RPC). It must never be inferred from group role, client storage, profile metadata, a build-time flag, or a client-controlled claim.

The Profile/Settings Admin action is a **navigation convenience only**. Rendering it does not authorize any administrator data or mutation. `/platform-admin/*` must still pass `PlatformAdminGate`, and every protected RPC must still enforce `private.require_active_platform_admin()` independently.

Required settings-entry regression coverage:

- normal authenticated user -> ordinary Profile/Settings with no admin-specific markup;
- group OWNER/ADMIN -> ordinary Profile/Settings with no admin-specific markup;
- suspended platform admin -> ordinary Profile/Settings with no admin-specific markup;
- platform-access loading/failure -> ordinary Profile/Settings remains usable and no admin entry is rendered;
- ACTIVE platform admin -> Admin action appears and navigates in-app to `/platform-admin`;
- direct `/platform-admin/*` authorization remains independently enforced even when the Admin action is rendered.

## Unknown-route equivalence

The application must define one canonical authenticated fallback for unrecognized paths. For the current route model, that fallback is a **replace redirect to `/`**, which resolves to the ordinary authenticated home surface. Replace navigation is required so the invalid/reserved path is not retained as a meaningful entry in browser history.

An authenticated caller who requests `/platform-admin` or any `/platform-admin/*` child without ACTIVE platform-admin authorization must take that exact replace-redirect fallback path. The application must not expose whether the path matched a reserved administrator route.

Required regression coverage:

- unknown authenticated path -> ordinary authenticated home;
- `/platform-admin` as normal authenticated user -> same home result;
- `/platform-admin/capacity` as group OWNER/ADMIN -> same home result;
- `/platform-admin/*` as suspended platform admin -> same home result;
- no unauthorized case renders admin-specific copy, status, navigation, or shell markup;
- ACTIVE platform admins still resolve the real administrator route.

This non-disclosure behavior does not replace database/server authorization. Protected RPCs still reject unauthorized callers even if client routing is modified or bypassed.

## Database authorization boundary

The React route guard is **UX defense only**. It is not the authoritative security boundary.

Every capacity RPC that reads operational telemetry, captures a historical snapshot, or changes configured allowances must independently call:

```sql
private.require_active_platform_admin()
```

before returning or mutating protected data.

This guarantees that direct RPC calls, modified client code, guessed URLs, or client-state manipulation cannot bypass platform-admin authorization.

Capacity configuration, snapshot history, and other protected operational data remain in the non-exposed `private` schema. Browser roles receive no direct table access to those objects.

## External provider boundary

Provider-authoritative Supabase and Netlify metrics must never be fetched from Vite/browser code using management credentials. The required flow is:

```text
Browser
  | authenticated user JWT
  v
Secure server / Edge boundary
  | verify ACTIVE platform-admin authorization
  v
Supabase Management API / Netlify API
```

Management tokens, Supabase secret/service-role credentials, Netlify access tokens, and comparable infrastructure credentials never enter the browser bundle.

## Required authorization tests

Before Phase 15.2 is complete, tests must prove:

- direct URL entry cannot bypass the gate;
- unauthenticated users cannot render the admin console or execute protected RPCs;
- an arbitrary unknown authenticated route replace-redirects to `/` and establishes the canonical fallback result;
- normal authenticated users requesting `/platform-admin/*` receive that exact same replace-redirect-to-`/` result, cannot render the console, and cannot execute protected RPCs;
- ordinary group OWNER / ADMIN roles do not confer platform-admin access and receive the same unknown-route fallback;
- suspended platform administrators receive the same unknown-route fallback and lose RPC authorization;
- unauthorized authenticated cases render no admin-specific denial copy, status, shell markup, or navigation;
- active platform administrators can reach the route and authorized capacity RPCs;
- protected `private` tables remain inaccessible directly from browser roles;
- external-provider failures degrade safely without exposing credentials or replacing trustworthy history with fake zero usage.

## Non-negotiable rule

No later visual, routing, or provider-integration slice may replace server/database authorization with a client-side role check.
