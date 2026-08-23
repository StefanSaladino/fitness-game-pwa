# Phase 16.0 — Visual inventory + mobile design-system direction

## Status

**REVIEW READY.**

Phase 16.0 is a design/architecture checkpoint. It intentionally changes no production UI, Supabase schema, scoring rule, authorization rule, notification behavior, workout reliability behavior, or PWA delivery behavior.

The purpose of this slice is to inventory the actual product surfaces that exist after Phase 15.6, identify the visual-system debt that has accumulated across feature delivery, and lock a phone-first direction before Phase 16.1 changes the authenticated app shell.

## Product truths that the overhaul must preserve

The visual overhaul must not rewrite behavior to make the design easier.

- lifting remains the primary product activity;
- cardio remains intentionally secondary;
- `lifting-v1` scoring remains authoritative and visually derived, never recalculated by presentation code;
- zero-group users must still be able to reach Settings and the group-entry flow;
- `/settings` remains the ordinary authenticated account surface;
- the Administration entry remains absent unless the user is positively authorized as an ACTIVE platform administrator;
- direct `/platform-admin/*` routes continue to re-authorize independently;
- optional notification preferences remain separate from browser/device permission;
- offline/recovery/conflict behavior in active workouts remains functionally unchanged;
- no visual slice may invent metrics, badge rules, rank rules, profile data, or social data.

## Current surface inventory

The inventory is based on the current route/composition tree in `src/app/App.tsx` and `src/features/product/ProductController.tsx`, plus the feature-local screens already implemented.

| Surface | Current entry/component boundary | States that must survive the overhaul | Planned visual slice |
| --- | --- | --- | --- |
| Environment/configuration help | `ConfigurationHelp` | missing hosted-Supabase configuration | 16.2/support polish |
| Sign in / create account / forgot password / verification | `AuthScreen` and auth forms | idle, busy, validation, auth/server error, success/verification | 16.2 |
| Reset password | `ResetPasswordScreen` | token/session validation, busy, error, success | 16.2 |
| Profile gate | `ProfileGate` | profile loading, profile load failure/retry, incomplete onboarding, completed profile | 16.2–16.3 |
| Profile onboarding | `OnboardingScreen` | persisted draft/profile values, validation, submit busy/error/success | 16.3 |
| Zero-group entry | `GroupGate` / group setup | loading, load error/retry, create group, incoming invitation, no membership | 16.3 |
| Home / lifting dashboard | `DashboardController` / `DashboardScreen` | loading, error/retry, empty history/PR states, populated weekly lifting/XP/history/rank | 16.4 |
| Workouts / active lift | `WorkoutController` / `WorkoutSessionScreen` | no active lift, start/resume, running, paused, offline, recovering, queued mutation, conflict, finish/cancel | 16.5 |
| Exercise selector/library | `ExercisePicker` / `MuscleGroupFilter` | selector root, muscle drill-down, workout/equipment narrowing, search, recents, selected/duplicate, empty search, close/back | 16.6 |
| Cardio accessory surface | `CardioController` | log form, duration/tier context, history, loading/error/empty/success | 16.10 |
| Progress / analytics | `ExerciseProgressController` and analytics components | exercise selection, loading/error/empty, e1RM/bodyweight trend, volume, PR timeline, weekly/monthly summaries | 16.7 |
| Groups / invitations / administration | `GroupAdministrationController` and group screens | group switching, member roster, invite lifecycle, role-dependent actions, destructive confirmations, leave/transfer rules | 16.8 |
| Competition / social | `GroupSocialController` | leaderboard periods, activity feed, reactions, report action, privacy-safe empty/loading/error states | 16.9 |
| Settings | `/settings` -> `SettingsScreen` | profile/training persistence, notification master/categories, device permission states, PWA state, group summary, privacy/deletion, conditional Admin discovery | 16.1 shell + later Settings surface pass |
| Required user messages | `UserMessageCenter` | notice, warning, ACTION_REQUIRED, read/acknowledged/dismissed rules | 16.12 |
| Platform administration | `/platform-admin/*` -> `PlatformAdminRoute` | authorization loading/denial, capacity, directory/status, moderation, messaging, destructive confirmations | 16.11 |
| Lazy-route/feature fallback | `RouteLoading` / `ProductSectionFallback` | chunk loading without fake progress | 16.1 + 16.12 |
| PWA lifecycle | shared PWA status + Settings exposure | installability, update available, offline/reconnecting, notification capability/permission/subscription | 16.1 + 16.12 |

