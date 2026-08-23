import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  createNotificationPreferenceService,
  type NotificationPreferences,
} from './notificationPreferenceService';

const row = {
  notifications_enabled: true,
  workout_reminders: true,
  weekly_goal_reminders: false,
  badge_achievements: true,
  personal_record_alerts: true,
  group_activity: false,
  group_invitations: true,
};

const preferences: NotificationPreferences = {
  notificationsEnabled: true,
  workoutReminders: true,
  weeklyGoalReminders: false,
  badgeAchievements: true,
  personalRecordAlerts: true,
  groupActivity: false,
  groupInvitations: true,
};

function clientFor(data: unknown, rpc = vi.fn()) {
  const single = vi.fn(async () => ({ data, error: null }));
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return {
    client: { from, rpc } as unknown as SupabaseClient,
    from,
    select,
    eq,
    single,
    rpc,
  };
}

describe('notification preference service', () => {
  it('loads only the requested self preference row through the table read boundary', async () => {
    const fake = clientFor(row);
    const service = createNotificationPreferenceService(fake.client);

    await expect(service.load('user-1')).resolves.toEqual(preferences);
    expect(fake.from).toHaveBeenCalledWith('notification_preferences');
    expect(fake.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(fake.select).toHaveBeenCalledWith(expect.stringContaining('notifications_enabled'));
    expect(fake.select).toHaveBeenCalledWith(expect.stringContaining('group_invitations'));
  });

  it('delegates one atomic self-update RPC without rewriting preserved child selections', async () => {
    const rpc = vi.fn(async () => ({ data: { ...row, notifications_enabled: false }, error: null }));
    const service = createNotificationPreferenceService(clientFor(null, rpc).client);
    const masterOff = { ...preferences, notificationsEnabled: false };

    await expect(service.update(masterOff)).resolves.toEqual(masterOff);
    expect(rpc).toHaveBeenCalledWith('update_my_notification_preferences', {
      p_notifications_enabled: false,
      p_workout_reminders: true,
      p_weekly_goal_reminders: false,
      p_badge_achievements: true,
      p_personal_record_alerts: true,
      p_group_activity: false,
      p_group_invitations: true,
    });
  });

  it('accepts the one-row PostgREST composite representation', async () => {
    const rpc = vi.fn(async () => ({ data: [row], error: null }));
    const service = createNotificationPreferenceService(clientFor(null, rpc).client);
    await expect(service.update(preferences)).resolves.toEqual(preferences);
  });

  it('fails closed when the server returns a malformed preference payload', async () => {
    const service = createNotificationPreferenceService(clientFor({ ...row, group_activity: 'yes' }).client);
    await expect(service.load('user-1')).rejects.toThrow('invalid response');
  });

  it('fails closed when the update RPC returns no preference row', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    const service = createNotificationPreferenceService(clientFor(null, rpc).client);
    await expect(service.update(preferences)).rejects.toThrow('invalid response');
  });
});
