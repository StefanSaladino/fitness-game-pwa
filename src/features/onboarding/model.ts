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
  profileCode?: string;
  preferredWeightUnit: 'KG' | 'LB';

  // Optional keeps older test/fixture objects source-compatible. Profiles loaded
  // from the hosted schema always map the persisted value, defaulting to zero.
  tutorialCompletedVersion?: number;
}

export type OnboardingField =
  | 'username'
  | 'displayName'
  | 'timezone'
  | 'weeklyTarget';

export interface OnboardingValidationIssue {
  field: OnboardingField;
  message: string;
}

export type OnboardingStage = 'PROFILE_SETUP' | 'GROUP_SETUP';
