# Phase 16.10A — Application-composition reset

## Purpose

The Phase 16 page passes improved individual surfaces, but the authenticated product still read as a responsive website in several important places. Page-owned gutters stacked on shell gutters, unrelated categories were separated only by thin rules, mobile controls sometimes exposed browser-default menus, and Settings presented every concern in one continuous document.

Phase 16.10A resets those composition rules without changing product behavior. The work is cumulative and page-bounded: shared rules are established first, Home and Settings prove them, and the remaining routes migrate in focused follow-up slices.

## Slice 16.10A.1 — foundation, Home, and Settings

Status: **DONE in the offline cumulative patch; not published**.

Delivered:

- one authenticated shell gutter and content-width owner, removing feature-level double padding;
- shared spacing, category-gap, surface-padding, row-height, radius, and navigation-height tokens;
- horizontal overflow prevention at the document/root boundary;
- hidden mobile scrollbar chrome while preserving normal vertical page scrolling;
- an explicit `data-app-scroll-owner` on the authenticated shell main region;
- a shared SelectField that presents an anchored listbox on desktop and a safe-area-aware bottom sheet on narrow phones;
- migration of every current raw select call site to the shared control while retaining a hidden native select for form names, values, disabled/required state, and React change handlers;
- a Home composition built from bounded functional regions instead of a marketing-style photo hero and divider-only category transitions;
- a Settings category index with focused drill-in panels instead of an uninterrupted account/preferences/security/privacy document;
- shared charcoal/orange Settings styling in place of the isolated navy/blue palette;
- structural and component tests for the new contracts.

## Slice 16.10A.2 — Lift task flow

Status: **DONE in the offline cumulative patch; not published**.

Delivered:

- a contained pre-workout surface with one dominant empty-lift action, clearly separate preset rows, and secondary cardio/training-tip regions;
- one active-session task rail that owns the running/paused title, elapsed timer, start/scoring context, and healthy sync acknowledgement without a decorative workout banner;
- explicit substantial offline, local-only, recovering, queued, blocked, and revision-conflict surfaces while preserving the existing recovery and ordered-mutation contracts;
- one exercise workspace surface with contained expandable exercise sections and a phone-first kg/lb plus Add exercise action row;
- mobile set entry as one bounded app list: each set has an independent vertical reading order, visible Type/Mode/Weight/Reps labels, touch-sized completion and row actions, and no horizontal scroll dependency down to 320px;
- a sticky phone lifecycle dock above the authoritative bottom navigation, with Finish remaining the primary task action;
- separate Finish and Cancel confirmation sheets on phones and centered dialogs on desktop, safe action focused first, contained keyboard focus, Escape dismissal, and focus restoration;
- an opaque full-height mobile exercise-library route with sticky app chrome, substantial Recent/Browse/result-group surfaces, internal native scrolling without visible scrollbar chrome, background-scroll lock, Escape back/close behavior, focus containment, and opener focus restoration;
- component, integration, 320px browser-contract, and structural regression coverage.

The slice changes only presentation and confirmation boundaries. Exercise identity, search/ranking, preset ownership, set persistence, mutation ordering, recovery, lifecycle RPCs, scoring, and database behavior remain authoritative and unchanged.

## Slice 16.10A.3 — Progress + Cardio

Status: **DONE in the offline cumulative patch; not published**.

Delivered:

- removed the original oversized Progress photo hero and replaced it with a compact, contained lifting-analytics identity surface;
- separated calendar load, tracked-lift selection, selected-lift summary, comparable/volume trends, PR milestones, and lift-by-lift history into bounded functional regions;
- kept Week/Month controls with the calendar summary and kept the tracked-lift rail inside its own surface, with scrollbar chrome hidden and no document-level horizontal overflow;
- contained every native SVG chart inside its parent at phone widths and changed 320px metric layouts from compressed mini-grids to readable app rows;
- retained added-weight and assisted bodyweight work in analytics volume/history while keeping it out of comparable plain-bodyweight progression;
- rebuilt Cardio as a contained accessory flow: compact relationship header, primary quick-log task, separate authoritative summary, and separate recent-history list;
- changed the seven real activity choices into a touch-sized, internally scrolling app rail without replacing them with a fake dropdown;
- moved duration, tier context, optional notes, and the single Log cardio action into one bounded task surface;
- made Cardio summary/history rows reflow vertically at narrow widths, with touch-sized delete actions and no row-to-row bleed;
- added component, structural, deterministic browser-fixture, and explicit 320px overflow/containment coverage.

This slice changes only layout and presentation. Calendar/exercise read models, comparable-metric rules, Cardio categories, minimums, 5/10/15 XP tiers, best-of-day semantics, logging/deletion services, persistence, and scoring remain unchanged.

## Slice 16.10A.4 — Groups + Competition + Social

Status: **DONE in the offline cumulative patch; not published**.

Delivered:

