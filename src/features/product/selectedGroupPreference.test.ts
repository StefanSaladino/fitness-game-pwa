import { beforeEach, describe, expect, it } from 'vitest';
import type { GroupSummary } from '../groups';
import {
  persistSelectedGroupPreference,
  readSelectedGroupPreference,
  resolveSelectedGroupId,
} from './selectedGroupPreference';

const groups: GroupSummary[] = [
  { id: 'group-a', name: 'Alpha', memberCount: 2, role: 'MEMBER', joinedAt: '2026-08-20T18:00:00Z', createdAt: '2026-08-18T18:00:00Z' },
  { id: 'group-b', name: 'Bravo', memberCount: 3, role: 'ADMIN', joinedAt: '2026-08-21T18:00:00Z', createdAt: '2026-08-19T18:00:00Z' },
];

describe('selectedGroupPreference', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('falls back to the first current membership when no preference exists', () => {
    expect(resolveSelectedGroupId('user-1', groups)).toBe('group-a');
  });

  it('restores a preferred group only while that membership still exists', () => {
    persistSelectedGroupPreference('user-1', 'group-b');
    expect(readSelectedGroupPreference('user-1')).toBe('group-b');
    expect(resolveSelectedGroupId('user-1', groups)).toBe('group-b');
    expect(resolveSelectedGroupId('user-1', [groups[0]])).toBe('group-a');
  });

  it('scopes preferences by user', () => {
    persistSelectedGroupPreference('user-1', 'group-b');
    expect(readSelectedGroupPreference('user-2')).toBe('');
  });

  it('clears the persisted context when no group remains selected', () => {
    persistSelectedGroupPreference('user-1', 'group-b');
    persistSelectedGroupPreference('user-1', '');
    expect(readSelectedGroupPreference('user-1')).toBe('');
  });
});
