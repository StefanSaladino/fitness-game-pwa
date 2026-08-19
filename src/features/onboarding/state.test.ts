import { describe, expect, it } from 'vitest';
import type { OnboardingProfile } from './model';
import { resolveOnboardingStage } from './state';

const profile: OnboardingProfile = {
  id: 'user-1',
  username: 'u_123',
  displayName: 'Athlete',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 3,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: null,
};

describe('onboarding state', () => {
  it('routes a new profile to profile setup', () => {
    expect(resolveOnboardingStage(profile)).toBe('PROFILE_SETUP');
  });

  it('routes a completed profile to group setup', () => {
    expect(resolveOnboardingStage({
      ...profile,
      onboardingCompletedAt: '2026-08-18T03:00:00.000Z',
    })).toBe('GROUP_SETUP');
  });
});