- replaced the horizontal Groups and Competition context rails with the shared SelectField, yielding an anchored desktop menu and bottom-sheet mobile selector without document-level horizontal scrolling;
- rebuilt Groups around one selected-group context and three focused task views: Members, Invites, and Settings;
- kept roster actions behind the existing focus-managed member sheet and preserved owner/admin/member capability boundaries plus explicit remove/ownership-transfer confirmations;
- moved incoming and outgoing invitations into one bounded task view, kept invitations person-specific, and retained the existing username/invite-ID flow without reusable join codes;
- separated group identity/rename, additional-group creation, and the signed-in user's membership into distinct Settings surfaces;
- rebuilt Competition around separate Standings and Activity views instead of simultaneously rendering both as a long two-column/web-document composition;
- retained This week/All time inside Standings, kept the signed-in member's standing pinned above the full leaderboard, and retained quiet report controls for other users;
- kept the summary-only privacy boundary visibly separate from the activity feed, and contained feed identity, summary, reactions, reports, and load-more behavior down to 320px;
- added component, integrated product-journey, structural, deterministic browser-fixture, and explicit 320px overflow coverage.

This slice changes no group membership, invitation, role, ranking, feed, reaction, report, scoring, persistence, authorization, RLS, RPC, or database behavior.

## Slice 16.10A.5 — Auth + Onboarding + Admin + system integration

Status: **DONE in the final offline cumulative patch; not published**.

Delivered:

- retained the authentication photograph and Top Set identity while reducing the mobile promotional region so the active sign-in, registration, recovery, verification, configuration, and password-reset task remains in the first phone viewport;
- rebuilt onboarding as three focused views—Identity, Training preferences, and Goal—with visible progress, per-step validation, Back/Continue navigation, and one safe-area-aware mobile action rail;
- preserved onboarding as one final atomic profile submission; no partial profile, fake server step, group side effect, or persistence change was introduced;
- converted public legal pages to the same sticky app bar and substantial document-surface language while preserving correct long-form vertical scrolling;
- replaced the separate navy/green administration identity and retired Workout Game label with the shared Top Set shell, tokens, surfaces, focus treatment, and responsive navigation;
- retained one-pane mobile and two-pane desktop directory/detail behavior for Users and Moderation, removed horizontal mobile filter rails, and gave Capacity and Messages distinct substantial task/history surfaces;
- introduced a shared bounded state surface for loading, error, recovery, and empty geometry, and updated route-level loading to use the same app-owned state language;
- moved platform messages to an app-chrome inbox trigger and shared mobile-sheet/desktop-dialog system, removing the competing unread bottom banner;
- aligned install, update, offline, and storage notices with the same top notice rail and corrected all remaining public PWA product naming to Top Set;
- added component, structural, deterministic browser-fixture, and explicit 320px overflow coverage for Auth, Onboarding, Legal, and Admin.

This slice changes presentation and view sequencing only. Authentication, password recovery, profile validation/submission, platform-admin authorization, account actions, capacity telemetry, moderation review, messaging delivery, PWA lifecycle behavior, RLS, RPCs, migrations, scoring, and persistence remain authoritative and unchanged.

## Slice 16.10A.6 — visual integration, route access, and live Admin data

Status: **DONE in the offline cumulative patch; not published**.

Delivered:

- introduced one shared compact destination-banner primitive and reused the repository's optimized fitness photography on Home, Lift start, Cardio, Progress, Groups, and Compete;
- kept banner imagery decorative (`alt=""`), protected text with a substantial scrim, and retained bounded app-surface geometry instead of reintroducing full-viewport marketing heroes;
- kept active workout, Settings, Legal, and Administration image-free because those task and operational screens benefit from higher information density;
- assigned canonical direct paths to every product destination: `/`, `/lift`, `/cardio`, `/groups`, `/progress`, and `/compete`, while preserving the previous `?section=` links as redirects;
- moved the platform-message trigger into a real shell action slot so it cannot cover Settings, and added a separate one-tap mobile Sign out action to the app header plus the Settings account summary;
- removed nested `main` landmarks from AppShell-owned workout screens and retained one shell-owned scroll/padding boundary;
- made the administrator Overview explicitly identify its successful guarded Supabase project-RPC connection and continue to show only returned real measurements;
- deferred the Netlify capacity invocation by default; it remains fail-closed and can be enabled later with `VITE_NETLIFY_CAPACITY_ENABLED=true` after its server adapter is configured;
- repaired the browser gate at its root: the reliability fixture now starts with an incomplete set, and the PWA lifecycle assertion now uses the current Top Set product name;
- added structural checks for canonical paths, header action ownership, nested landmarks, purposeful destination media, Supabase Overview copy, and the deferred Netlify boundary.

This slice adds no migration, RLS policy, RPC, Edge Function, provider credential, hosted Supabase write, Netlify deployment, scoring change, or persistence change.

