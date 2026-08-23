import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';

export interface NotificationPreferences {
  notificationsEnabled: boolean;
  workoutReminders: boolean;
  weeklyGoalReminders: boolean;
  badgeAchievements: boolean;
  personalRecordAlerts: boolean;
  groupActivity: boolean;
  groupInvitations: boolean;
}

type NotificationPreferencesRow = {
  notifications_enabled: unknown;
  workout_reminders: unknown;
  weekly_goal_reminders: unknown;
  badge_achievements: unknown;
  personal_record_alerts: unknown;
  group_activity: unknown;
  group_invitations: unknown;
};

export interface NotificationPreferenceService {
  load(userId: string): Promise<NotificationPreferences>;
  update(preferences: NotificationPreferences): Promise<NotificationPreferences>;
}

function readBoolean(row: NotificationPreferencesRow, key: keyof NotificationPreferencesRow): boolean {
  const value = row[key];
  if (typeof value !== 'boolean') throw new Error('Notification preferences returned an invalid response.');
  return value;
}

function mapPreferences(row: NotificationPreferencesRow): NotificationPreferences {
  return {
    notificationsEnabled: readBoolean(row, 'notifications_enabled'),
    workoutReminders: readBoolean(row, 'workout_reminders'),
    weeklyGoalReminders: readBoolean(row, 'weekly_goal_reminders'),
    badgeAchievements: readBoolean(row, 'badge_achievements'),
    personalRecordAlerts: readBoolean(row, 'personal_record_alerts'),
    groupActivity: readBoolean(row, 'group_activity'),
    groupInvitations: readBoolean(row, 'group_invitations'),
  };
}

function normalizeRpcResponse(data: unknown): NotificationPreferencesRow {
  const response = Array.isArray(data) && data.length === 1 ? data[0] : data;
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new Error('Notification preferences returned an invalid response.');
  }
  return response as NotificationPreferencesRow;
}

export function createNotificationPreferenceService(
  client: SupabaseClient = getSupabaseClient(),
): NotificationPreferenceService {
  const columns = [
    'notifications_enabled',
    'workout_reminders',
    'weekly_goal_reminders',
    'badge_achievements',
    'personal_record_alerts',
    'group_activity',
    'group_invitations',
  ].join(', ');

  return {
    async load(userId) {
      const result = await client
        .from('notification_preferences')
        .select(columns)
        .eq('user_id', userId)
        .single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error('Notification preferences not found.');
      return mapPreferences(result.data as unknown as NotificationPreferencesRow);
    },

    async update(preferences) {
      const result = await client.rpc('update_my_notification_preferences', {
        p_notifications_enabled: preferences.notificationsEnabled,
        p_workout_reminders: preferences.workoutReminders,
        p_weekly_goal_reminders: preferences.weeklyGoalReminders,
        p_badge_achievements: preferences.badgeAchievements,
        p_personal_record_alerts: preferences.personalRecordAlerts,
        p_group_activity: preferences.groupActivity,
        p_group_invitations: preferences.groupInvitations,
      });
      if (result.error) throw result.error;
      return mapPreferences(normalizeRpcResponse(result.data));
    },
  };
}
