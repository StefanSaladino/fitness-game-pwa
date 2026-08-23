# Phase 16.0 — Visual inventory + mobile design-system direction

## Status

**REVIEW READY.**

Phase 16.0 is a design/architecture checkpoint. It intentionally changes no production UI, Supabase schema, scoring rule, authorization rule, group-membership rule, notification behavior, workout reliability behavior, or PWA delivery behavior.

This version is rebuilt from the Phase 15.7 baseline. The earlier Phase 16.0 draft was closed and its branch deleted before Phase 15.7 shipped, so this document does not treat mandatory group setup as a current product truth.

## Product truths that the overhaul must preserve

The visual overhaul must not rewrite behavior merely to simplify presentation.

- lifting remains the primary product activity;
- cardio remains intentionally secondary;
- `lifting-v1` scoring remains authoritative and presentation code never recalculates it;
- **zero groups is a normal steady state**, not an incomplete onboarding state;
- completed onboarding leads to the personal dashboard whether the user belongs to 0, 1, or many groups;
- targeted group invitations remain optional and may be accepted or declined later;
- accepting or creating a group adds membership/ownership without replacing existing memberships;
- a user may simultaneously own, administer, and/or belong to multiple groups;
- the currently selected group is feature context, not global account identity;
- personal dashboard, lifting, cardio, progress, Settings, messages, and account controls remain usable with zero groups;
- Competition is honestly group-dependent and must explain that dependency to solo users without blocking the rest of the product;
- `/settings` remains the ordinary authenticated account surface;
- the Administration entry remains absent unless the user is positively authorized as an ACTIVE platform administrator;
- direct `/platform-admin/*` routes continue to re-authorize independently;
- optional notification preferences remain separate from browser/device notification permission;
- offline/recovery/conflict behavior in active workouts remains functionally unchanged;
- no visual slice may invent metrics, badge rules, rank rules, profile data, group state, or social data.

## Membership model the visual system must represent

The shell and page hierarchy must work across the full real membership cardinality:

| Membership state | Personal product | Groups surface | Competition surface |
| --- | --- | --- | --- |
| 0 groups | fully usable | optional create/invite-management state | honest group-required state |
| 1 group | fully usable | selected group administration/member view | selected group competition/social |
| 2+ groups | fully usable | stable group switcher + additive create/invite actions | stable group switcher/context |
| pending invite(s) | fully usable | actionable inbox | no automatic membership change |

A group selector therefore belongs to group-dependent feature context. It must not appear as though the entire account is “inside” one group.

## Current surface inventory

The inventory is based on the current route/composition tree after Phase 15.7, including `ProductController`, `GroupGate`, `DashboardGroupMembership`, and the existing feature-local screens.

| Surface | Current entry/component boundary | States that must survive the overhaul | Planned visual slice |
| --- | --- | --- | --- |
| Environment/configuration help | `ConfigurationHelp` | missing hosted-Supabase configuration | 16.2/support polish |
| Sign in / create account / forgot password / verification | `AuthScreen` and auth forms | idle, busy, validation, auth/server error, success/verification | 16.2 |
| Reset password | `ResetPasswordScreen` | token/session validation, busy, error, success | 16.2 |
| Profile gate | `ProfileGate` | profile loading, profile load failure/retry, incomplete onboarding, completed profile | 16.2–16.3 |
| Profile onboarding | `OnboardingScreen` | persisted profile values, validation, submit busy/error/success | 16.3 |
| Solo dashboard entry | `GroupGate` -> `ProductController` | group loading/error/retry; zero memberships proceeds with `[]` | 16.3 + 16.4 |
| Dashboard group context | `DashboardGroupMembership` | solo explanation, pending invitations, accept/decline, invitation error/retry, hidden when irrelevant | 16.4 |
| Home / lifting dashboard | `DashboardController` / `DashboardScreen` | loading, error/retry, solo/group rank context, empty history/PR states, populated weekly lifting/XP/history | 16.4 |
| Workouts / active lift | `WorkoutController` / `WorkoutSessionScreen` | no active lift, start/resume, running, paused, offline, recovering, queued mutation, conflict, finish/cancel | 16.5 |
| Exercise selector/library | `ExercisePicker` / `MuscleGroupFilter` | selector root, muscle drill-down, workout/equipment narrowing, search, recents, selected/duplicate, empty search, close/back | 16.6 |
| Cardio accessory surface | `CardioController` | log form, duration/tier context, history, loading/error/empty/success | 16.10 |
| Progress / analytics | `ExerciseProgressController` and analytics components | exercise selection, loading/error/empty, e1RM/bodyweight trend, volume, PR timeline, weekly/monthly summaries | 16.7 |
| Groups — solo state | `OptionalGroupSetupController` | create group, pending invitations, accept/decline, remain solo, loading/error/retry | 16.8 |
| Groups — member state | `GroupAdministrationController` | multi-group switching, create another group, member roster, invites, roles, leave/transfer/remove/promote/demote | 16.8 |
| Competition / social | `GroupSocialController` or optional-group state | group required when solo; multi-group switching; leaderboard periods, activity, reactions, reports | 16.9 |
| Settings | `/settings` -> `SettingsScreen` | profile/training persistence, notification master/categories, device permission states, PWA state, zero/one/many group summary, privacy/deletion, conditional Admin discovery | 16.1 shell + later Settings surface pass |
| Required user messages | `UserMessageCenter` | notice, warning, ACTION_REQUIRED, read/acknowledged/dismissed rules | 16.12 |
| Platform administration | `/platform-admin/*` -> `PlatformAdminRoute` | authorization loading/non-disclosure, capacity, accounts, moderation, messaging, destructive confirmations | 16.11 |
| Lazy-route/feature fallback | `RouteLoading` / `ProductSectionFallback` | chunk loading without fake progress | 16.1 + 16.12 |
| PWA lifecycle | shared PWA status + Settings exposure | installability, update available, offline/reconnecting, notification capability/permission/subscription | 16.1 + 16.12 |

