import { describe, expect, it } from 'vitest';
import {
  currentPathname,
  navigateToPath,
  productPathForSection,
  productSectionFromPathname,
  replacePath,
} from './appNavigation';

describe('app navigation', () => {
  it('pushes and replaces canonical paths without a routing dependency', () => {
    window.history.replaceState({}, '', '/');
    expect(currentPathname()).toBe('/');

    navigateToPath('/settings');
    expect(currentPathname()).toBe('/settings');

    replacePath('/platform-admin/capacity');
    expect(currentPathname()).toBe('/platform-admin/capacity');
  });

  it('maps every product destination to a canonical deep-linkable path', () => {
    expect(productPathForSection('home')).toBe('/');
    expect(productPathForSection('workouts')).toBe('/lift');
    expect(productPathForSection('cardio')).toBe('/cardio');
    expect(productPathForSection('groups')).toBe('/groups');
    expect(productPathForSection('progress')).toBe('/progress');
    expect(productPathForSection('compete')).toBe('/compete');
    expect(productSectionFromPathname('/lift')).toBe('workouts');
    expect(productSectionFromPathname('/unknown')).toBeNull();
  });

  it('updates query-only navigation on the same pathname', () => {
    window.history.replaceState({}, '', '/platform-admin/messages?target=first');
    navigateToPath('/platform-admin/messages?target=second');
    expect(window.location.search).toBe('?target=second');
  });
});