## Mobile composition contract

- The shell owns the page gutter. Feature pages may arrange content inside it but must not add another viewport-width gutter.
- Major categories require both space and a substantial surface/background change. A one-pixel line alone is not a category boundary.
- Dividers remain appropriate between rows that belong to the same category.
- Mobile pages keep one primary action visually dominant. Secondary actions must not compete with it.
- The bottom navigation and any fixed sheet include safe-area padding.
- Vertical scrolling remains native. Scrollbar chrome is hidden on mobile, horizontal document overflow is prohibited, and page-level `overflow: hidden` must not be used to mask layout defects.
- Touch targets should meet or exceed the shared 44–56px control/row rhythm.
- Desktop adapts the same hierarchy with wider grids or anchored overlays; it does not define the mobile information order.

## Select interaction contract

- The trigger exposes combobox semantics, current value, disabled state, expanded state, and associated label/hint/error text.
- Desktop uses an app-styled anchored listbox.
- Mobile uses a fixed bottom sheet and backdrop, with a bounded internally scrolling option list and no visible scrollbar chrome.
- Longer option collections receive a search field.
- Escape dismisses the menu and focus returns to the trigger.
- The hidden native select preserves existing service/form event contracts; no settings, workout, moderation, or administrator behavior is reimplemented in the visual component.

## Home information hierarchy

1. Current training context and the real Start Lift action.
2. Weekly lifting completion and the existing XP breakdown in one related surface.
3. Recent lifting sessions and personal-record progression as separate functional regions.
4. Consistency/badges and group ranking as separate lower-priority regions.
5. Existing group support content.

The old plate-banner hero composition remains retired. A compact bounded plate image now provides destination identity behind the existing training context and actions. No recommendation, level, XP goal, coaching claim, or other unsupported data was added.

## Settings information hierarchy

The root screen is now an index of three clearly separated categories:

| Category | Destinations |
| --- | --- |
| Account | Profile, Security |
| Training & preferences | Training, Notifications, Groups |
| App & control | App status, Privacy & data, conditional Administration |

Each row opens one focused panel. Back returns to the index; Back from the index returns to the product. Administration remains completely absent unless the existing access hook positively confirms an ACTIVE platform administrator. Notification account preferences and device permission remain separate, and all existing persistence/security services remain authoritative.

## Responsive page inventory and migration queue

| Surface family | Current reset status | Next composition focus |
| --- | --- | --- |
| Authenticated shell/navigation | Foundation complete | Verify every migrated page uses shell-owned gutter/scroll rules |
| Home/dashboard | 16.10A.1 complete | State and real-device visual verification during integration |
| Settings/profile/security/notifications/groups/app/privacy | 16.10A.1 complete | State and real-device visual verification during integration |
| Workout start, active workout, set logger, exercise picker | 16.10A.2 complete | State and real-device visual verification during integration |
| Progress and cardio | 16.10A.3 complete | State and real-device visual verification during integration |
| Groups, invitations, competition, social activity | 16.10A.4 complete | State and real-device visual verification during integration |
| Authentication, recovery, onboarding | 16.10A.5 complete | Real-device keyboard and browser visual verification before publication |
| Platform administration and moderation | 16.10A.5 complete | Real-data operational visual verification before publication |
| Legal, system, empty/loading/error/offline/conflict states | 16.10A.5 complete | Real-device focus and notice-stacking verification before publication |

## Explicit non-goals

- no scoring, XP, badge-award, workout, group, notification, authorization, or persistence changes;
- no Supabase migration, RLS change, Edge Function, hosted database action, or generated database type change;
- no new product metric, recommendation, reminder schedule, data export, or other unsupported feature;
- no decorative gradient, glow, glass treatment, oversized marketing hero, newly generated imagery, or imagery on focused operational screens;
- no GitHub push, deployment, or release-version bump.

## Validation

The slice adds `scripts/validate-phase16-app-composition.cjs` to `npm run test:structure`. It checks the shared tokens/scroll owner, mobile overflow/scrollbar contract, custom select ownership, complete raw-select migration, canonical product routes, single-main landmark ownership, Home containment, Settings drill-in structure/palette, non-overlapping header action slots, purposeful destination media, Lift start/session/category boundaries, lifecycle confirmations, sticky/safe-area action ownership, 320px set containment, exercise-picker focus/scroll behavior, Progress surface/chart/history containment, Cardio quick-log/accessory separation, Groups context/task separation, Competition Standings/Activity separation, Auth first-viewport composition, focused Onboarding steps, Legal document surfaces, Supabase-backed Admin Overview and deferred Netlify boundary, shared state geometry, system notices/sheets, and product copy. Documentation remains review material and is intentionally not an executable release gate.

The full repository gate remains the authority before publication. Because this slice contains no database change, `npm run db:test:ci` is a static repository-contract check only; no hosted Supabase action is required.
