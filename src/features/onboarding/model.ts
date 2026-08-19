export interface OnboardingInput {
  username: string;
  displayName: string;
  timezone: string;
  weeklyTarget: number;
}

export interface NormalizedOnboardingInput extends OnboardingInput {}

export interface OnboardingProfile {
  id: string;
  username: string;
  displayName: string;
  timezone: string;
  weeklyWorkoutTarget: number;
  pendingWeeklyWorkoutTarget: number | null;
  onboardingCompletedAt: string | null;
}

export type OnboardingField = 'username' | 'displayName' | 'timezone' | 'weeklyTarget';

export interface OnboardingValidationIssue {
  field: OnboardingField;
  message: string;
}

export type OnboardingStage = 'PROFILE_SETUP' | 'GROUP_SETUP';