## Current visual-system findings

### 1. The mobile navigation is carrying too much primary chrome

The current mobile nav renders six equal columns inside a floating translucent container. Labels shrink to very small sizes on narrow phones. Settings/Profile is treated as one of the six equal primary destinations even though it is primarily account chrome, while cardio is a real product section but intentionally secondary and is not in the primary navigation model.

Direction: Phase 16.1 should target **five primary mobile destinations maximum** and move Profile/Settings access into stable account/header chrome. The candidate primary set is Home, Lift, Groups, Progress, and Compete. Cardio remains accessible as a secondary activity surface rather than being promoted merely to fill navigation.

This is a visual/navigation-model refinement only. It must not make an existing feature unreachable.

### 2. Shared shell/primitives are still styled by the legacy global bucket

`src/styles/global.css` is roughly 22 KB and still owns the presentation of:

- `AppShell`/product layout;
- mobile nav;
- desktop sidebar;
- `PageHeader`;
- `Button`;
- `Card`;
- `ProgressBar`;
- core field treatment;
- older authentication compatibility styles.

Meanwhile newer feature surfaces correctly use colocated CSS Modules. The result is a split design system: modern feature-local styling is layered on top of a Phase 5 global visual foundation.

Direction: Phase 16 migrates shared primitives/layout into colocated modules **when each shared component is touched**, rather than performing a risky global CSS rewrite in 16.0.

### 3. The token layer is too small for a page-by-page overhaul

Current tokens define core colors, four radii, one card shadow, sidebar width, and mobile-nav height. They do not yet define an explicit spacing scale, typography scale, touch-target contract, elevation tiers, overlay treatment, semantic interactive states, or motion durations.

Direction: add only the tokens proven necessary by the approved shell and first two migrated pages. Do not create a speculative design-system API containing unused values.

### 4. Card/elevation treatment is too dominant

The existing shared Card uses a gradient surface and shadow by default, and older screens rely heavily on rounded containers. This makes unrelated information blocks compete at similar visual weight and conflicts with the Phase 16 goal of avoiding repetitive dashboard-card composition.

Direction: use a flatter page background, separators and grouped sections for ordinary content; reserve raised surfaces for meaningful containment such as modal sheets, selectable items, summaries requiring visual grouping, or focused primary modules.

### 5. Typography hierarchy is inconsistent and sometimes oversized on phones

The legacy `PageHeader` uses a display heading that can scale to `8vw`, while feature-local screens define their own heading sizes. Eyebrow labels are also used broadly as a structural device.

Direction: establish a compact mobile type hierarchy with fewer all-caps eyebrow labels. Primary page titles should read like app navigation, not marketing hero copy.

### 6. Spacing and control geometry are not governed by one shared scale

Feature modules have evolved independently. Control heights are generally accessible, but gaps, paddings, border radii, section spacing, and row density differ noticeably between dashboard, workout, Settings, groups, analytics, and admin surfaces.

Direction: normalize touch targets and rhythm first; visual sameness is not the goal. Dense workout set-entry rows and relaxed Settings sections should use the same underlying spacing language at different densities.

### 7. Safe-area handling exists but is not yet a single shell contract

The current product main and mobile nav use `env(safe-area-inset-*)`, which is a good foundation. Full-screen selectors, feature overlays, sticky controls, and future page headers must align with the same inset contract instead of each inventing its own offsets.

Direction: Phase 16.1 owns global top/bottom safe-area composition. Feature overlays may add local handling only where their viewport behavior differs from the shell.

### 8. Loading/error/empty/offline feedback is semantically sound but visually fragmented

The application already exposes real loading, retry, offline/recovery, conflict, success, mandatory-message, and notification-device states. Their presentation was implemented feature by feature and does not yet share one hierarchy.

Direction: preserve the existing behavior and progressively converge on a small set of state patterns: inline status, section empty state, blocking/retry state, persistent system banner, transient confirmation, and destructive confirmation.

### 9. Identity and achievements need reserved space before badge art exists

Profile pictures and badge data are real product concepts, but Phase 16.13 owns the badge visual system. Earlier pages should reserve appropriate identity/achievement locations without generating decorative badge art early.

