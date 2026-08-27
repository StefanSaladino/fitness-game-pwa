import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PushDeviceState, PushNotificationService } from '../../src/pwa/pushNotificationService';
import type { PwaService, PwaSnapshot } from '../../src/pwa/pwaService';
import type { PlatformAccessService } from '../../src/features/admin/platformAccessService';
import type { GroupService } from '../../src/features/groups/groupService';
import { UserMessageCenter } from '../../src/features/messaging/UserMessageCenter';
import type { PlatformMessageService } from '../../src/features/messaging/platformMessageService';
import type { ProfilePictureService } from '../../src/features/profile-picture/profilePictureService';
import type { AccountDeletionService } from '../../src/features/settings/accountDeletionService';
import type { AccountSecurityService } from '../../src/features/settings/accountSecurityService';
import type { NotificationPreferenceService, NotificationPreferences } from '../../src/features/settings/notificationPreferenceService';
import { NotificationSettingsSection } from '../../src/features/settings/NotificationSettingsSection';
import { SettingsScreen } from '../../src/features/settings/SettingsScreen';
import type { SettingsService } from '../../src/features/settings/settingsService';

const profile = {
  id: 'user-1',
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
  profileCode: 'ABC123',
  preferredWeightUnit: 'KG' as const,
};

const basePreferences: NotificationPreferences = {
  notificationsEnabled: true,
  workoutReminders: true,
  weeklyGoalReminders: false,
  badgeAchievements: true,
  personalRecordAlerts: false,
  groupActivity: true,
  groupInvitations: true,
};

function preferenceService(initial: NotificationPreferences = basePreferences) {
  let stored = { ...initial };
  const update = vi.fn(async (next: NotificationPreferences) => {
    stored = { ...next };
    return stored;
  });
  const service: NotificationPreferenceService = {
    load: vi.fn(async () => ({ ...stored })),
    update,
  };
  return { service, update, read: () => ({ ...stored }) };
}

function pushService(initial: PushDeviceState, remainingAfterDisable = Math.max(0, initial.activeDeviceCount - 1)) {
  let state = { ...initial };
  const enable = vi.fn(async () => {
    state = { capability: 'available', permission: 'granted', subscribed: true, activeDeviceCount: Math.max(1, state.activeDeviceCount) };
    return state;
  });
  const disable = vi.fn(async () => {
    state = { capability: 'available', permission: 'granted', subscribed: false, activeDeviceCount: remainingAfterDisable };
    return state;
  });
  const sendTest = vi.fn(async () => undefined);
  const service: PushNotificationService = {
    inspect: vi.fn(async () => ({ ...state })),
    enable,
    disable,
    sendTest,
  };
  return { service, enable, disable, sendTest };
}

const pwaSnapshot: PwaSnapshot = {
  online: true,
  standalone: false,
  platform: 'other',
  installAvailable: false,
  manualInstallAvailable: false,
  updateAvailable: false,
  applyingUpdate: false,
  serviceWorkerError: false,
  storagePersistence: 'persistent',
  storagePersistenceRequestAvailable: false,
};

const pwaService: PwaService = {
  getSnapshot: () => pwaSnapshot,
  subscribe: () => () => undefined,
  start: () => () => undefined,
  requestInstall: vi.fn(async () => 'unavailable' as const),
  requestPersistentStorage: vi.fn(async () => 'persistent' as const),
  applyUpdate: vi.fn(() => false),
};

const profilePictureService = {
  get: vi.fn(async () => ({ path: null, url: null })),
  getPublicUrl: vi.fn(() => null),
} as unknown as ProfilePictureService;

const deletionService: AccountDeletionService = {
  request: vi.fn(async () => 'DELETE stefan'),
  cancel: vi.fn(async () => undefined),
  confirm: vi.fn(async () => undefined),
};

const accountSecurityService: AccountSecurityService = {
  changePassword: vi.fn(async () => undefined),
};

const settingsService: SettingsService = {
  load: vi.fn(async () => profile),
  update: vi.fn(async () => profile),
};

function access(isPlatformAdmin: boolean): PlatformAccessService {
  return { load: async () => ({ accountStatus: 'ACTIVE', isPlatformAdmin }) };
}

function emptyGroupService(): GroupService {
  return {
    listGroups: vi.fn(async () => []),
    listPendingInvites: vi.fn(async () => []),
  } as unknown as GroupService;
}

function requiredMessageService(): PlatformMessageService {
  return {
    list: vi.fn(async () => ({
      items: [{
        messageId: 'message-1',
        audienceType: 'USER',
        messageType: 'ACTION_REQUIRED',
        subject: 'Security action required',
        body: 'Review the required account action.',
        acknowledgementRequired: true,
        currentRevision: 1,
        deliveryState: 'DELIVERED',
        deliveredAt: '2026-08-23T18:00:00.000Z',
        readAt: null,
        acknowledgedAt: null,
        sentAt: '2026-08-23T18:00:00.000Z',
        editedAt: null,
        expiresAt: null,
        isExpired: false,
      }],
      unreadCount: 1,
      total: 1,
    })),
    markRead: vi.fn(async () => undefined),
    acknowledge: vi.fn(async () => undefined),
    deleteMessage: vi.fn(async () => undefined),
  };
}

