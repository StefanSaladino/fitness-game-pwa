import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPwaService } from './pwaService';

const originalUserAgent = navigator.userAgent;
const originalPlatform = navigator.platform;
const originalMaxTouchPoints = navigator.maxTouchPoints;
const originalStorage = navigator.storage;
const originalOnLine = navigator.onLine;
const originalVisibilityState = document.visibilityState;
const originalMatchMedia = window.matchMedia;

function setNavigatorProperty(name: string, value: unknown) {
  Object.defineProperty(navigator, name, { configurable: true, value });
}

function setVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value });
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: '(display-mode: standalone)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia;
  setNavigatorProperty('onLine', true);
  setNavigatorProperty('storage', undefined);
});

afterEach(() => {
  setNavigatorProperty('userAgent', originalUserAgent);
  setNavigatorProperty('platform', originalPlatform);
  setNavigatorProperty('maxTouchPoints', originalMaxTouchPoints);
  setNavigatorProperty('storage', originalStorage);
  setNavigatorProperty('onLine', originalOnLine);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: originalVisibilityState });
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
});

describe('pwaService mobile lifecycle', () => {
  it('detects iOS and exposes manual Home Screen guidance when no native install prompt exists', () => {
    setNavigatorProperty('userAgent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1');
    setNavigatorProperty('platform', 'iPhone');
    setNavigatorProperty('maxTouchPoints', 5);

    const service = createPwaService();
    const stop = service.start();
    expect(service.getSnapshot()).toEqual(expect.objectContaining({
      platform: 'ios',
      standalone: false,
      manualInstallAvailable: true,
      installAvailable: false,
    }));
    stop();
  });

  it('reports best-effort storage and only reports persistent after the browser confirms it', async () => {
    const persisted = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const persist = vi.fn(async () => true);
    setNavigatorProperty('storage', { persisted, persist });

    const service = createPwaService();
    const stop = service.start();
    await vi.waitFor(() => expect(service.getSnapshot().storagePersistence).toBe('best-effort'));
    expect(service.getSnapshot().storagePersistenceRequestAvailable).toBe(true);

    await expect(service.requestPersistentStorage()).resolves.toBe('persistent');
    expect(persist).toHaveBeenCalledTimes(1);
    expect(service.getSnapshot().storagePersistence).toBe('persistent');
    stop();
  });

  it('keeps shared lifecycle listeners active until the final mounted consumer releases them', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const service = createPwaService();
    const releaseSettings = service.start();
    const releaseGlobalStatus = service.start();

    releaseSettings();
    expect(remove).not.toHaveBeenCalledWith('online', expect.any(Function));

    releaseGlobalStatus();
    expect(remove).toHaveBeenCalledWith('online', expect.any(Function));
  });

  it('refreshes connectivity and storage status when a suspended mobile app returns visible', async () => {
    const persisted = vi.fn(async () => false);
    setNavigatorProperty('storage', { persisted, persist: vi.fn(async () => false) });
    setNavigatorProperty('onLine', false);
    setVisibility('hidden');

    const service = createPwaService();
    const stop = service.start();
    await vi.waitFor(() => expect(service.getSnapshot().storagePersistence).toBe('best-effort'));
    expect(service.getSnapshot().online).toBe(false);

    setNavigatorProperty('onLine', true);
    persisted.mockResolvedValue(true);
    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    await vi.waitFor(() => expect(service.getSnapshot()).toEqual(expect.objectContaining({
      online: true,
      storagePersistence: 'persistent',
    })));
    stop();
  });
});
