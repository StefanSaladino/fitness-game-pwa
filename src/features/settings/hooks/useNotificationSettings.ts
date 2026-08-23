import { useEffect, useRef, useState } from 'react';
import {
  createNotificationPreferenceService,
  type NotificationPreferenceService,
  type NotificationPreferences,
} from '../notificationPreferenceService';
import {
  createPushNotificationService,
  type PushDeviceState,
  type PushNotificationService,
} from '../../../pwa/pushNotificationService';

export type SupportedNotificationCategory = 'badgeAchievements' | 'personalRecordAlerts' | 'groupInvitations';

type BusyAction = 'master' | SupportedNotificationCategory | 'enable-device' | 'disable-device' | 'test-device' | null;

export interface NotificationSettingsState {
  preferences: NotificationPreferences | null;
  device: PushDeviceState | null;
  loading: boolean;
  busy: BusyAction;
  error: string | null;
  notice: string | null;
  setMaster(enabled: boolean): Promise<void>;
  setCategory(category: SupportedNotificationCategory, enabled: boolean): Promise<void>;
  enableDevice(): Promise<void>;
  disableDevice(): Promise<void>;
  sendTest(): Promise<void>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Notification settings could not be updated.';
}

export function useNotificationSettings(
  userId: string,
  injectedPreferenceService?: NotificationPreferenceService,
  injectedPushService?: PushNotificationService,
): NotificationSettingsState {
  const preferenceServiceRef = useRef<NotificationPreferenceService | null>(null);
  const pushServiceRef = useRef<PushNotificationService | null>(null);
  if (!preferenceServiceRef.current) {
    preferenceServiceRef.current = injectedPreferenceService ?? createNotificationPreferenceService();
  }
  if (!pushServiceRef.current) pushServiceRef.current = injectedPushService ?? createPushNotificationService();

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [device, setDevice] = useState<PushDeviceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    void Promise.all([
      preferenceServiceRef.current!.load(userId),
      pushServiceRef.current!.inspect(),
    ]).then(([nextPreferences, nextDevice]) => {
      if (request !== requestRef.current) return;
      setPreferences(nextPreferences);
      setDevice(nextDevice);
      setLoading(false);
    }).catch((loadError) => {
      if (request !== requestRef.current) return;
      setError(errorMessage(loadError));
      setLoading(false);
    });
    return () => { requestRef.current += 1; };
  }, [userId]);

  const savePreferences = async (
    action: Exclude<BusyAction, 'enable-device' | 'disable-device' | 'test-device' | null>,
    next: NotificationPreferences,
  ) => {
    if (busy) return;
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      const saved = await preferenceServiceRef.current!.update(next);
      setPreferences(saved);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setBusy(null);
    }
  };

  const runDeviceAction = async (
    action: 'enable-device' | 'disable-device',
    operation: () => Promise<PushDeviceState>,
  ) => {
    if (busy) return;
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      setDevice(await operation());
    } catch (deviceError) {
      setError(errorMessage(deviceError));
    } finally {
      setBusy(null);
    }
  };

  return {
    preferences,
    device,
    loading,
    busy,
    error,
    notice,

    async setMaster(enabled) {
      if (!preferences) return;
      await savePreferences('master', { ...preferences, notificationsEnabled: enabled });
    },

    async setCategory(category, enabled) {
      if (!preferences) return;
      await savePreferences(category, { ...preferences, [category]: enabled });
    },

    async enableDevice() {
      await runDeviceAction('enable-device', () => pushServiceRef.current!.enable());
    },

    async disableDevice() {
      await runDeviceAction('disable-device', () => pushServiceRef.current!.disable());
    },

    async sendTest() {
      if (busy) return;
      setBusy('test-device');
      setError(null);
      setNotice(null);
      try {
        await pushServiceRef.current!.sendTest();
        setNotice('Test notification queued for this device.');
      } catch (testError) {
        setError(errorMessage(testError));
      } finally {
        setBusy(null);
      }
    },
  };
}
