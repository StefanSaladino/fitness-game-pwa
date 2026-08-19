import { describe, expect, it } from 'vitest';
import { calculateWeeklyLiftingConsistency, nextWeeklyGoalStreak, weeklyImprovementBonus, weeklyLiftingGoalAchieved } from '../consistency/weekly';

describe('weekly lifting consistency', () => {
  it.each([
    [0, 4, 0],
    [1, 4, 0.25],
    [2, 4, 0.5],
    [3, 4, 0.75],
    [4, 4, 1],
    [7, 4, 1],
  ])('%i lifting days / target %i -> %d', (days: number, target: number, expected: number) => {
    expect(calculateWeeklyLiftingConsistency(days, target)).toBe(expected);
  });

  it('treats the weekly target as lifting days, not all activity days', () => {
    expect(weeklyLiftingGoalAchieved(3, 4)).toBe(false);
    expect(weeklyLiftingGoalAchieved(4, 4)).toBe(true);
  });

  it('tracks consecutive completed weekly goals instead of daily workout streaks', () => {
    expect(nextWeeklyGoalStreak(0, true)).toBe(1);
    expect(nextWeeklyGoalStreak(7, true)).toBe(8);
    expect(nextWeeklyGoalStreak(7, false)).toBe(0);
  });

  it('awards no weekly-improvement XP in lifting-v1', () => {
    expect(weeklyImprovementBonus()).toBe(0);
  });
});
