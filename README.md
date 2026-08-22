# Fitness Game PWA — v0.12.0

Current checkpoint: **Phase 13A — Per-exercise lifting analytics**. The approved lifting-analytics visual direction is now implemented on top of the authoritative Phase 8 progress history. Phase 13 remains in progress; **13B weekly/monthly lifting summaries is next**.

## Phase 13A highlights

- Added lift-by-lift comparable progression charts for e1RM and plain-bodyweight rep metrics.
- Added per-session volume-history charts plus total exercise volume; volume remains analytics-only and never awards XP.
- Added true best completed working-set weight and best reps derived across exercise history.
- Added a dedicated baseline / PR / current-PR timeline.
- Existing exercise frequency and last-performed context remain visible beside the new analytics.
- Added-weight and assisted bodyweight work remains visible for analytics without being mixed into plain-bodyweight progression comparisons.
- Added a responsive browser fixture across desktop Chromium, Android-class Chromium, and iPhone-class WebKit.
- Analytics derivation is a pure feature layer over the existing authenticated progress read models.

Next roadmap slice: **Phase 13B — Weekly/monthly lifting summaries**.

## Supabase for v0.12.0

No new Supabase migration is required for Phase 13A. The existing `get_my_exercise_progress_overview` and `get_my_exercise_progress_history` read models already expose the authoritative session metric, volume, frequency, and PR data required for this slice.

## Validation

Run the complete checkpoint gate before committing:

```powershell
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:e2e
npm run test:internal
```

Phase 13A changes analytics presentation only. There are **no scoring/XP changes**, no social comparison, and no new workout write path.

See `docs/ROADMAP.md` and `docs/PHASE13A-PER-EXERCISE-LIFTING-ANALYTICS.md`.
