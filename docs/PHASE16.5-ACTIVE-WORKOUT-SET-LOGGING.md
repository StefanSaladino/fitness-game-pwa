# Phase 16.5 — Active workout + set logging

## Status

**DONE.**

Composition note: Phase 16.10A.2 subsequently removed the decorative workout photograph, consolidated timer/session/sync context into one contained task rail, changed phone set cards into one bounded app list, and added a Finish confirmation. The lifecycle, set-entry, recovery, and accessibility behavior documented below remains authoritative; current composition is defined in `docs/PHASE16.10A-APP-COMPOSITION-RESET.md`.

Phase 16.5 applies the approved Top Set visual system to the real active lifting workflow without changing lifting-v1 scoring, workout persistence semantics, mutation ordering, recovery ownership, or Supabase lifecycle contracts.

## Approved visual contract

The active workout is deliberately task-first rather than dashboard-like:

- near-black application background with charcoal workout surfaces;
- warm Top Set orange for primary interaction, active focus, and the single Finish workout action;
- green only for real completed/synced success state;
- no decorative workout photograph in the current active-task flow; the live timer and session state own the primary surface;
- elapsed time is large and readable in a compact session strip but has no progress bar because no duration target exists;
- no planned-set progress bar because the workout has no authoritative total-set denominator;
- no fake volume totals, RPE, notes, calories, rest countdown, workout recommendation, target duration, coaching, or completion forecast;
- phone-first dense logging with a wider desktop adaptation that adds density, not features.

## Real workout lifecycle preserved

The screen continues to use the existing workout lifecycle services and intent timestamps:

- active-session recovery;
- immediate visible pause intent and resume intent timing;
- persisted running/paused state;
- Finish workout through the existing finish RPC;
- Cancel workout through the existing cancel RPC;
- scoring date and started time from the active workout session;
- no Save & Exit action because local recovery already preserves an active session.

Phase 16.5 added a UI confirmation boundary before calling the already-existing cancel pathway. Phase 16.10A.2 applies the same boundary to Finish. The safe action receives initial focus and neither lifecycle path mutates server state until explicitly confirmed.

## Exercise sections

Exercise ordering and composition remain server-backed and unchanged.

The presentation now provides:

- a compact exercise toolbar with kg/lb and Add exercise kept together;
- one locally expanded exercise section at a time to reduce phone scroll;
- move-up, move-down, and remove actions shown only for the expanded exercise so collapsed rows stay clean;
- Add exercise remains a real server-backed composition action;
- exercise-picker result cards reuse the active-workout icon / identity / action pattern instead of the older flat-row layout;
- picker results use the same approved common-lift silhouettes and generic-weight fallback as the workout exercise list;
- picker Add/Added controls retain a thumb-friendly 44px target and use orange only for the available add action;
- the existing kg/lb display-unit switch;
- canonical exercise name plus authoritative measurement type;
- dedicated mini silhouettes for a small set of recognizable common lift families;
- a generic weight icon for catalogue exercises without an approved dedicated silhouette.

The mini-icon assets are normalized from the product-owner-approved exercise silhouette reference. They are decorative, monochrome, and never communicate exercise state by themselves.

## Dense per-set logging

The existing set contract remains authoritative:

- Warmup / Working type editing;
- weight + reps for weighted exercises;
- Bodyweight / Added weight / Assisted modes for bodyweight-repetition exercises;
- independent set drafts;
- kg/lb display conversion back to canonical kilograms before persistence;
- add working set;
- add warmup;
- copy individual set;
- copy last set;
- delete set;
- mark complete / reopen;
- existing validation before completion.

On phones, set logging deliberately stops behaving like a compressed desktop table. Sets live in one bounded app list, and each row has a stable reading order: set/type/completion, then the authoritative load/reps fields, then copy/delete actions. Field labels become visible on phone layouts, completion/copy/delete retain approximately 44px targets, and no set row depends on horizontal clipping. The active editing row gains a restrained orange focus treatment, the primary Add working set action is filled orange, and bodyweight rows reflow vertically when their additional mode/load controls are present.

## Reliability states

The existing IndexedDB recovery and ordered mutation queue remain unchanged.

The active screen gives those real states a single consistent status surface:

- a quiet `Synced` acknowledgement during the normal healthy state;
- Offline workout copy;
- Recovering workout;
- Local workout copy;
- queued changes;
- replaying changes;
- blocked sync with Retry sync;
- revision conflict with Use server version.

Offline behavior remains intentionally bounded: existing set drafts and completion/reopen saves use the same queued set-edit pathway where the recovery contract permits it, while structural changes, pause/resume, finish, and cancel wait for a safe server mutation boundary.

## Responsive behavior

### Phone

- title and pause/resume remain immediately reachable;
- timer, pause/resume, start time, scoring date, and healthy sync state share one contained sticky task rail;
- elapsed time, Started, and Scoring date share one compact strip without repeating a redundant Timer state field;
- the normal Synced state remains visually quiet while offline/recovery/conflict states keep explicit banners;
- collapsed exercise cards show only the approved silhouette, full wrapping exercise name, measurement type, and chevron;
- the expanded exercise identity remains sticky while its management actions sit in a separate row instead of competing for header width;
- set logging uses phone-native vertical cards with visible field labels and touch-sized controls rather than a squeezed desktop spreadsheet;
- long exercise names wrap in both the active workout and Add exercise picker;
- picker Add/Added actions occupy a stable second row on phones so exercise identity is never clipped;
- Finish workout is the single primary page action;
- Cancel workout is secondary and confirmation-gated;
- the shared Home / Lift / Groups / Progress / Compete bottom navigation remains authoritative.

### Desktop

- the shared desktop navigation rail remains authoritative;
- the timer/session task rail spans the active content column;
- the active workout canvas expands toward 1280px where available;
- set rows use available width rather than inventing analytics;
- the same exercise ordering/actions and lifecycle controls are preserved.

## Accessibility

- pause/resume retains explicit accessible button names;
- exercise expansion uses `aria-expanded` and `aria-controls`;
- exercise silhouettes are decorative with empty alternative text;
- set inputs retain explicit accessible names even when compact visual headers are used;
- completed state includes a real check and accessible action label rather than color alone;
- the cancel confirmation is an `aria-modal` dialog;
- **Keep workout** receives initial focus;
- Tab/Shift+Tab are contained within the confirmation;
- Escape dismisses the cancel confirmation while cancellation is not running;
- the underlying workout content is inert and hidden from the accessibility tree while the confirmation is open;
- focus returns to the Cancel workout trigger after dismissal when that trigger still exists.

## Validation expectations

Phase 16.5 should pass the project-local gate:

- `npm run typecheck`;
- `npm test`;
- `npm run test:integration`;
- `npm run build`;
- `npm run test:structure`;
- `npm run test:internal`;
- `npm run db:test:ci`;
- `npm run test:e2e`.

The installed PWA shell cache advances from `v14-0` to `v14-1` so the redesigned workout UI and exercise-icon assets are picked up by existing installations.

No database migration, hosted SQL mutation, Edge Function deployment, scoring change, XP change, badge-award change, or ranking change is required for Phase 16.5.

## Next visual slice

Phase 16.6 — Exercise picker + exercise library.

## Interaction correction

- The first available exercise may open when the workout initially loads, but users can collapse it and leave every exercise collapsed. The UI never forces a card back open after that.
- Offline recovery keeps the visible `Offline workout copy` identity while separately showing queued-change count.
