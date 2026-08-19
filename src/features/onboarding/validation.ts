import type { NormalizedOnboardingInput, OnboardingInput, OnboardingValidationIssue } from './model';

export const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;
export const MIN_WEEKLY_TARGET = 1;
export const MAX_WEEKLY_TARGET = 7;

export function normalizeOnboardingInput(input: OnboardingInput): NormalizedOnboardingInput {
  return {
    username: input.username.trim().toLowerCase(),
    displayName: input.displayName.trim(),
    timezone: input.timezone.trim(),
    weeklyTarget: input.weeklyTarget,
  };
}

export function isSupportedTimeZone(timezone: string): boolean {
  if (!timezone) return false;

  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function validateOnboardingInput(input: OnboardingInput): {
  value: NormalizedOnboardingInput;
  issues: OnboardingValidationIssue[];
} {
  const value = normalizeOnboardingInput(input);
  const issues: OnboardingValidationIssue[] = [];

  if (!USERNAME_PATTERN.test(value.username)) {
    issues.push({
      field: 'username',
      message: 'Username must be 3-32 letters, numbers, or underscores.',
    });
  }

  if (value.displayName.length < 1 || value.displayName.length > 80) {
    issues.push({
      field: 'displayName',
      message: 'Display name must be between 1 and 80 characters.',
    });
  }

  if (!isSupportedTimeZone(value.timezone)) {
    issues.push({
      field: 'timezone',
      message: 'Choose a valid IANA timezone.',
    });
  }

  if (
    !Number.isInteger(value.weeklyTarget)
    || value.weeklyTarget < MIN_WEEKLY_TARGET
    || value.weeklyTarget > MAX_WEEKLY_TARGET
  ) {
    issues.push({
      field: 'weeklyTarget',
      message: 'Weekly target must be a whole number from 1 to 7.',
    });
  }

  return { value, issues };
}

export function assertValidOnboardingInput(input: OnboardingInput): NormalizedOnboardingInput {
  const result = validateOnboardingInput(input);

  if (result.issues.length > 0) {
    throw new OnboardingValidationError(result.issues);
  }

  return result.value;
}

export class OnboardingValidationError extends Error {
  constructor(public readonly issues: OnboardingValidationIssue[]) {
    super('Onboarding input is invalid.');
    this.name = 'OnboardingValidationError';
  }
}
