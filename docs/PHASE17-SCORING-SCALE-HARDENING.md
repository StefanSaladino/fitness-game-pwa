# Phase 17 — Scoring Scale Hardening

Status: **IMPLEMENTED, LOCAL VALIDATION REQUIRED**

This change optimizes two scale-sensitive paths without changing scoring rules.

## 1. Chronological suffix reconciliation

The existing `public.reconcile_lifting_v1_scoring_for_user(uuid)` remains the full authoritative repair/audit oracle.

Normal source-change triggers now call a private suffix reconciler using the earliest affected scoring date. The suffix reconciler:

1. preserves all derived scoring/progress observations before the cutoff,
2. re-evaluates qualification in the affected source suffix,
3. deletes and regenerates `lifting-v1` scoring events from the cutoff onward,
4. deletes and regenerates progress observations from the cutoff onward,
5. seeds personal-best state from preserved prefix observations,
6. walks the suffix in the same chronology with the same E1RM/bodyweight thresholds,
7. applies the same per-exercise and 30-XP daily progression caps,
8. rebuilds the small current `exercise_progress` snapshot.

Editing an older workout can still change later progress XP. That behavior is correct and preserved.

The pgTAP parity contract deliberately edits a historical PB and verifies that:
- obsolete earlier progress XP disappears,
- later XP changes against the corrected prior PB,
- unaffected prefix scoring rows remain untouched,
- suffix scoring events, progress observations, and current PB state exactly match a subsequent full rebuild.

## 2. Bounded mutation idempotency retention

Client automatic replay lifetime: **30 days**.

A queued mutation older than 30 days:
- is not sent to Supabase,
- is marked failed with an explicit expiration reason,
- stays visible/recoverable instead of being silently discarded,
- does not increment the server-attempt count.

Server successful receipt retention: **90 days**.

A daily private pg_cron job removes only receipts that:
- completed more than 90 days ago, and
- belong to a workout no longer `IN_PROGRESS`.

Receipts for active workouts are retained regardless of age.

Receipt cleanup never touches workout source rows, scoring events, progress observations, PB state, weekly state, or badges.

## Scoring guarantee

For the same workout history:

> optimized suffix reconciliation = full authoritative reconciliation

The scoring formula, qualification rules, 125 XP daily ceiling, 30 XP progress ceiling, Epley thresholds, bodyweight thresholds, and canonical exercise rules are unchanged.

## Deployment

Do not deploy this migration to hosted Supabase until:
- TypeScript/unit tests are green,
- the structural validator is green,
- the canonical database test gate including `046_phase17_scoring_scale_hardening.test.sql` is green,
- hosted migration-history drift has been reconciled before any broad `db push`.

No production statistics reset is part of this change.
