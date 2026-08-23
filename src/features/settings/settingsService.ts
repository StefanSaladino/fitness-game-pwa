import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type { OnboardingProfile } from '../onboarding';
import { assertValidOnboardingInput } from '../onboarding/validation';
import type { WeightDisplayUnit } from '../workout';

export interface ProfileSettingsInput {
  username: string;
  displayName: string;
  timezone: string;
  weeklyTarget: number;
  preferredWeightUnit: WeightDisplayUnit;
}

type ProfileSettingsRow = {
  id: string;
  username: string;
  display_name: string;
  timezone: string;
  weekly_workout_target: number;
  pending_weekly_workout_target: number | null;
  onboarding_completed_at: string | null;
  profile_code: string;
  preferred_weight_unit: string;
};

export interface SettingsService {
  load(userId: string): Promise<OnboardingProfile>;
  update(input: ProfileSettingsInput): Promise<OnboardingProfile>;
}

function mapProfile(row: ProfileSettingsRow): OnboardingProfile {
  if (row.preferred_weight_unit !== 'KG' && row.preferred_weight_unit !== 'LB') {
    throw new Error('Profile returned an invalid preferred weight unit.');
  }
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    timezone: row.timezone,
    weeklyWorkoutTarget: row.weekly_workout_target,
    pendingWeeklyWorkoutTarget: row.pending_weekly_workout_target,
    onboardingCompletedAt: row.onboarding_completed_at,
    profileCode: row.profile_code,
    preferredWeightUnit: row.preferred_weight_unit,
  };
}

function assertWeightUnit(value: string): asserts value is WeightDisplayUnit {
  if (value !== 'KG' && value !== 'LB') throw new RangeError('Preferred weight unit must be KG or LB.');
}

export function createSettingsService(client: SupabaseClient = getSupabaseClient()): SettingsService {
  const columns = 'id, username, display_name, timezone, weekly_workout_target, pending_weekly_workout_target, onboarding_completed_at, profile_code, preferred_weight_unit';

  return {
    async load(userId) {
      const result = await client.from('profiles').select(columns).eq('id', userId).single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error('Profile not found.');
      return mapProfile(result.data as unknown as ProfileSettingsRow);
    },

    async update(input) {
      const normalized = assertValidOnboardingInput(input);
      assertWeightUnit(input.preferredWeightUnit);
      const result = await client.rpc('update_my_profile_settings', {
        p_username: normalized.username,
        p_display_name: normalized.displayName,
        p_timezone: normalized.timezone,
        p_weekly_target: normalized.weeklyTarget,
        p_preferred_weight_unit: input.preferredWeightUnit,
      });
      if (result.error) throw result.error;
      const response = Array.isArray(result.data) && result.data.length === 1 ? result.data[0] : result.data;
      if (!response || typeof response !== 'object' || Array.isArray(response)) {
        throw new Error('Profile settings update returned an invalid response.');
      }
      return mapProfile(response as unknown as ProfileSettingsRow);
    },
  };
}
