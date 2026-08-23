import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PushNotificationService } from '../../pwa/pushNotificationService';
import type { NotificationPreferenceService, NotificationPreferences } from './notificationPreferenceService';
import { NotificationSettingsSection } from './NotificationSettingsSection';

const initial: NotificationPreferences = {
  notificationsEnabled: true,
  workoutReminders: true,
  weeklyGoalReminders: false,
  badgeAchievements: true,
  personalRecordAlerts: false,
  groupActivity: true,
  groupInvitations: true,
};

function services(options: { permission?: NotificationPermission; subscribed?: boolean } = {}) {
  const update = vi.fn(async (next: NotificationPreferences) => next);
  const preferenceService: NotificationPreferenceService = {
    load: vi.fn(async () => initial),
    update,
  };
  const state = {
    capability: 'available' as const,
    permission: options.permission ?? 'default',
    subscribed: options.subscribed ?? false,
    activeDeviceCount: options.subscribed ? 1 : 0,
  };
  const pushService: PushNotificationService = {
    inspect: vi.fn(async () => state),
    enable: vi.fn(async () => ({ ...state, permission: 'granted' as const, subscribed: true, activeDeviceCount: 1 })),
    disable: vi.fn(async () => ({ ...state, permission: 'granted' as const, subscribed: false, activeDeviceCount: 0 })),
    sendTest: vi.fn(async () => undefined),
  };
  return { preferenceService, pushService, update };
}

describe('notification Settings section', () => {
  it('loads device state without requesting permission or enabling push automatically', async () => {
    const api = services();
    render(<NotificationSettingsSection userId="user-1" preferenceService={api.preferenceService} pushService={api.pushService} />);

    expect(await screen.findByText('Optional notifications')).toBeInTheDocument();
    expect(api.pushService.inspect).toHaveBeenCalledTimes(1);
    expect(api.pushService.enable).not.toHaveBeenCalled();
  });

  it('turns the master preference off while preserving every stored child selection', async () => {
    const user = userEvent.setup();
    const api = services();
    render(<NotificationSettingsSection userId="user-1" preferenceService={api.preferenceService} pushService={api.pushService} />);

    const master = await screen.findByRole('switch', { name: 'Optional notifications' });
    await user.click(master);

    await waitFor(() => expect(api.update).toHaveBeenCalledWith({
      ...initial,
      notificationsEnabled: false,
    }));
    expect(api.update.mock.calls[0][0].workoutReminders).toBe(true);
    expect(api.update.mock.calls[0][0].groupActivity).toBe(true);
  });

  it('exposes switches only for categories with real Phase 15.6C delivery behavior', async () => {
    const api = services();
    render(<NotificationSettingsSection userId="user-1" preferenceService={api.preferenceService} pushService={api.pushService} />);

    await screen.findByText('Workout reminders');
    expect(screen.getAllByRole('switch')).toHaveLength(4);
    expect(screen.getByRole('switch', { name: 'Badges & achievements' })).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'Personal records' })).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'Group invitations' })).toBeEnabled();
    expect(screen.queryByRole('switch', { name: 'Workout reminders' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Weekly goal reminders' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Group activity' })).not.toBeInTheDocument();
  });

  it('keeps child selections visible but disabled while the master preference is off', async () => {
    const preferenceService: NotificationPreferenceService = {
      load: vi.fn(async () => ({ ...initial, notificationsEnabled: false })),
      update: vi.fn(async (next) => next),
    };
    const api = services();
    render(<NotificationSettingsSection userId="user-1" preferenceService={preferenceService} pushService={api.pushService} />);

    expect(await screen.findByRole('switch', { name: 'Badges & achievements' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'Badges & achievements' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Group invitations' })).toBeDisabled();
  });

  it('uses an explicit device action for the permission request path', async () => {
    const user = userEvent.setup();
    const api = services();
    render(<NotificationSettingsSection userId="user-1" preferenceService={api.preferenceService} pushService={api.pushService} />);

    const enable = await screen.findByRole('button', { name: 'Enable on this device' });
    expect(api.pushService.enable).not.toHaveBeenCalled();
    await user.click(enable);
    await waitFor(() => expect(api.pushService.enable).toHaveBeenCalledTimes(1));
  });

  it('explains a blocked device without silently changing account preferences', async () => {
    const api = services({ permission: 'denied' });
    render(<NotificationSettingsSection userId="user-1" preferenceService={api.preferenceService} pushService={api.pushService} />);

    expect(await screen.findByText(/Notifications are blocked for this device/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable on this device' })).toBeDisabled();
    expect(api.update).not.toHaveBeenCalled();
  });
});
