import { describe, expect, it } from 'vitest';
import { LIFTING_BADGE_KEYS, type LiftingBadgeProgressSnapshot } from './model';
import { liftingBadgeProgress, liftingBadgeProgressEntries } from './badgeProgress';

function snapshot(overrides: Partial<LiftingBadgeProgressSnapshot> = {}): LiftingBadgeProgressSnapshot {
  return {
    prCount: 0,
    liftingDayCount: 0,
    goalsHit: 0,
    bestCompletedWeekStreak: 0,
    cardioBonusDayCount: 0,
    badges: [],
    ...overrides,
  };
}

describe('lifting badge progress', () => {
  it('returns one progress entry for every authoritative badge key', () => {
    expect(liftingBadgeProgressEntries(snapshot()).map((entry) => entry.badgeKey)).toEqual(LIFTING_BADGE_KEYS);
  });

  it('handles zero, threshold-1, threshold, and beyond-threshold progress without overflow', () => {
    expect(liftingBadgeProgress(snapshot({ prCount: 0 }), 'PR_10')).toMatchObject({ current: 0, required: 10, remaining: 10, percent: 0 });
    expect(liftingBadgeProgress(snapshot({ prCount: 9 }), 'PR_10')).toMatchObject({ current: 9, required: 10, remaining: 1, percent: 90 });
    expect(liftingBadgeProgress(snapshot({ prCount: 10 }), 'PR_10')).toMatchObject({ current: 10, required: 10, remaining: 0, percent: 100 });
    expect(liftingBadgeProgress(snapshot({ prCount: 17 }), 'PR_10')).toMatchObject({ current: 10, required: 10, remaining: 0, percent: 100 });
  });

  it('maps each badge family to the matching authoritative counter', () => {
    const state = snapshot({
      prCount: 12,
      liftingDayCount: 23,
      goalsHit: 1,
      bestCompletedWeekStreak: 3,
      cardioBonusDayCount: 4,
    });

    expect(liftingBadgeProgress(state, 'PR_25').current).toBe(12);
    expect(liftingBadgeProgress(state, 'LIFT_DAYS_50').current).toBe(23);
    expect(liftingBadgeProgress(state, 'GOAL_WEEK_1').current).toBe(1);
    expect(liftingBadgeProgress(state, 'GOAL_STREAK_4').current).toBe(3);
    expect(liftingBadgeProgress(state, 'CARDIO_BONUS_DAYS_5').current).toBe(4);
  });

  it('uses bars only for multi-step milestones', () => {
    expect(liftingBadgeProgress(snapshot(), 'FIRST_PR').showBar).toBe(false);
    expect(liftingBadgeProgress(snapshot(), 'GOAL_WEEK_1').showBar).toBe(false);
    expect(liftingBadgeProgress(snapshot(), 'PR_5').showBar).toBe(true);
    expect(liftingBadgeProgress(snapshot(), 'GOAL_STREAK_2').showBar).toBe(true);
  });
});
