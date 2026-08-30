# Phase 17 — Platform Admin UI remediation

Status: **IMPLEMENTED, LOCAL VALIDATION REQUIRED**

Scope is deliberately limited to:

- `/platform-admin/users`
- `/platform-admin/capacity`
- the shared Platform Admin shell behavior required to make those routes responsive.

## Root causes corrected

### Users

The shared admin shell switched to a desktop rail at `940px`, but Users did not enter its two-pane layout until the raw viewport reached `1220px`. That meant the route was making layout decisions from browser width instead of the smaller content area remaining after the rail.

The old directory also tried to behave like a four-column table inside a half-width pane and intentionally ellipsized names/usernames. Detail rows used a rigid label/value split and the mobile detail surface had insufficient internal padding.

The remediation:

- establishes the admin content area as a CSS inline-size container,
- switches Users layout with container queries,
- keeps the directory a readable master list instead of a squeezed table,
- always shows Joined and Last sign-in labels,
- wraps long display names, usernames, UUIDs, status reasons, and detail values,
- uses a padded mobile detail card,
- keeps the wide detail pane independently scrollable when necessary,
- stacks search/actions where width is genuinely constrained.

### Capacity

The old Capacity metric presentation nested a two-column metric grid inside another responsive provider grid. Metric rows themselves also used a two-column label/value layout. At narrow and intermediate widths this created several competing horizontal tracks, which caused the dense text collision reported on the real route.

The remediation replaces that hierarchy with four explicit sections:

1. Supabase project telemetry
2. Supabase Free-plan allowances
3. Snapshot history
4. Provider status

Metrics are independent responsive cards with one reading order: label/status, current usage, limit, utilization, source/time, note. Provider usage that is unavailable remains visually distinct from its known Free-plan limit.

## Regression coverage

`tests/e2e/admin-critical-layout.spec.ts` exercises both routes at:

- 320×568
- 390×844
- 768×1024
- 1024×768
- 1280×720
- 1440×900

It fails on clipped text, controls/text extending beyond the viewport, or document horizontal overflow.

The existing release visual audit continues to cover the broader admin breakpoint matrix. Its fixtures are strengthened with deliberately long user identity/detail values and the full Phase 17.4 Supabase allowance set.

## Focused cross-viewport regression

`tests/e2e/admin-critical-layout.spec.ts` runs both routes at 22 critical viewport/height combinations (44 cases total), including the 939/940/941 admin-shell transition, 1255/1256/1257 Users container split transition, short desktops, landscape phones, tablets, and 1920px desktop. It asserts text clipping, horizontal overflow, independent direct-child collisions, and desktop admin scroll-owner containment.
