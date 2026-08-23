import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPushNotificationService } from './pushNotificationService';

const originalNotification = globalThis.Notification;
const originalPushManager = (window as unknown as { PushManager?: unknown }).PushManager;
const originalSecureContext = window.isSecureContext;
const originalServiceWorker = navigator.serviceWorker;
const originalUserAgent = navigator.userAgent;
const originalPlatform = navigator.platform;
const originalMaxTouchPoints = navigator.maxTouchPoints;
const originalMatchMedia = window.matchMedia;

function setNavigatorProperty(name: string, value: unknown) {
  Object.defineProperty(navigator, name, { configurable: true, value });
}

function notificationApi(permission: NotificationPermission, requestPermission = vi.fn(async () => permission)) {
  return { permission, requestPermission } as unknown as typeof Notification;
}

function clientWith(options: {
  deviceCount?: number;
  publicKey?: string;
} = {}) {
  const rpc = vi.fn(async (name: string) => {
    if (name === 'get_my_push_device_summary') {
      return { data: [{ active_device_count: options.deviceCount ?? 1 }], error: null };
    }
    return { data: 'ok', error: null };
  });
  const invoke = vi.fn(async () => ({
    data: { publicKey: options.publicKey ?? 'BExampleVapidPublicKey01234567890123456789012345678901234567890' },
    error: null,
  }));
  return {
    client: { rpc, functions: { invoke } } as unknown as SupabaseClient,
    rpc,
    invoke,
  };
}

function pushSubscription(endpoint = 'https://push.example.test/device-1234567890') {
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'p256dh-fixture-value-1234567890', auth: 'auth-fixture-value' } }),
    unsubscribe: vi.fn(async () => true),
  } as unknown as PushSubscription;
}

function installBrowser(options: {
  permission?: NotificationPermission;
  subscription?: PushSubscription | null;
  ios?: boolean;
  standalone?: boolean;
} = {}) {
  const requestPermission = vi.fn(async () => options.permission ?? 'granted' as NotificationPermission);
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    value: notificationApi(options.permission ?? 'default', requestPermission),
  });
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function PushManager() {} });
  window.matchMedia = vi.fn().mockReturnValue({
    matches: options.standalone ?? false,
    media: '(display-mode: standalone)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as typeof window.matchMedia;
  setNavigatorProperty('userAgent', options.ios ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)' : 'Test Browser');
  setNavigatorProperty('platform', options.ios ? 'iPhone' : 'Test');
  setNavigatorProperty('maxTouchPoints', options.ios ? 5 : 0);

  const subscribe = vi.fn(async () => options.subscription ?? pushSubscription());
  const getSubscription = vi.fn(async () => options.subscription ?? null);
  const registration = { pushManager: { subscribe, getSubscription } } as unknown as ServiceWorkerRegistration;
  setNavigatorProperty('serviceWorker', {
    getRegistration: vi.fn(async () => registration),
    register: vi.fn(async () => registration),
  });

  return { requestPermission, subscribe, getSubscription, registration };
}

beforeEach(() => {
  installBrowser();
});

afterEach(() => {
  Object.defineProperty(globalThis, 'Notification', { configurable: true, value: originalNotification });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: originalPushManager });
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: originalSecureContext });
  setNavigatorProperty('serviceWorker', originalServiceWorker);
  setNavigatorProperty('userAgent', originalUserAgent);
  setNavigatorProperty('platform', originalPlatform);
  setNavigatorProperty('maxTouchPoints', originalMaxTouchPoints);
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
});

describe('push notification device service', () => {
  it('inspects default permission without prompting on Settings load', async () => {
    const browser = installBrowser({ permission: 'default' });
    const fake = clientWith({ deviceCount: 2 });
    const service = createPushNotificationService(fake.client);

    await expect(service.inspect()).resolves.toEqual({
      capability: 'available',
      permission: 'default',
      subscribed: false,
      activeDeviceCount: 2,
    });
    expect(browser.requestPermission).not.toHaveBeenCalled();
    expect(browser.subscribe).not.toHaveBeenCalled();
  });

  it('requests permission only from enable and registers the resulting subscription server-side', async () => {
    const browser = installBrowser({ permission: 'default' });
    browser.requestPermission.mockResolvedValue('granted');
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: {
        get permission() { return browser.requestPermission.mock.calls.length > 0 ? 'granted' : 'default'; },
        requestPermission: browser.requestPermission,
      },
    });
    const fake = clientWith();
    const service = createPushNotificationService(fake.client);

    const state = await service.enable();
    expect(browser.requestPermission).toHaveBeenCalledTimes(1);
    expect(fake.invoke).toHaveBeenCalledWith('push-notifications', { body: { action: 'GET_PUBLIC_KEY' } });
    expect(browser.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    expect(fake.rpc).toHaveBeenCalledWith('register_my_push_subscription', expect.objectContaining({
      p_endpoint: 'https://push.example.test/device-1234567890',
      p_auth_secret: 'auth-fixture-value',
    }));
    expect(state.permission).toBe('granted');
  });

  it('keeps account preferences separate when browser permission is denied', async () => {
    const browser = installBrowser({ permission: 'default' });
    browser.requestPermission.mockResolvedValue('denied');
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: {
        get permission() { return browser.requestPermission.mock.calls.length > 0 ? 'denied' : 'default'; },
        requestPermission: browser.requestPermission,
      },
    });
    const fake = clientWith();
    const service = createPushNotificationService(fake.client);

    const state = await service.enable();
    expect(state.permission).toBe('denied');
    expect(fake.rpc).not.toHaveBeenCalledWith('update_my_notification_preferences', expect.anything());
    expect(fake.rpc).not.toHaveBeenCalledWith('register_my_push_subscription', expect.anything());
  });

  it('revokes the server endpoint and browser subscription without touching account-level preferences', async () => {
    const subscription = pushSubscription();
    installBrowser({ permission: 'granted', subscription });
    const fake = clientWith();
    const service = createPushNotificationService(fake.client);

    await service.disable();
    expect(fake.rpc).toHaveBeenCalledWith('revoke_my_push_subscription', {
      p_endpoint: 'https://push.example.test/device-1234567890',
    });
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(fake.rpc).not.toHaveBeenCalledWith('update_my_notification_preferences', expect.anything());
  });

  it('requires iOS/iPadOS browser sessions to become a Home Screen app before permission can be requested', async () => {
    const browser = installBrowser({ permission: 'default', ios: true, standalone: false });
    const fake = clientWith();
    const service = createPushNotificationService(fake.client);

    const state = await service.enable();
    expect(state.capability).toBe('requires-install');
    expect(browser.requestPermission).not.toHaveBeenCalled();
    expect(fake.invoke).not.toHaveBeenCalled();
  });

  it('queues a test only for an already subscribed device', async () => {
    const subscription = pushSubscription();
    installBrowser({ permission: 'granted', subscription });
    const fake = clientWith();
    const service = createPushNotificationService(fake.client);

    await service.sendTest();
    expect(fake.rpc).toHaveBeenCalledWith('enqueue_my_push_test', {
      p_endpoint: 'https://push.example.test/device-1234567890',
    });
  });
});