## Current architecture findings

### 1. Membership is correctly optional in behavior, but the future visual hierarchy must stop implying one global group

`ProductController` now derives a nullable selected group from `groups[0]` only as feature context. Personal surfaces work without that context. Groups and Competition branch to an optional-group state when there is no selected group.

Direction: Phase 16 must keep personal identity and group context visually separate. A group name/switcher may appear inside Groups or Competition and in bounded group-context modules, but not as a global shell mode that makes solo users appear incomplete.

### 2. The mobile navigation is carrying too much primary chrome

The current navigation model contains six primary destinations: Home, Workouts, Groups, Progress, Compete, and Profile. The mobile implementation compresses those into equal-width navigation items. Profile/Settings is account chrome rather than a peer activity destination.

Direction: Phase 16.1 should explore **five stable primary mobile destinations maximum** and move Profile/Settings into a persistent avatar/account action. The leading candidate remains **Home, Lift, Groups, Progress, Compete**.

The navigation set should remain stable for 0/1/many-group users. A solo user selecting Compete should receive the real group-required state; the nav itself should not reshuffle and train different muscle memory depending on membership.

Cardio remains accessible as a secondary activity surface rather than being promoted merely to fill navigation.

### 3. Group invitation status deserves bounded visibility, not permanent global chrome

Phase 15.7 added a real dashboard invitation surface. When no invitation exists and the user is already in a group, it disappears. When solo, it can explain that groups are optional. When invitations exist, they are directly actionable.

Direction: preserve that conditional information architecture. A small invitation indicator may be considered for Groups navigation only if concepts prove it improves discovery; do not add a permanent “group status” bar to every screen.

### 4. Shared shell/primitives are still styled by the legacy global bucket

`src/styles/global.css` still owns presentation for the app shell, mobile nav, desktop sidebar, page headers, buttons, cards, fields, and older compatibility styling, while newer features mostly use CSS Modules.

Direction: migrate shared primitives/layout into colocated modules **when each shared component is touched**, rather than performing a big-bang global stylesheet rewrite.

### 5. The token layer is too small for a page-by-page overhaul

Current tokens do not yet provide an explicit spacing scale, typography scale, touch-target contract, elevation tiers, overlay treatment, semantic interactive states, or motion durations.

Direction: add only tokens demonstrated by the approved shell and subsequent approved pages. Do not create a speculative design-system API containing unused values.

### 6. Card/elevation treatment is too dominant

Legacy shared cards default to rounded, elevated visual containment. This makes unrelated blocks compete at similar weight.

Direction: use flatter page backgrounds, grouping, rows, spacing, and subtle dividers for ordinary content. Reserve raised surfaces for meaningful containment such as sheets/modals, focused selectable items, or genuinely grouped summaries.

### 7. Typography hierarchy is inconsistent and sometimes oversized on phones

Legacy page headers can read like marketing hero copy, while newer feature modules define their own smaller hierarchy.

Direction: establish a compact mobile app type hierarchy with fewer all-caps eyebrow labels. Page titles should orient the user without consuming a large share of the viewport.

### 8. Spacing and control geometry are not governed by one shared scale

Feature modules evolved independently. Touch targets are generally accessible, but gaps, padding, radii, section spacing, and density differ across dashboard, workout, Settings, Groups, analytics, and admin.

Direction: normalize rhythm and touch targets, not visual sameness. Dense set-entry and relaxed Settings rows may use different densities from the same underlying spacing language.

### 9. Safe-area handling exists but is not one shell contract

The product already uses `env(safe-area-inset-*)` in key places. Full-screen selectors, sticky controls, future headers, and system banners must align with a single shell-level safe-area strategy.

