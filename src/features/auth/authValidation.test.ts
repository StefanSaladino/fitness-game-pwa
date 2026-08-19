import { describe, expect, it } from 'vitest';
import { hasValidationErrors, normalizeEmail, validateSignIn, validateSignUp } from './authValidation';

describe('auth validation', () => {
  it('normalizes email without mutating password content', () => {
    const result = validateSignIn({ email: '  STEFAN@EXAMPLE.COM ', password: ' Secret123 ' });
    expect(result.value).toEqual({ email: 'stefan@example.com', password: ' Secret123 ' });
    expect(result.errors).toEqual({});
  });

  it('rejects malformed sign-in values', () => {
    const result = validateSignIn({ email: 'invalid', password: '' });
    expect(result.errors.email).toMatch(/valid email/i);
    expect(result.errors.password).toMatch(/password/i);
    expect(hasValidationErrors(result.errors)).toBe(true);
  });

  it('validates sign-up display name, password length, and confirmation', () => {
    const result = validateSignUp({
      displayName: ' ',
      email: 'user@example.com',
      password: 'short',
      confirmPassword: 'different',
    });

    expect(result.errors.displayName).toBeTruthy();
    expect(result.errors.password).toMatch(/8 characters/i);
    expect(result.errors.confirmPassword).toMatch(/do not match/i);
  });

  it('accepts a valid sign-up payload', () => {
    const result = validateSignUp({
      displayName: ' Stefan ',
      email: 'STEFAN@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(result.errors).toEqual({});
    expect(result.value.displayName).toBe('Stefan');
    expect(result.value.email).toBe(normalizeEmail('STEFAN@example.com'));
  });
});