afterEach(() => cleanup());

describe('Phase 15.6D Settings integration gate', () => {
  it('keeps ordinary Settings usable with zero group memberships and no admin route clue', async () => {
    const user = userEvent.setup();
    const preferences = preferenceService({ ...basePreferences, notificationsEnabled: false });
    const push = pushService({ capability: 'unsupported', permission: 'unsupported', subscribed: false, activeDeviceCount: 0 });

    render(
      <SettingsScreen
        accessService={access(false)}
        accountSecurityService={accountSecurityService}
        deletionService={deletionService}
        groupService={emptyGroupService()}
        notificationPreferenceService={preferences.service}
        profile={profile}
        profilePictureService={profilePictureService}
        pushNotificationService={push.service}
        pwaService={pwaService}
        settingsService={settingsService}
        userEmail="stefan@example.com"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Groups' }));
    expect(await screen.findByText(/You are not currently in a group/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByRole('heading', { name: 'Notifications', level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole('switch', { name: 'Optional notifications' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Administration' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Platform administration is available/)).not.toBeInTheDocument();
  });

  it('preserves child selections across master OFF -> ON while required in-app messages remain visible', async () => {
    const user = userEvent.setup();
    const preferences = preferenceService();
    const push = pushService({ capability: 'available', permission: 'default', subscribed: false, activeDeviceCount: 0 });

    render(
      <>
        <NotificationSettingsSection userId="user-1" preferenceService={preferences.service} pushService={push.service} />
        <UserMessageCenter service={requiredMessageService()} />
      </>,
    );

    await user.click(await screen.findByRole('button', { name: 'Messages, 1 unread' }));
    expect(await screen.findByText('Security action required')).toBeInTheDocument();
    const master = await screen.findByRole('switch', { name: 'Optional notifications' });
    const badge = screen.getByRole('switch', { name: 'Badges & achievements' });
    const invitations = screen.getByRole('switch', { name: 'Group invitations' });

    expect(badge).toHaveAttribute('aria-checked', 'true');
    expect(invitations).toHaveAttribute('aria-checked', 'true');

    await user.click(master);
    await waitFor(() => expect(preferences.read().notificationsEnabled).toBe(false));
    expect(screen.getByRole('switch', { name: 'Badges & achievements' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Badges & achievements' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'Group invitations' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Security action required')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Optional notifications' }));
    await waitFor(() => expect(preferences.read().notificationsEnabled).toBe(true));
    expect(screen.getByRole('switch', { name: 'Badges & achievements' })).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'Badges & achievements' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'Group invitations' })).toHaveAttribute('aria-checked', 'true');
  });

  it('requests default-state notification permission only after the explicit device action', async () => {
    const user = userEvent.setup();
    const preferences = preferenceService();
    const push = pushService({ capability: 'available', permission: 'default', subscribed: false, activeDeviceCount: 0 });

    render(<NotificationSettingsSection userId="user-1" preferenceService={preferences.service} pushService={push.service} />);

    expect(await screen.findByText(/Permission has not been requested on this device/)).toBeInTheDocument();
    expect(push.enable).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Enable on this device' }));
    await waitFor(() => expect(push.enable).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/active server-registered push subscription/)).toBeInTheDocument();
  });

  it('keeps denied and unsupported device states separate from the account preference', async () => {
    const deniedPreferences = preferenceService();
    const deniedPush = pushService({ capability: 'available', permission: 'denied', subscribed: false, activeDeviceCount: 0 });
    const denied = render(<NotificationSettingsSection userId="user-1" preferenceService={deniedPreferences.service} pushService={deniedPush.service} />);

    expect(await screen.findByText(/Notifications are blocked for this device/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable on this device' })).toBeDisabled();
    expect(deniedPreferences.update).not.toHaveBeenCalled();
    denied.unmount();

    const unsupportedPreferences = preferenceService();
    const unsupportedPush = pushService({ capability: 'unsupported', permission: 'unsupported', subscribed: false, activeDeviceCount: 0 });
    render(<NotificationSettingsSection userId="user-1" preferenceService={unsupportedPreferences.service} pushService={unsupportedPush.service} />);

    expect(await screen.findByText(/does not support the required Web Push APIs/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enable on this device' })).not.toBeInTheDocument();
    expect(unsupportedPreferences.update).not.toHaveBeenCalled();
  });

  it('revokes only the current device while another registered device remains active', async () => {
    const user = userEvent.setup();
    const preferences = preferenceService();
    const push = pushService({ capability: 'available', permission: 'granted', subscribed: true, activeDeviceCount: 2 }, 1);

    render(<NotificationSettingsSection userId="user-1" preferenceService={preferences.service} pushService={push.service} />);

    expect(await screen.findByText('2 devices enabled')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send test notification' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Disable on this device' }));

    await waitFor(() => expect(push.disable).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('1 device enabled')).toBeInTheDocument();
    expect(preferences.update).not.toHaveBeenCalled();
    expect(preferences.read().notificationsEnabled).toBe(true);
  });
});