Direction: Phase 16.1 owns global top/bottom safe-area composition. Feature overlays add local handling only when their viewport behavior actually differs.

### 10. Loading/error/empty/offline feedback is semantically sound but visually fragmented

The application already has real loading, retry, offline/recovery, conflict, success, required-message, and notification-device states.

Direction: converge progressively on a small state hierarchy: inline status, section empty state, blocking/retry state, persistent system banner, transient confirmation, and destructive confirmation. Do not flatten meaningful differences just to reuse a component.

### 11. Identity and achievements need reserved space before badge artwork exists

Profile pictures and badge data are real. Phase 16.13 owns final badge artwork/presentation.

Direction: reserve appropriate identity/achievement locations without inventing decorative badge art or leaving fake empty placeholders.

## Proposed mobile app shell direction

Phase 16.1 should explore this anatomy before implementation:

```text
┌─────────────────────────────────────┐
│ safe area                           │
│ Page title / context       avatar   │  <- Settings/account
│ optional page-owned subcontext      │
├─────────────────────────────────────┤
│                                     │
│ page-owned content                  │
│ personal by default                 │
│ group context only where relevant   │
│                                     │
│ enough bottom clearance             │
├─────────────────────────────────────┤
│ Home   Lift   Groups Progress Compete│
│ safe-area inset                     │
└─────────────────────────────────────┘
```

Shell principles:

- phone composition first;
- one stable avatar/account action gives access to `/settings`;
- the account action is present for solo and grouped users alike;
- no global group selector is added to the shell;
- group switching belongs to group-dependent surfaces;
- no hidden Admin affordance appears unless Settings positively discovers ACTIVE platform-admin access;
- primary navigation labels remain readable at 320px-class widths;
- navigation destinations do not appear/disappear merely because group membership changes;
- active navigation is communicated by more than color alone;
- bottom navigation is safe-area aware without visually dominating content;
- page headers are compact and may become sticky only when the page benefits from it;
- feature-specific destructive/privileged actions remain feature-owned;
- active workout lifecycle remains feature-owned;
- no generic global floating-action button is introduced.

## Desktop/tablet adaptation

The existing breakpoints remain the starting compatibility contract:

- **phone:** below 700px;
- **tablet:** 700–1023px;
- **desktop:** 1024px and above.

Direction:

- phone remains the canonical information order;
- tablet may widen modules or introduce two-column composition where scanning improves;
- desktop may use a persistent rail/sidebar representing the same navigation hierarchy;
- desktop must not expose unique core feature access missing from mobile;
- bounded readable widths remain appropriate for forms and Settings;
- analytics/admin may use more horizontal space where real data density justifies it;
- multi-group selection must remain obvious on desktop without turning the entire shell into a group workspace.

## Proposed restrained token direction

These are directions, not an instruction to add every token immediately.

### Spacing

