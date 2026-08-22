import { describe, expect, it } from 'vitest';
import { currentPathname, navigateToPath, replacePath } from './appNavigation';

describe('app navigation', () => {
  it('pushes and replaces canonical paths without a routing dependency', () => {
    window.history.replaceState({}, '', '/');
    expect(currentPathname()).toBe('/');

    navigateToPath('/settings');
    expect(currentPathname()).toBe('/settings');

    replacePath('/platform-admin/capacity');
    expect(currentPathname()).toBe('/platform-admin/capacity');
  });
});
