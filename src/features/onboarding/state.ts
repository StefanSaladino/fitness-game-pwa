import type { OnboardingProfile, OnboardingStage } from './model';

export function isProfileOnboardingComplete(profile: OnboardingProfile): boolean {
  return profile.onboardingCompletedAt !== null;
}

export function resolveOnboardingStage(profile: OnboardingProfile): OnboardingStage {
  return isProfileOnboardingComplete(profile) ? 'GROUP_SETUP' : 'PROFILE_SETUP';
}
