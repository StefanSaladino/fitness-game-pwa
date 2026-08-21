# Phase 12B — Offline shell + install UX

Phase 12B hardens the PWA shell without changing workout scoring, Supabase persistence, or queued-mutation reconciliation.

## Boundary

This slice owns:

- production app-shell precaching;
- service-worker cache/version lifecycle;
- explicit browser-supported installation UI;
- standalone display-mode detection;
- user-controlled service-worker update activation;
- a compact global offline/install/update status surface;
- browser proof that the production app shell survives an offline reload.

This slice does **not** own reconnect backoff/replay policy (12C), platform-specific iOS/Android lifecycle sign-off (12D), database migrations, or scoring/XP changes.

## Offline shell

`public/sw.js` uses a versioned same-origin shell cache. During installation it fetches the production `/` document, discovers its built script/style assets, and caches those assets together with the manifest and install icons. This avoids the first-load gap where the page's JavaScript/CSS may have loaded before the new worker controlled the page.

Navigation requests are network-first with a cached app-shell fallback. Static same-origin assets are cache-first after precaching/runtime use.

The service worker deliberately ignores cross-origin requests. Supabase authentication, RPC responses, profile data, scoring data, and other remote API responses are never placed in the app-shell cache.

## Update lifecycle

The first service-worker install may activate immediately because there is no prior application version to interrupt. Later updates remain in the browser's waiting state.

The application surfaces **Update ready** and does not call `skipWaiting()` automatically. Only the explicit **Update app** action activates the waiting worker. The controller-change reload therefore happens only after the user opts in. Phase 12A durable workout state remains the safety net for that explicit reload.

## Install lifecycle

The install affordance is shown only after a supporting browser emits `beforeinstallprompt`. The app suppresses the affordance when already running in standalone mode, including the iOS `navigator.standalone` signal where present.

A dismissed prompt is not repeatedly forced by the application. Platform-specific iOS installation guidance and installed-app lifecycle sign-off remain part of 12D.

## User-visible offline state

When `navigator.onLine` becomes false, a compact global notice states that the app shell remains available and that workout changes remain on-device until reconnect. It does not claim remote data is current or available.

## Tests

Phase 12B adds:

- component coverage for install, offline, standalone, and user-controlled update states;
- structural checks for the service-worker security/cache lifecycle and non-goals;
- Chromium Playwright coverage proving the production shell boots from cache while the browser context is truly offline, including a failing uncached network probe before navigation;
- existing WebKit/mobile product E2E remains green, while service-worker-specific WebKit/iOS lifecycle sign-off is intentionally deferred to Phase 12D because Playwright's service-worker tooling/support is Chromium-only.

No Supabase migration and no scoring/XP changes are introduced in Phase 12B.
