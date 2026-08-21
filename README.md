# Fitness Game PWA — v0.11.1

Current checkpoint: **Phase 12B — Offline shell + install UX**.

Completed in this checkpoint:

- production app shell and built same-origin assets are precached for offline reload;
- the service worker ignores cross-origin Supabase/auth/data requests rather than caching them;
- service-worker caches are versioned and old shell caches are removed on activation;
- later app updates wait for an explicit **Update app** action instead of force-reloading an active lift;
- browser-supported install prompts surface a compact **Install** affordance;
- standalone display mode suppresses redundant install UI;
- a compact global offline state explains that workout changes remain on-device until reconnect;
- Playwright validates offline production-shell reload in both configured browser projects.

Next roadmap slice: **Phase 12C — Reconnect + retry hardening**.

## Supabase for v0.11.1

No new Supabase migration is required for Phase 12B. Continue using the database schema already established through Phase 11.

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
