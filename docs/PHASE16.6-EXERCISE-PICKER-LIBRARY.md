# Phase 16.6 — Exercise picker + exercise library

Status: **IN PROGRESS**

## Approved visual direction

Phone-first exercise selection keeps the existing canonical exercise/search behavior while reducing card-wall presentation.

- Full-height opaque exercise library surface.
- Search-all is the first navigation affordance.
- Recents appear before browse categories for faster repeat logging.
- Muscle-group anatomy artwork is used as open, borderless navigation rather than individual cards.
- Detail views keep search and workout-type narrowing together in sticky picker chrome.
- Workout/equipment types use horizontally scrollable text-first filters with explicit selected state.
- Exercise results use flat rows with separators, canonical identity, existing exercise mini-icons, and one Add/Added action.
- Desktop preserves the same hierarchy in a wider right-side sheet rather than inventing a desktop dashboard.

## Preserved contracts

- Canonical exercise IDs remain the only add identity.
- Alias/typo-tolerant search and ranking remain unchanged.
- Muscle-group drill-down and search-all remain separate paths.
- Recents continue to come from persisted completed-workout usage.
- Already-selected exercises remain disabled as Added.
- Escape returns from a detail view before closing from the home view.
- Background scrolling remains locked while the picker is open.
- Favorites remain out of scope for this slice.
- No scoring, workout persistence, database, or offline/recovery behavior changes.
