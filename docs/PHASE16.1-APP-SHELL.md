# Phase 16.1 — App shell + primary navigation

## Status

**IN PROGRESS — implementation complete; final source-of-truth/CI closeout pending.**

## Objective

Implement only the shared shell approved in Phase 16.0. Page-specific feature content remains visually unchanged until its dedicated Phase 16 slice.

## Implemented shell contract

- five primary destinations: Home, Lift, Groups, Progress, Compete;
- Profile/Settings removed from the primary-navigation array while the `profile` route/section remains valid;
- Cardio remains a valid secondary feature path and is not a primary-nav destination;
- compact sticky mobile account header with direct Profile/Settings access;
- edge-to-edge mobile bottom navigation with safe-area padding and no glass/floating-pill treatment;
- desktop five-destination navigation rail with account access separated from navigation and existing sign-out preserved;
- shared `PageHeader` tightened and migrated to a colocated CSS Module;
- shell/navigation styles moved into colocated CSS Modules instead of adding new selectors to legacy `global.css`;
- shared shell sizing tokens updated only where real reuse exists.

## Preserved behavior

- `ProductController` still handles `profile` by navigating to `/settings`;
- group membership remains optional and does not alter primary navigation;
- group selection remains inside Groups/Compete;
- cardio remains reachable from existing secondary entry points;
- lazy loading, PWA install/update/offline behavior, workout recovery, notifications, scoring, XP, badges, groups, and Supabase contracts are unchanged;
- no page-specific dashboard, workout, group, progress, competition, cardio, or Settings content redesign is included.

## Accessibility/responsive requirements

- navigation uses `aria-current="page"` for the active destination;
- account controls have explicit Profile/Settings accessible names;
- primary shell controls retain visible focus treatment;
- mobile controls meet the 44px touch-target floor;
- mobile nav respects the bottom safe area;
- the mobile account header respects the top safe area;
- the mobile header/nav are replaced by the desktop rail at 1024px and above;
- no horizontal shell overflow is introduced.

## Regression coverage

`AppShell.test.tsx` locks the primary-navigation and separate-account-entry behavior:

- Home remains active when selected;
- Lift maps to the existing `workouts` section;
- Groups, Progress, and Compete remain primary destinations;
- Profile is absent from primary navigation;
- the dedicated account control emits `profile` for the existing Settings route boundary.

## Validation gate

Before this phase can be marked DONE:

- TypeScript passes;
- all unit tests pass;
- all integration tests pass;
- production build/bundle passes;
- structural/internal validation passes;
- Browser E2E passes;
- Database repository-contract gate remains green;
- roadmap marks Phase 16.0 DONE and Phase 16.1 DONE, with Phase 16.2 as the next visual slice;
- final PR diff contains no temporary maintenance workflow or unrelated page redesign.
