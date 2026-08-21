# Fitness Game PWA — v0.9.0

Current checkpoint: **Phase 10 — Group competition/social**.

Completed in this checkpoint:

- first-class **Compete** destination for each workout group;
- authoritative current-week and all-time `lifting-v1` XP standings;
- lifting-day, PR, and earned-badge context alongside XP rank;
- privacy-safe crew feed for qualifying lifts, real PRs, badges, and completed weekly goals;
- stable cursor pagination for larger group histories;
- one lightweight `FIRE`, `STRONG`, or `CLAP` reaction per member/activity;
- opaque deterministic activity keys so social APIs do not expose source row identifiers;
- active-membership enforcement for standings, feed reads, and reactions;
- raw sets, workout notes, and complete workout contents remain private;
- reactions and badges remain non-XP and cannot affect ranking/progression;
- authoritative XP totals are surfaced without inventing an unapproved level curve.

Next roadmap slice: **Phase 11 — Cardio accessory logging**.

## Supabase for v0.9.0

Apply `supabase/migrations/20260821000100_group_competition_social.sql`, then run the database regression set ending with `025_group_competition_social.test.sql`.

## Local validation

```powershell
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:structure
npm run test:e2e
npm run test:internal
```
