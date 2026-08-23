import { describe, expect, it } from 'vitest';
import {
  deletionConfirmationFor,
  deletionConfirmationMatches,
  normalizeSuspensionReviewAt,
  validateAccountActionReason,
} from './accountAdministrationValidation';

describe('account administration validation', () => {
  it('enforces the server reason boundary after trimming', () => {
    expect(validateAccountActionReason('  no  ')).toBe('Enter a reason with at least 3 characters.');
    expect(validateAccountActionReason(' Policy review ')).toBeNull();
    expect(validateAccountActionReason('x'.repeat(501))).toBe('Keep the reason to 500 characters or fewer.');
  });

  it('accepts only a valid future optional review timestamp', () => {
    const now = Date.parse('2026-08-22T12:00:00.000Z');
    expect(normalizeSuspensionReviewAt('', now)).toEqual({ value: null, error: null });
    expect(normalizeSuspensionReviewAt('not-a-date', now).error).toMatch(/valid review date/i);
    expect(normalizeSuspensionReviewAt('2026-08-22T11:00:00.000Z', now).error).toMatch(/future/i);
    expect(normalizeSuspensionReviewAt('2026-08-23T12:00:00.000Z', now)).toEqual({
      value: '2026-08-23T12:00:00.000Z',
      error: null,
    });
  });

  it('requires the exact case-sensitive deletion phrase', () => {
    expect(deletionConfirmationFor('alpha')).toBe('DELETE alpha');
    expect(deletionConfirmationMatches('DELETE alpha', 'alpha')).toBe(true);
    expect(deletionConfirmationMatches('delete alpha', 'alpha')).toBe(false);
    expect(deletionConfirmationMatches('DELETE alpha ', 'alpha')).toBe(false);
  });
});
