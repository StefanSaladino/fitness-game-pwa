# Phase 16.9 — Competition + social activity

Status: **DONE**

## Boundary

Phase 16.9 redesigns the existing Compete/social presentation without changing competition scoring, group authorization, feed generation, reaction persistence, or badge earning.

The existing `GroupSocialService` remains authoritative for:

- weekly and all-time group leaderboards;
- XP, lifting-day, PR, and badge counts;
- privacy-safe `LIFT`, `PR`, `BADGE`, and `GOAL` feed events;
- `FIRE`, `STRONG`, and `CLAP` reactions;
- cursor-based feed pagination.

## Approved visual direction

Phone-first hierarchy:

1. selected group identity and restrained group switching;
2. crew standings;
3. current-user standing;
4. flat leaderboard rows;
5. explicit summary-only privacy boundary;
6. chronological crew highlights;
7. text-first lightweight reactions;
8. quiet moderation/report controls.

Desktop keeps the same hierarchy and may place leaderboard and highlights side by side when space allows.

## Visual rules

- black/charcoal Top Set surfaces with orange interaction accents;
- green is reserved for completion/success semantics such as PR, badge, goal, and completed-lift labels;
- no blue/cyan primary styling;
- no podium illustration or decorative competition hero;
- no KPI/card wall;
- no pill-heavy stat treatment;
- no emoji reaction controls;
- no gradients, glass, glow, or generated imagery;
- no invented social telemetry, presence, streaks, comments, messaging, or raw workout details;
- group switching uses a horizontal button rail with hidden mobile scrollbar chrome;
- badge artwork is intentionally deferred to the shared Phase 16.13 badge visual system.

## Privacy

The feed continues to expose summaries only. Individual sets, workout notes, and full exercise details stay private.

Reactions remain social-only and never change XP.

## Component boundary

`GroupSocialScreen` owns presentation and user intent only.

`useGroupSocial` keeps:

- initial loading;
- pagination;
- optimistic reaction state;
- rollback after reaction failure;
- busy/error orchestration.

`GroupSocialService` remains the only social feature layer talking to Supabase.

No database migration is part of this phase.
