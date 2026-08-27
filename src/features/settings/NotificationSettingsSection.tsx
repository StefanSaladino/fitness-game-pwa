import { Button } from '../../components/ui';
import type { PushNotificationService } from '../../pwa/pushNotificationService';
import type { NotificationPreferenceService } from './notificationPreferenceService';
import { useNotificationSettings, type SupportedNotificationCategory } from './hooks/useNotificationSettings';
import styles from './SettingsScreen.module.css';

interface NotificationSettingsSectionProps {
  userId: string;
  preferenceService?: NotificationPreferenceService;
  pushService?: PushNotificationService;
}

const supportedCategories: Array<{
  key: SupportedNotificationCategory;
  label: string;
  description: string;
}> = [
  {
    key: 'badgeAchievements',
    label: 'Badges & achievements',
    description: 'Receive a push when a new badge is awarded.',
  },
  {
    key: 'personalRecordAlerts',
    label: 'Personal records',
    description: 'Receive a push when authoritative lifting progress records a new personal best.',
  },
  {
    key: 'groupInvitations',
    label: 'Group invitations',
    description: 'Receive a push when another user invites you to a group.',
  },
];

const futureCategories = [
  ['Workout reminders', 'No reminder schedule has been defined yet.'],
  ['Weekly goal reminders', 'No reminder timing rule has been defined yet.'],
  ['Group activity', 'A generic group-activity push rule has not been defined yet.'],
] as const;

function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={styles.switch}
      data-checked={checked ? 'true' : 'false'}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span className={styles.switchThumb} aria-hidden="true" />
    </button>
  );
}

function deviceCopy(capability: string, permission: string, subscribed: boolean): string {
  if (capability === 'requires-install') {
    return 'On iPhone and iPad, add Top Set to the Home Screen first. Web Push permission is requested only from the installed Home Screen app.';
  }
  if (capability === 'unsupported') {
    return 'This browser or context does not support the required Web Push APIs.';
  }
  if (permission === 'denied') {
    return 'Notifications are blocked for this device. Your account preference is unchanged; allow notifications in browser or OS settings before trying again.';
  }
  if (permission === 'default') {
    return 'Permission has not been requested on this device. Enabling the device below is the only action that opens the browser or OS permission prompt.';
  }
  if (subscribed) {
    return 'This device has permission and an active server-registered push subscription.';
  }
  return 'Permission is granted, but this device is not currently subscribed.';
}

export function NotificationSettingsSection({
  userId,
  preferenceService,
  pushService,
}: NotificationSettingsSectionProps) {
  const notifications = useNotificationSettings(userId, preferenceService, pushService);
  const preferences = notifications.preferences;
  const device = notifications.device;

  return (
    <section className={styles.section} aria-labelledby="settings-notifications-heading" data-app-surface="category">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>MESSAGES</p>
          <h2 id="settings-notifications-heading">Notifications</h2>
        </div>
        {device ? (
          <span className={styles.statusBadge}>
            {device.activeDeviceCount} {device.activeDeviceCount === 1 ? 'device' : 'devices'} enabled
          </span>
        ) : null}
      </div>

      {notifications.loading ? <p className={styles.supportCopy}>Loading notification settings…</p> : null}
      {notifications.error ? <p className={styles.error} role="status">{notifications.error}</p> : null}
      {notifications.notice ? <p className={styles.success} role="status">{notifications.notice}</p> : null}

      {preferences ? (
        <div className={styles.notificationRows}>
          <div className={styles.notificationRow}>
            <div>
              <strong>Optional notifications</strong>
              <p>Master account preference for supported optional push delivery.</p>
            </div>
            <Switch
              checked={preferences.notificationsEnabled}
              disabled={notifications.busy !== null}
              label="Optional notifications"
              onChange={(checked) => void notifications.setMaster(checked)}
            />
          </div>

          {supportedCategories.map((category) => (
            <div className={styles.notificationRow} key={category.key}>
              <div>
                <strong>{category.label}</strong>
                <p>{category.description}</p>
              </div>
              <Switch
                checked={preferences[category.key]}
                disabled={!preferences.notificationsEnabled || notifications.busy !== null}
                label={category.label}
                onChange={(checked) => void notifications.setCategory(category.key, checked)}
              />
            </div>
          ))}

          {futureCategories.map(([label, description]) => (
            <div className={styles.notificationRow} key={label}>
              <div>
                <strong>{label}</strong>
                <p>{description}</p>
              </div>
              <span className={styles.comingSoon}>Not available yet</span>
            </div>
          ))}
        </div>
      ) : null}

      {device ? (
        <div className={styles.deviceBox}>
          <div>
            <p className={styles.eyebrow}>THIS DEVICE</p>
            <strong>Browser & OS permission</strong>
            <p>{deviceCopy(device.capability, device.permission, device.subscribed)}</p>
          </div>
          <div className={styles.actions}>
            {device.capability === 'available' && (!device.subscribed || device.permission !== 'granted') ? (
              <Button
                disabled={notifications.busy !== null || device.permission === 'denied'}
                onClick={() => void notifications.enableDevice()}
                variant="secondary"
              >
                {notifications.busy === 'enable-device' ? 'Enabling…' : 'Enable on this device'}
              </Button>
            ) : null}
            {device.capability === 'available' && device.subscribed ? (
              <>
                <Button
                  disabled={notifications.busy !== null}
                  onClick={() => void notifications.sendTest()}
                  variant="secondary"
                >
                  {notifications.busy === 'test-device' ? 'Queueing…' : 'Send test notification'}
                </Button>
                <Button
                  disabled={notifications.busy !== null}
                  onClick={() => void notifications.disableDevice()}
                  variant="ghost"
                >
                  {notifications.busy === 'disable-device' ? 'Disabling…' : 'Disable on this device'}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className={styles.supportCopy}>Account preferences and device permission are separate. Turning the account master switch off does not revoke this device, and blocking this device does not rewrite the account preference.</p>
      <p className={styles.supportCopy}>Required account, security, moderation, suspension, and administrator ACTION_REQUIRED notices remain in the in-app message center regardless of optional push settings.</p>
    </section>
  );
}
