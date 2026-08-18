import { describe, expect, it } from 'vitest';
import { calculateWeeklyConsistency, weeklyImprovementBonus } from '../consistency/weekly';

describe('weekly consistency', () => {
  it.each([
    [0, 4, 0],
    [1, 4, 0.25],
    [2, 4, 0.5],
    [3, 4, 0.75],
    [4, 4, 1],
    [5, 4, 1],
    [7, 4, 1],
  ])('%i qualifying days / target %i -> %d', (days: number, target: number, expected: number) => {
    expect(calculateWeeklyConsistency(days, target)).toBe(expected);
  });

  it('never exceeds 100%', () => {
    expect(calculateWeeklyConsistency(1000, 1)).toBe(1);
  });
});

describe('weekly improvement bonus', () => {
  it.each([
    [0.50, 0.50, 0],
    [0.75, 0.50, 0],
    [0.50, 0.55, 10],
    [0.50, 0.60, 20],
    [0.50, 0.75, 35],
    [0.50, 1.00, 50],
  ])('%d -> %d gives %i XP', (previous: number, current: number, expected: number) => {
    expect(weeklyImprovementBonus(previous, current)).toBe(expected);
  });

  it('does not award improvement when the weekly target changed', () => {
    expect(weeklyImprovementBonus(0.5, 1, false)).toBe(0);
  });
});
