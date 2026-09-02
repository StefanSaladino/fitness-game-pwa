import { describe, expect, it } from 'vitest';
import { LIFTING_BADGE_KEYS } from './model';
import { liftingBadgeDefinition, liftingBadgeDefinitions } from './badges';

describe('lifting badge catalog', () => {
  it('keeps badge copy recognition-only and separates cardio from lifting consistency', () => {
    expect(liftingBadgeDefinition('GOAL_STREAK_4')).toMatchObject({ category: 'CONSISTENCY', title: '4-Week Streak' });
    expect(liftingBadgeDefinition('CARDIO_BONUS_DAYS_5')).toMatchObject({ category: 'CARDIO' });
    expect(liftingBadgeDefinition('FIRST_PR').description).not.toMatch(/XP/i);
  });

  it('exposes one definition for every authoritative badge key', () => {
    const definitions = liftingBadgeDefinitions();
    expect(definitions).toHaveLength(LIFTING_BADGE_KEYS.length);
    expect(definitions.map((definition) => definition.key)).toEqual([...LIFTING_BADGE_KEYS]);
    expect(new Set(definitions.map((definition) => definition.key)).size).toBe(LIFTING_BADGE_KEYS.length);
  });
});