Direction: reserve a compact identity/achievement slot in the app shell/dashboard/social hierarchy, but render only existing real identity/badge data. Empty reserved space must not create fake achievements.

## Proposed mobile app shell direction

Phase 16.1 should explore and then implement this anatomy after concept approval:

```text
┌─────────────────────────────────────┐
│ safe area                           │
│ Page title / context       avatar   │  <- Settings/account access
│ optional compact supporting context │
├─────────────────────────────────────┤
│                                     │
│ page-owned content                  │
│ sections/lists/data                 │
│                                     │
│ enough bottom clearance             │
├─────────────────────────────────────┤
│ Home   Lift   Groups Progress Compete│  <- max five primary destinations
│ safe-area inset                     │
└─────────────────────────────────────┘
```

Shell principles:

- phone composition first;
- one stable account/avatar action gives ordinary users access to `/settings`;
- no hidden Admin affordance unless Settings has positively discovered ACTIVE platform-admin access;
- primary navigation labels remain readable at 320px-class widths;
- active navigation is communicated by icon + label/state, not color alone;
- the bottom navigation is stable and safe-area aware, but should not visually dominate page content;
- page headers are compact and may become contextually sticky only when the individual page benefits from it;
- feature-specific primary actions belong to the page, not the global nav;
- active workout lifecycle controls remain feature-owned rather than becoming global shell controls;
- no generic floating-action button is introduced globally.

## Desktop/tablet adaptation

The existing breakpoints remain the starting compatibility contract:

- **phone:** below 700px;
- **tablet:** 700–1023px;
- **desktop:** 1024px and above.

Direction:

- phone remains the canonical information order;
- tablet may increase content width or introduce two-column composition where scanning improves;
- desktop may use a persistent sidebar/rail, but it must represent the same navigation hierarchy as mobile;
- desktop must not introduce unique feature access that is missing on mobile;
- bounded content widths remain appropriate for forms, Settings, and readable analytics;
- data-dense admin/analytics surfaces may use more horizontal space while still retaining the same tokens and state hierarchy.

## Proposed restrained token direction

These are design-system **directions**, not an instruction to add every token immediately in 16.1.

### Spacing

