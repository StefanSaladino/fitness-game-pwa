# Phase 12D — Mobile PWA validation

Status: implementation complete for v0.11.3; release checkpoint requires the normal full gate plus the physical-device checklist below.

## Objective

Close Phase 12 by validating the workout PWA against mobile lifecycle behavior rather than treating a desktop browser tab as the only runtime. This slice does not change lifting-v1 scoring, Supabase schema, workout mutation kinds, or the conflict policy established in Phases 12A–12C.

## Automated coverage

The Playwright matrix now includes:

- desktop Chromium;
- Android-class Chromium using the Pixel 7 device profile;
- iOS-class WebKit using the iPhone 15 device profile.

The existing workout recovery, IndexedDB durability, conflict, social, and shell journeys therefore run on both mobile engine families. The service-worker cache proof remains Chromium-only because Playwright does not provide equivalent service-worker certification for its WebKit project. WebKit mobile coverage instead validates the product shell and iOS-specific install guidance.

## Background / foreground recovery

Mobile browsers may suspend JavaScript while an installed web app is backgrounded. The mutation queue now wakes its retry scheduler when:

- an `online` event arrives;
- the document returns to `visibilityState === "visible"`;
- a `pageshow` event restores the page, including browser-managed page restoration.

A foreground wake never bypasses queue ordering, retry limits, or conflict blocking. It only re-evaluates the already-persisted queue under the Phase 12C rules.

The PWA lifecycle controller also refreshes connectivity, standalone mode, platform classification, and storage-persistence status when the app returns visible or receives `pageshow`.

## Installation behavior

### Android / Chromium

Chromium can expose `beforeinstallprompt` when the current browser/device considers the PWA installable. The app only shows its Install button after receiving that browser event. Installed/standalone mode suppresses the Install affordance.

### iOS / iPadOS

iOS-class browsers do not use the Chromium `beforeinstallprompt` contract. The app therefore provides manual Home Screen guidance instead of rendering a fake Install button:

1. Open the browser Share menu.
2. Choose **Add to Home Screen**.
3. Keep **Open as Web App** enabled when that option is shown.

The web app manifest already declares root identity/scope and `display: "standalone"`.

## Storage persistence and eviction

Active-workout recovery and the mutation journal live in IndexedDB. Browser storage is still best-effort unless the browser reports that the origin is persistent.

The lifecycle controller uses `navigator.storage.persisted()` when available and distinguishes:

- `persistent` — the browser reports persistent origin storage;
- `best-effort` — stored data may be evicted under storage pressure;
- `unsupported` — the browser does not expose the persistence-status API.

When an installed PWA reports best-effort storage and `navigator.storage.persist()` is available, the UI offers **Protect data**. The browser remains authoritative: the app does not claim persistence unless the browser grants it. A denied request is not treated as data loss; synced server history remains authoritative, while unsynced device-only changes retain the documented eviction risk.

No browser API can guarantee that local data survives explicit user clearing, device restore/reset, or every operating-system storage decision. Phase 12 therefore keeps IndexedDB recovery as a resilience layer, not the sole long-term record of completed workouts.

## Physical-device release checklist

Automation is not a substitute for installed-app behavior on real mobile operating systems. Before a public mobile release, run this checklist on at least one current iPhone/iPad and one current Android phone:

### iPhone / iPad

- Add the site to Home Screen and confirm it opens as a web app rather than a normal browser tab.
- Confirm the icon/title are correct and safe-area content is not clipped.
- Start a lift, enter a set draft, background the app, wait at least one minute, then foreground it; the draft must remain.
- Lock/unlock the device during an active lift; the session and timer intent must remain correct.
- With an active lift, enable airplane mode, force-close the web app, relaunch it, and confirm IndexedDB recovery renders before remote reads.
- Restore connectivity and confirm queued edits reconcile without duplicate sets or silent conflict overwrites.
- Confirm an available app update never reloads until **Update app** is chosen.
- Clear website data manually and confirm the app does not claim that local recovery can survive explicit storage deletion.

### Android / Chrome

- Install the PWA and confirm it launches in standalone mode.
- Repeat the active-lift background/foreground, lock/unlock, offline force-close/relaunch, and reconnect scenarios above.
- Confirm offline shell navigation still boots after installation.
- Confirm **Protect data** only reports success when the browser grants persistent storage.
- Confirm the app remains usable when persistence is denied or unsupported.

Record browser/OS versions and pass/fail notes with the release ticket. A failure in recovery, duplicate prevention, conflict safety, or unexpected reload is release-blocking.

## Final Phase 12 reliability contract

Phase 12 is complete when the full automated gate is green and the release checklist has no blocking mobile failures. The combined contract is:

1. IndexedDB hydrates before recovery decisions.
2. Every queued mutation is durable before replay.
3. Idempotency identity survives reload/restart.
4. Retry is bounded and conflict-safe.
5. Foreground/resume wakes eligible retry without bypassing policy.
6. The production shell boots offline on supported service-worker test targets.
7. Platform install guidance never promises an install API that the browser does not expose.
8. Storage persistence is reported honestly and local eviction remains documented.

## Non-goals

- No Supabase migration.
- No scoring/XP changes.
- No Background Sync API.
- No push notifications.
- No native wrapper or smartwatch companion.
- No claim that Playwright WebKit is equivalent to an installed iOS Home Screen web app.
