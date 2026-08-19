import { describe, expect, it } from 'vitest';
import { calculateDailyLiftingWorkoutXp } from '../scoring/baseXp';

describe('daily lifting workout XP', () => {
  it.each([
    [0, 0],
    [1, 50],
    [2, 50],
    [5, 50],
    [100, 50],
  ])('%i qualifying lifting workouts -> %i XP', (count: number, expected: number) => {
    expect(calculateDailyLiftingWorkoutXp(count)).toBe(expected);
  });

  it('cannot be manufactured from invalid counts', () => {
    expect(calculateDailyLiftingWorkoutXp(-1)).toBe(0);
    expect(calculateDailyLiftingWorkoutXp(Number.NaN)).toBe(0);
  });
});
