import { describe, expect, it } from 'vitest';
import { calculateDailyBaseWorkoutXp } from '../scoring/baseXp';

describe('daily base workout XP', () => {
  it.each([
    [0, 0],
    [1, 100],
    [2, 100],
    [5, 100],
    [100, 100],
  ])('%i qualifying workouts -> %i XP', (count: number, expected: number) => {
    expect(calculateDailyBaseWorkoutXp(count)).toBe(expected);
  });

  it('cannot be manufactured from invalid counts', () => {
    expect(calculateDailyBaseWorkoutXp(-1)).toBe(0);
    expect(calculateDailyBaseWorkoutXp(Number.NaN)).toBe(0);
  });
});
