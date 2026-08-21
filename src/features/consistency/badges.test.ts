import { describe, expect, it } from 'vitest';
import { liftingBadgeDefinition } from './badges';

 describe('lifting badge catalog', () => {
  it('keeps badge copy recognition-only and separates cardio from lifting consistency', () => {
    expect(liftingBadgeDefinition('GOAL_STREAK_4')).toMatchObject({ category: 'CONSISTENCY', title: '4-Week Streak' });
    expect(liftingBadgeDefinition('CARDIO_BONUS_DAYS_5')).toMatchObject({ category: 'CARDIO' });
    expect(liftingBadgeDefinition('FIRST_PR').description).not.toMatch(/XP/i);
  });
});
