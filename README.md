# Fitness Game PWA — v0.11.2

Current checkpoint: **Phase 12C — Reconnect + retry hardening**.

Completed in this checkpoint:

- retryable IndexedDB-backed workout mutations automatically replay with bounded exponential backoff;
- retry timing survives app restart through the existing persisted attempt metadata;
- automatic replay stops after four failed attempts and requires an explicit **Retry sync**;
- manual retry keeps the original idempotency key and durably resets the retry cycle before network replay;
- conflict items are never touched by automatic retry and still require **Use server version**;
- pre-12C high-attempt pending queue entries normalize into an explicit blocked state on hydration;
- reconnect processing replays eligible queued work before re-reading the authoritative workout/exercise/set state;
- successful later retries trigger another authoritative exercise/set reconciliation;
- integration coverage proves an ambiguous committed set mutation can survive app restart without duplicate server effects.

Next roadmap slice: **Phase 12D — Mobile PWA validation**.

## Supabase for v0.11.2

No new Supabase migration is required for Phase 12C. Continue using the database schema already established through Phase 11.

## Previous v0.9.0 Supabase checkpoint

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
