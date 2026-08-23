import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';

export type PushDeviceCapability = 'available' | 'requires-install' | 'unsupported';
export type PushPermissionState = NotificationPermission | 'unsupported';

export interface PushDeviceState {
  capability: PushDeviceCapability;
  permission: PushPermissionState;
  subscribed: boolean;
  activeDeviceCount: number;
}

export interface PushNotificationService {
  inspect(): Promise<PushDeviceState>;
  enable(): Promise<PushDeviceState>;
  disable(): Promise<PushDeviceState>;
  sendTest(): Promise<void>;
}

type PushSubscriptionShape = PushSubscription & {
  toJSON(): PushSubscriptionJSON;
};

function isIosLike(): boolean {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function isStandalone(): boolean {
  const navigatorStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return navigatorStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

function capability(): PushDeviceCapability {
  if (isIosLike() && !isStandalone()) return 'requires-install';
  if (
    !window.isSecureContext
    || typeof Notification === 'undefined'
    || !('serviceWorker' in navigator)
    || !('PushManager' in window)
  ) {
    return 'unsupported';
  }
  return 'available';
}

function vapidApplicationServerKey(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(base64);
  const buffer = new ArrayBuffer(decoded.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return buffer;
}

async function registrationForPush(): Promise<ServiceWorkerRegistration | null> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  if (!import.meta.env.PROD) return null;
  return navigator.serviceWorker.register('/sw.js');
}

function subscriptionKeys(subscription: PushSubscriptionShape): { endpoint: string; p256dh: string; auth: string } {
  const json = subscription.toJSON();
  const keys = json.keys as Record<string, string> | undefined;
  if (!subscription.endpoint || !keys?.p256dh || !keys.auth) {
    throw new Error('This browser returned an incomplete push subscription.');
  }
  return { endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth };
}

async function activeDeviceCount(client: SupabaseClient): Promise<number> {
  const { data, error } = await client.rpc('get_my_push_device_summary');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] as { active_device_count?: unknown } | undefined : undefined;
  const count = Number(row?.active_device_count);
  if (!Number.isInteger(count) || count < 0) throw new Error('Push device summary returned an invalid response.');
  return count;
}

async function syncSubscription(client: SupabaseClient, subscription: PushSubscriptionShape): Promise<void> {
  const current = subscriptionKeys(subscription);
  const { error } = await client.rpc('register_my_push_subscription', {
    p_endpoint: current.endpoint,
    p_p256dh: current.p256dh,
    p_auth_secret: current.auth,
    p_user_agent: navigator.userAgent || null,
  });
  if (error) throw error;
}

async function currentSubscription(): Promise<PushSubscriptionShape | null> {
  const registration = await registrationForPush();
  if (!registration) return null;
  return await registration.pushManager.getSubscription() as PushSubscriptionShape | null;
}

async function publicVapidKey(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.functions.invoke('push-notifications', {
    body: { action: 'GET_PUBLIC_KEY' },
  });
  if (error) throw error;
  if (!data || typeof data.publicKey !== 'string' || data.publicKey.length < 32) {
    throw new Error('Push service returned an invalid public key.');
  }
  return data.publicKey;
}

export function createPushNotificationService(
  client: SupabaseClient = getSupabaseClient(),
): PushNotificationService {
  async function inspect(): Promise<PushDeviceState> {
    const deviceCapability = capability();
    if (deviceCapability === 'unsupported') {
      return {
        capability: deviceCapability,
        permission: 'unsupported',
        subscribed: false,
        activeDeviceCount: await activeDeviceCount(client),
      };
    }

    if (deviceCapability === 'requires-install') {
      return {
        capability: deviceCapability,
        permission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
        subscribed: false,
        activeDeviceCount: await activeDeviceCount(client),
      };
    }

    const permission = Notification.permission;
    let subscription: PushSubscriptionShape | null = null;
    if (permission === 'granted') {
      subscription = await currentSubscription();
      if (subscription) await syncSubscription(client, subscription);
    }

    return {
      capability: deviceCapability,
      permission,
      subscribed: subscription !== null,
      activeDeviceCount: await activeDeviceCount(client),
    };
  }

  return {
    inspect,

    async enable() {
      if (capability() !== 'available') return inspect();

      let permission = Notification.permission;
      if (permission === 'default') permission = await Notification.requestPermission();
      if (permission !== 'granted') return inspect();

      const registration = await registrationForPush();
      if (!registration) throw new Error('The app service worker is not available for push notifications.');
      let subscription = await registration.pushManager.getSubscription() as PushSubscriptionShape | null;
      if (!subscription) {
        const key = await publicVapidKey(client);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidApplicationServerKey(key),
        }) as PushSubscriptionShape;
      }
      await syncSubscription(client, subscription);
      return inspect();
    },

    async disable() {
      if (!('serviceWorker' in navigator)) return inspect();
      const subscription = await currentSubscription();
      if (subscription) {
        const current = subscriptionKeys(subscription);
        const { error } = await client.rpc('revoke_my_push_subscription', { p_endpoint: current.endpoint });
        if (error) throw error;
        await subscription.unsubscribe();
      }
      return inspect();
    },

    async sendTest() {
      const subscription = await currentSubscription();
      if (!subscription) throw new Error('Enable notifications on this device before sending a test.');
      const current = subscriptionKeys(subscription);
      const { error } = await client.rpc('enqueue_my_push_test', { p_endpoint: current.endpoint });
      if (error) throw error;
    },
  };
}
