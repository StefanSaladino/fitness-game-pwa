import { describe, expect, it } from 'vitest';
import {
  assertValidOnboardingInput,
  isSupportedTimeZone,
  normalizeOnboardingInput,
  OnboardingValidationError,
  validateOnboardingInput,
} from './validation';

describe('onboarding validation', () => {
  it('normalizes username/display name without changing the target', () => {
    expect(normalizeOnboardingInput({
      username: '  Stefan_23  ',
      displayName: '  Stefan Saladino  ',
      timezone: ' America/Toronto ',
      weeklyTarget: 4,
    })).toEqual({
      username: 'stefan_23',
      displayName: 'Stefan Saladino',
      timezone: 'America/Toronto',
      weeklyTarget: 4,
    });
  });

  it('accepts a valid onboarding payload', () => {
    const result = validateOnboardingInput({
      username: 'stefan_23',
      displayName: 'Stefan',
      timezone: 'America/Toronto',
      weeklyTarget: 3,
    });

    expect(result.issues).toEqual([]);
  });

  it.each(['ab', 'has-dash', 'has space', 'name!', ''])('rejects invalid username %j', (username) => {
    const result = validateOnboardingInput({
      username,
      displayName: 'Stefan',
      timezone: 'America/Toronto',
      weeklyTarget: 3,
    });

    expect(result.issues.some((issue) => issue.field === 'username')).toBe(true);
  });

  it.each([0, 1.5, 8, Number.NaN])('rejects invalid weekly target %s', (weeklyTarget) => {
    const result = validateOnboardingInput({
      username: 'stefan',
      displayName: 'Stefan',
      timezone: 'America/Toronto',
      weeklyTarget,
    });

    expect(result.issues.some((issue) => issue.field === 'weeklyTarget')).toBe(true);
  });

  it('uses the runtime timezone database for client-side feedback', () => {
    expect(isSupportedTimeZone('America/Toronto')).toBe(true);
    expect(isSupportedTimeZone('Not/A_Timezone')).toBe(false);
  });

  it('throws a structured error when asked to assert invalid input', () => {
    expect(() => assertValidOnboardingInput({
      username: 'x',
      displayName: '',
      timezone: 'Not/A_Timezone',
      weeklyTarget: 9,
    })).toThrow(OnboardingValidationError);
  });
});
