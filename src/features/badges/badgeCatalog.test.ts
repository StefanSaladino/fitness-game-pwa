import { describe, expect, it } from 'vitest';
import { LIFTING_BADGE_KEYS, liftingBadgeDefinition } from '../consistency';
import { BADGE_CATALOG, badgePresentationDefinition } from './badgeCatalog';

describe('badge presentation catalog', () => {
  it('covers every authoritative lifting badge exactly once', () => {
    expect(BADGE_CATALOG.map((badge) => badge.key)).toEqual([...LIFTING_BADGE_KEYS]);
    expect(new Set(BADGE_CATALOG.map((badge) => badge.key)).size).toBe(LIFTING_BADGE_KEYS.length);
  });

  it('inherits canonical achievement copy instead of redefining unlock rules', () => {
    for (const badge of BADGE_CATALOG) {
      const canonical = liftingBadgeDefinition(badge.key);
      expect(badge).toMatchObject({
        key: canonical.key,
        title: canonical.title,
        description: canonical.description,
        category: canonical.category,
      });
    }
  });

  it('gives every collectible a complete visual palette and deterministic order', () => {
    BADGE_CATALOG.forEach((badge, index) => {
      expect(badge.sortOrder).toBe(index);
      expect(Object.values(badge.palette).every(Boolean)).toBe(true);
      expect(badgePresentationDefinition(badge.key)).toBe(badge);
    });
  });
});
