# Fitness Game PWA — v0.12.1

Current checkpoint: **Phase 13 — Lifting analytics is complete**. Phase 13A provides per-exercise progression analytics; Phase 13B adds personal weekly/monthly lifting summaries over authoritative completed strength history.

## Phase 13B highlights

- Added a focused authenticated `get_my_lifting_calendar_summaries` RPC instead of issuing one history request per exercise.
- Returns 12 weekly and 6 monthly calendar buckets by default, including zero-activity periods for honest trend context.
- Summaries include completed lifting sessions, distinct exercises, completed working sets, analytics-only external-load volume, and true PR counts.
- PR totals reuse the authoritative progression-observation stream and exclude first-observation baselines.
- Calendar anchoring uses the signed-in profile timezone.
- Added current-versus-previous week/month deltas plus weekly and monthly volume charts.
- Calendar-summary loading/error state is isolated so Phase 13A per-exercise analytics still works if this aggregate read fails.
- Added responsive browser coverage across desktop Chromium, Android-class Chromium, and iPhone-class WebKit.

## Supabase for v0.12.1

Apply:

```text
supabase/migrations/20260822000100_lifting_calendar_summaries.sql
```

New database test:

```text
supabase/tests/027_lifting_calendar_summaries.test.sql
```

The RPC is read-only and authenticated-user scoped. There are **no scoring/XP changes**, no new workout write path, and no cross-user analytics.

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

See `docs/ROADMAP.md`, `docs/PHASE13A-PER-EXERCISE-LIFTING-ANALYTICS.md`, and `docs/PHASE13B-WEEKLY-MONTHLY-LIFTING-SUMMARIES.md`.
