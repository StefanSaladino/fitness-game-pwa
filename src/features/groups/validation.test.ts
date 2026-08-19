import { describe, expect, it } from 'vitest';
import {
  assertValidCreateGroupInput,
  assertValidInviteOptions,
  assertValidInviteToken,
  normalizeGroupName,
  normalizeInviteToken,
  validateInviteToken,
} from './validation';

const TOKEN = '6ccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('group validation', () => {
  it('normalizes whitespace in group names', () => {
    expect(normalizeGroupName('  Iron   Crew  ')).toBe('Iron Crew');
    expect(assertValidCreateGroupInput({ name: '  Iron   Crew  ' })).toBe('Iron Crew');
  });

  it('rejects empty and oversized group names', () => {
    expect(() => assertValidCreateGroupInput({ name: '   ' })).toThrow('Group input is invalid.');
    expect(() => assertValidCreateGroupInput({ name: 'x'.repeat(81) })).toThrow('Group input is invalid.');
  });

  it('accepts a raw UUID invite token', () => {
    expect(assertValidInviteToken(TOKEN.toUpperCase())).toBe(TOKEN);
  });

  it('extracts invite tokens from query links and path links', () => {
    expect(normalizeInviteToken(`https://app.example.com/group?invite=${TOKEN}`)).toBe(TOKEN);
    expect(normalizeInviteToken(`https://app.example.com/join/${TOKEN}`)).toBe(TOKEN);
  });


  it('returns presentation-friendly invite validation without throwing', () => {
    expect(validateInviteToken(`https://app.example.com/join/${TOKEN}`)).toEqual({ token: TOKEN, issues: [] });
    expect(validateInviteToken('not-an-invite').issues[0]?.field).toBe('inviteToken');
  });

  it('rejects malformed invite values', () => {
    expect(() => assertValidInviteToken('not-an-invite')).toThrow('Group input is invalid.');
  });

  it('accepts valid invite options', () => {
    expect(() => assertValidInviteOptions({
      maxUses: 250,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })).not.toThrow();
  });

  it('rejects invalid invite use limits and expiration', () => {
    expect(() => assertValidInviteOptions({ maxUses: 0 })).toThrow('Group input is invalid.');
    expect(() => assertValidInviteOptions({ maxUses: 1001 })).toThrow('Group input is invalid.');
    expect(() => assertValidInviteOptions({ expiresAt: '2000-01-01T00:00:00.000Z' })).toThrow('Group input is invalid.');
  });
});

