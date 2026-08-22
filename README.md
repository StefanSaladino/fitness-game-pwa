# Fitness Game PWA — v0.11.3

Current checkpoint: **Phase 12D — Mobile PWA validation**. Phase 12 PWA/offline hardening is complete at the automated gate; the physical-device checklist in `docs/PHASE12D-MOBILE-PWA-VALIDATION.md` remains the release-certification procedure for real installed iOS/Android devices.

## Phase 12D highlights

- Added an Android Chromium mobile Playwright project alongside the existing iPhone/WebKit project.
- Mobile foreground / `pageshow` wakes the persisted workout retry scheduler without bypassing Phase 12C backoff or conflict rules.
- PWA lifecycle state refreshes connectivity, standalone mode, platform, and storage-persistence status after mobile resume.
- iOS-class browsers receive truthful **Share → Add to Home Screen** guidance instead of a Chromium-only install prompt.
- Installed apps can request persistent origin storage when the browser exposes `navigator.storage.persist()`; success is reported only when the browser grants it.
- Storage eviction limits and real-device iOS/Android release checks are documented explicitly.
- Phase 12A–12C durability, idempotency, conflict, and retry contracts remain unchanged.

Next roadmap slice: **Phase 13 — Lifting analytics**. Apply the UI design gate before analytics implementation.

## Supabase for v0.11.3

No new Supabase migration is required for Phase 12D. Continue using the database schema already established through Phase 11.

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

The Playwright matrix intentionally skips the service-worker-specific shell assertion under WebKit; Playwright does not provide equivalent WebKit service-worker certification. The iOS-class project still runs the rest of the mobile product journeys plus Phase 12D Home Screen guidance coverage. Real installed-device sign-off is documented separately.

See `docs/ROADMAP.md`, `docs/PHASE12A-INDEXEDDB-WORKOUT-DURABILITY.md`, `docs/PHASE12B-OFFLINE-SHELL-INSTALL-UX.md`, `docs/PHASE12C-RECONNECT-RETRY-HARDENING.md`, and `docs/PHASE12D-MOBILE-PWA-VALIDATION.md`.
