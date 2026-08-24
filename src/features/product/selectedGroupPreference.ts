import type { GroupSummary } from '../groups';

const STORAGE_PREFIX = 'top-set:selected-group:';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readSelectedGroupPreference(userId: string): string {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(storageKey(userId)) ?? '';
  } catch {
    return '';
  }
}

export function resolveSelectedGroupId(userId: string, groups: GroupSummary[]): string {
  const preferred = readSelectedGroupPreference(userId);
  if (preferred && groups.some((group) => group.id === preferred)) return preferred;
  return groups[0]?.id ?? '';
}

export function persistSelectedGroupPreference(userId: string, groupId: string): void {
  if (typeof window === 'undefined') return;

  try {
    if (groupId) {
      window.localStorage.setItem(storageKey(userId), groupId);
    } else {
      window.localStorage.removeItem(storageKey(userId));
    }
  } catch {
    // Local storage is optional UI context. The in-memory selection remains authoritative
    // for the current session when storage is unavailable or blocked.
  }
}