Use a 4px base rhythm with demonstrated values:

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48`

Common mobile defaults:

- page horizontal inset: 16px at narrow widths, 20–24px when space allows;
- section gap: 24–32px;
- control/row internal gap: 8–12px;
- compact data-row vertical padding: 10–12px;
- relaxed Settings/form row padding: 14–16px.

### Touch targets

- interactive target minimum: 44px;
- primary controls/form fields should generally remain 48px or taller;
- icon-only controls require an accessible name and a 44px interaction box even if the glyph is smaller.

### Typography

Target mobile roles:

- micro/status: 12px;
- secondary/meta: 13–14px;
- body/control: 16px;
- section heading: 18–20px;
- page title: 26–30px;
- numeric emphasis: content-dependent, typically 28–36px, never used merely for decoration.

Weights should communicate hierarchy without using excessive uppercase labels. Body copy should preserve comfortable line-height around 1.45–1.6.

### Radius

Use fewer radius tiers:

- compact control: ~10–12px;
- standard grouped surface: ~14–16px;
- prominent sheet/modal: ~18–22px;
- full pill only for true chips/statuses/toggles where the geometry has meaning.

Avoid placing rounded containers around every section.

### Borders and elevation

- low-contrast 1px dividers/borders for ordinary grouping;
- no shadow for ordinary flat sections;
- one restrained raised-surface shadow/elevation tier;
- one stronger overlay/modal tier;
- avoid stacked shadows and glow effects.

### Color and semantic state

Retain the existing dark navy/charcoal identity with blue navigation/progression and green success/workout completion, but expose semantic roles rather than feature-specific raw colors:

- background / raised background / overlay;
- text / muted / disabled;
- border / strong border;
- accent / accent pressed;
- success;
- warning;
- danger;
- info;
- focus ring.

Status communication must not rely on color alone.

### Motion

Use motion only for state/navigation comprehension:

- fast control feedback: roughly 120–150ms;
- standard enter/exit/state change: roughly 180–220ms;
- larger sheet/page transition only where it improves orientation: roughly 220–280ms;
- `prefers-reduced-motion` must remove nonessential movement rather than merely shortening it.

No global spring/bounce language is proposed.

## Global versus local ownership

### Remains global

- color/type/spacing/elevation/motion tokens once demonstrated;
- reset/base document rules;
- root background/text defaults;
- safe-area custom properties if required by multiple shell components;
- accessibility utilities that are truly application-wide.

### Shared component-owned

Migrate when touched:

- `AppShell`;
- mobile bottom navigation;
- desktop navigation rail/sidebar;
- `PageHeader` or its Phase 16 replacement;
- `Button`;
- `TextField` / `SelectField`;
- `Card` only if a general Card still proves useful after flatter layouts are approved;
- shared status/banner/empty-state primitives only after at least two real surfaces demonstrate the same contract.

### Feature-local

Remain colocated with their feature:

- workout/set-entry density and lifecycle controls;
- exercise picker/library layouts;
- dashboard composition;
- Settings section composition;
- group role/admin controls;
- analytics charts;
- social feed/leaderboard layouts;
- platform-admin operational tables/actions.

## Baseline before/after reference

### Current baseline

```text
Floating translucent 6-item mobile nav
+ large marketing-like page headers
+ gradient/shadow Card as common container
+ feature-local CSS layered over legacy shared global CSS
+ small global token set
+ state patterns implemented correctly but styled independently
```

### Target direction

```text
Stable safe-area-aware 5-destination mobile nav
+ account/avatar entry to Settings
+ compact native-app page header
+ flatter sections/lists with elevation only when meaningful
+ shared shell/primitives owning their own CSS Modules
+ demonstrated typography/spacing/state/motion tokens
+ consistent state hierarchy while preserving feature-specific density
```

The target is deliberately not a generic neon fitness dashboard, not a glassmorphism reskin, and not a collection of equal-weight rounded cards.

## Proposed Phase 16 implementation order

The existing roadmap remains valid, with one practical migration rule added: shared shell/primitives should move first because every later page depends on them.

1. **16.1 App shell + primary navigation** — first implementation slice after this direction is approved.
2. **16.2 Authentication + password recovery**.
3. **16.3 Onboarding + group entry**.
4. **16.4 Home / lifting dashboard**.
5. **16.5 Active workout + set logging**.
6. **16.6 Exercise picker + exercise library**.
7. **16.7 Progress + lifting analytics**.
8. **16.8 Groups + invitations + member administration**.
9. **16.9 Competition + social activity**.
10. **16.10 Cardio accessory surface**.
11. **16.11 Platform-administration console**.
12. **16.12 System states + cross-feature polish**.
13. **16.13 Badge display + badge visual-design system**.
14. **16.14 Purposeful imagery/illustration assets**.
15. **16.15 Integration gate**.

No later page should be restyled opportunistically while implementing an earlier slice.

## Phase 16.1 concept brief

Before Phase 16.1 production code begins, concept review should answer these questions visually:

- does five-destination navigation remain comfortable at 320px widths;
- is Profile/Settings discoverable through the avatar/account action without occupying a sixth bottom-nav slot;
- does the shell feel like a mobile application rather than a compressed desktop dashboard;
- is the page title compact enough to preserve vertical space;
- how does the same hierarchy become a desktop rail/sidebar without changing product navigation;
- where can identity/achievement information live without competing with the page's primary action;
- how are offline/update/system banners inserted without shifting the whole visual hierarchy unpredictably.

The concept should use real labels and realistic product structure, but sample user names/values remain clearly non-authoritative design placeholders.

## Non-goals

Phase 16.0 does **not**:

- change `tokens.css` yet;
- move CSS selectors yet;
- rewrite `AppShell`, navigation, or any page;
- change routes;
- add a design-system dependency;
- change scoring, persistence, authorization, notification delivery, offline queues, or Supabase;
- generate final badge art;
- generate decorative banner imagery;
- mark Phase 16.1 approved without product-owner concept review.

## Exit criteria for 16.0

Phase 16.0 can move from REVIEW READY to DONE after:

- the inventory and design direction are reviewed by the product owner;
- the five-destination/mobile-account-shell direction is accepted or revised;
- the token and global/local ownership direction is accepted or revised;
- a phone-first Phase 16.1 shell concept is reviewed and explicitly approved;
- the roadmap is advanced from 16.0 to 16.1 only after that approval.

Until those conditions are met, no production visual rewrite should begin.