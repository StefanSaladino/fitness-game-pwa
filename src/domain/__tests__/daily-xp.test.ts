import { describe, expect, it } from 'vitest';
import { calculateDailyXpTotal } from '../scoring/dailyXp';

describe('daily lifting-first XP total', () => {
  it('adds the four scoring layers', () => {
    expect(calculateDailyXpTotal({ liftingWorkoutXp: 50, exerciseXp: 25, progressionXp: 10, cardioBonusXp: 5 })).toBe(90);
  });

  it('caps the complete day at 125 XP', () => {
    expect(calculateDailyXpTotal({ liftingWorkoutXp: 50, exerciseXp: 30, progressionXp: 30, cardioBonusXp: 15 })).toBe(125);
    expect(calculateDailyXpTotal({ liftingWorkoutXp: 500, exerciseXp: 300, progressionXp: 300, cardioBonusXp: 150 })).toBe(125);
  });

  it('ignores invalid negative/non-finite inputs', () => {
    expect(calculateDailyXpTotal({ liftingWorkoutXp: -50, exerciseXp: Number.NaN, progressionXp: 10, cardioBonusXp: 5 })).toBe(15);
  });
});