Use a 4px base rhythm with demonstrated values:

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48`

Common mobile targets:

- page horizontal inset: 16px narrow, 20–24px when space allows;
- section gap: 24–32px;
- control/row internal gap: 8–12px;
- compact data row vertical padding: 10–12px;
- relaxed Settings/form row padding: 14–16px.

### Touch targets

- interactive target minimum: 44px;
- primary controls/form fields generally remain 48px or taller;
- icon-only controls require an accessible name and a 44px interaction box.

### Typography

Target mobile roles:

- micro/status: 12px;
- secondary/meta: 13–14px;
- body/control: 16px;
- section heading: 18–20px;
- page title: 26–30px;
- numeric emphasis: typically 28–36px when the metric deserves emphasis.

### Radius

Use fewer radius tiers:

- compact control: ~10–12px;
- grouped surface: ~14–16px;
- sheet/modal: ~18–22px;
- pill geometry only for true chips/statuses/toggles.

### Borders and elevation

- low-contrast 1px dividers/borders for ordinary grouping;
- no shadow for ordinary flat sections;
- one restrained raised-surface tier;
- one stronger modal/overlay tier;
- no glow language.

### Color and semantic state

Retain the dark navy/charcoal identity with blue navigation/progression and green success/workout-completion roles, exposed semantically as:

- background / raised background / overlay;
- text / muted / disabled;
- border / strong border;
- accent / accent pressed;
- success / warning / danger / info;
- focus ring.

Status communication must not rely on color alone.

### Motion

Use motion only for comprehension:

- control feedback: roughly 120–150ms;
- ordinary state enter/exit: roughly 180–220ms;
- larger sheet/page transition only when orientation benefits: roughly 220–280ms;
- `prefers-reduced-motion` removes nonessential movement.

No global spring/bounce language is proposed.

## Global versus local ownership

### Remains global

- demonstrated color/type/spacing/elevation/motion tokens;
- reset/base document rules;
- root background/text defaults;
- shared safe-area custom properties if multiple shell components need them;
- truly application-wide accessibility utilities.

### Shared component-owned

Migrate when touched:

- `AppShell`;
- mobile bottom navigation;
- desktop navigation rail/sidebar;
- compact page-header replacement;
- `Button`;
- `TextField` / `SelectField`;
- `Card` only if a general Card still proves useful;
- status/banner/empty-state primitives only after at least two real surfaces demonstrate the same contract.

### Feature-local

Remain colocated:

- workout/set-entry density and lifecycle controls;
- exercise picker/library;
- dashboard composition and optional group-invitation module;
- Settings composition;
- group selection, invitation, role/admin controls;
- Competition/social group context;
- analytics charts;
- platform-admin operational views.

## Baseline before/after reference

### Current baseline

```text
6-item mobile navigation
+ Profile treated as a primary destination
+ group context selected inside ProductController
+ solo mode functionally valid but visually added after the original shell
+ large/legacy shared page-header and card language
+ feature CSS Modules layered over substantial global shared CSS
+ small global token set
+ correct but visually fragmented system states
```

### Target direction

```text
stable max-5 primary mobile destinations
+ account/avatar entry to Settings
+ solo-first personal shell for every user
+ group context only inside group-dependent surfaces
+ compact app-like page header
+ flatter sections/lists with elevation only where meaningful
+ shared shell/primitives owning colocated styles
+ demonstrated spacing/type/state/motion tokens
+ consistent state hierarchy without erasing feature-specific density
```

The target is deliberately not a generic neon fitness dashboard, glassmorphism reskin, or collection of equal-weight rounded cards.

## Phase 16 ordering after Phase 15.7

1. **16.1 App shell + primary navigation** — after concept approval.
2. **16.2 Authentication + password recovery**.
3. **16.3 Onboarding + optional group discovery** — onboarding ends at personal product; invitation/create-group discovery is optional.
4. **16.4 Home / lifting dashboard** — includes solo/group-context invitation treatment.
5. **16.5 Active workout + set logging**.
6. **16.6 Exercise picker + exercise library**.
7. **16.7 Progress + lifting analytics**.
8. **16.8 Groups + invitations + member administration** — zero/one/many memberships.
9. **16.9 Competition + social activity** — explicitly group-dependent.
10. **16.10 Cardio accessory surface**.
11. **16.11 Platform-administration console**.
12. **16.12 System states + cross-feature polish**.
13. **16.13 Badge display + badge visual-design system**.
14. **16.14 Purposeful imagery/illustration assets**.
15. **16.15 Integration gate**.

No later page should be restyled opportunistically during an earlier slice.

## Required roadmap reconciliation before merge

The current roadmap still contains pre-15.7 wording in Phase 16.3. Before Phase 16.0 is merged, the roadmap must explicitly record Phase 15.7 as DONE and change 16.3 from mandatory-looking group entry to optional group discovery/invitation handling. Historical Phase 5 wording remains historical and must not be rewritten as though it never shipped.

## Phase 16.1 concept brief

Before Phase 16.1 production code begins, concept review must answer visually:

- does the stable five-destination candidate remain comfortable at 320px widths;
- is Profile/Settings discoverable through the avatar/account action without occupying a sixth bottom-nav slot;
- does the shell look complete for a user with **zero groups**;
- does a pending invitation attract enough attention without turning Groups into mandatory onboarding;
- can multi-group context be switched inside Groups/Compete without making one group look globally selected for the whole account;
- does the shell feel like a mobile application rather than compressed desktop UI;
- is the page title compact enough to preserve useful vertical space;
- how does the same hierarchy become a desktop rail/sidebar;
- where can identity/achievement information live without competing with primary actions;
- how are offline/update/system banners inserted without destabilizing layout.

Concepts should use real labels and real product states. Any sample names/values are non-authoritative design placeholders.

## Non-goals

Phase 16.0 does **not**:

- change `tokens.css` yet;
- move CSS selectors yet;
- rewrite `AppShell`, navigation, dashboard, Groups, or any production page;
- change routes;
- change Phase 15.7 membership behavior;
- add a design-system dependency;
- change scoring, persistence, authorization, notification delivery, offline queues, or Supabase;
- generate final badge art;
- ship decorative banner imagery;
- approve Phase 16.1 without product-owner concept review.

## Exit criteria for 16.0

Phase 16.0 can move from REVIEW READY to DONE only after:

- the corrected post-15.7 inventory is reviewed;
- the stable navigation/account-shell direction is accepted or revised;
- solo and multi-group information hierarchy is accepted or revised;
- token and global/local ownership direction is accepted or revised;
- the roadmap is reconciled to Phase 15.7;
- a phone-first Phase 16.1 shell concept is generated, reviewed, and explicitly approved;
- no production shell rewrite starts before that approval.
