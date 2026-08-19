import { describe, expect, it } from 'vitest';
import { calculateDailyCardioBonusXp, cardioBonusForActivity } from '../scoring/cardioBonus';
import type { WorkoutQualificationInput } from '../types';

const cardio = (activeDurationSeconds: number, category: WorkoutQualificationInput['category'] = 'RUNNING'): WorkoutQualificationInput => ({
  category,
  status: 'COMPLETED',
  source: 'IN_APP',
  activeDurationSeconds,
});

describe('cardio bonus', () => {
  it.each([
    [14 * 60 + 59, 0],
    [15 * 60, 5],
    [29 * 60 + 59, 5],
    [30 * 60, 10],
    [44 * 60 + 59, 10],
    [45 * 60, 15],
    [90 * 60, 15],
  ])('running duration %i seconds -> %i XP', (seconds, expected) => {
    expect(cardioBonusForActivity(cardio(seconds))).toBe(expected);
  });

  it('respects activity-specific minimums', () => {
    expect(cardioBonusForActivity(cardio(20 * 60, 'WALKING_HIKING'))).toBe(0);
    expect(cardioBonusForActivity(cardio(30 * 60, 'WALKING_HIKING'))).toBe(10);
    expect(cardioBonusForActivity(cardio(12 * 60, 'HIIT'))).toBe(5);
  });

  it('uses only the best cardio bonus of the day rather than summing sessions', () => {
    expect(calculateDailyCardioBonusXp([cardio(15 * 60), cardio(30 * 60), cardio(45 * 60)])).toBe(15);
  });

  it('does not award cardio bonus to strength, mobility, or other', () => {
    expect(cardioBonusForActivity(cardio(60 * 60, 'STRENGTH'))).toBe(0);
    expect(cardioBonusForActivity(cardio(60 * 60, 'MOBILITY'))).toBe(0);
    expect(cardioBonusForActivity(cardio(60 * 60, 'OTHER'))).toBe(0);
  });
});
