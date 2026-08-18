import { describe, expect, it } from 'vitest';
import {
  calculateDailyPerformanceXp,
  calculatePerformanceBonus,
  estimatedOneRepMaxEpley,
  isAccountPerformanceEligible,
  performanceBonusForImprovementRatio,
  relativeImprovementHigherIsBetter,
  relativeImprovementLowerIsBetter,
} from '../progression/performance';

describe('account performance eligibility', () => {
  const start = new Date('2026-08-01T12:00:00.000Z');
  it('is locked before 168 hours and unlocks exactly at 168 hours', () => {
    expect(isAccountPerformanceEligible(start, new Date('2026-08-08T11:59:59.999Z'))).toBe(false);
    expect(isAccountPerformanceEligible(start, new Date('2026-08-08T12:00:00.000Z'))).toBe(true);
  });
});

describe('performance bonus tiers', () => {
  it.each([
    [0, 0],
    [0.00999, 0],
    [0.01, 5],
    [0.02499, 5],
    [0.025, 10],
    [0.04999, 10],
    [0.05, 15],
    [0.09999, 15],
    [0.10, 25],
    [0.50, 25],
  ])('%d improvement -> %i XP', (ratio: number, expected: number) => {
    expect(performanceBonusForImprovementRatio(ratio)).toBe(expected);
  });

  it('requires two prior comparable observations, so the third is first eligible', () => {
    const common = { accountEligible: true, qualifyingWorkout: true, cooldownEligible: true, improvementRatio: 0.10 };
    expect(calculatePerformanceBonus({ ...common, validPriorObservationCount: 0 })).toBe(0);
    expect(calculatePerformanceBonus({ ...common, validPriorObservationCount: 1 })).toBe(0);
    expect(calculatePerformanceBonus({ ...common, validPriorObservationCount: 2 })).toBe(25);
  });

  it('requires both account and benchmark gates', () => {
    const common = { qualifyingWorkout: true, cooldownEligible: true, validPriorObservationCount: 2, improvementRatio: 0.05 };
    expect(calculatePerformanceBonus({ ...common, accountEligible: false })).toBe(0);
    expect(calculatePerformanceBonus({ ...common, accountEligible: true })).toBe(15);
  });

  it('requires a qualifying workout and an eligible cooldown', () => {
    const common = { accountEligible: true, validPriorObservationCount: 2, improvementRatio: 0.05 };
    expect(calculatePerformanceBonus({ ...common, qualifyingWorkout: false, cooldownEligible: true })).toBe(0);
    expect(calculatePerformanceBonus({ ...common, qualifyingWorkout: true, cooldownEligible: false })).toBe(0);
  });
});

describe('performance calculations', () => {
  it('calculates higher-is-better improvement only above the benchmark', () => {
    expect(relativeImprovementHigherIsBetter(100, 105)).toBeCloseTo(0.05);
    expect(relativeImprovementHigherIsBetter(100, 99)).toBe(0);
  });

  it('calculates lower-is-better improvement only below the benchmark', () => {
    expect(relativeImprovementLowerIsBetter(100, 95)).toBeCloseTo(0.05);
    expect(relativeImprovementLowerIsBetter(100, 101)).toBe(0);
  });

  it('caps multiple same-day performance bonuses at the single highest bonus', () => {
    expect(calculateDailyPerformanceXp([])).toBe(0);
    expect(calculateDailyPerformanceXp([5, 10])).toBe(10);
    expect(calculateDailyPerformanceXp([15, 25, 25])).toBe(25);
    expect(calculateDailyPerformanceXp([100])).toBe(25);
  });

  it('calculates an Epley score only for valid 1-12 rep weighted sets', () => {
    expect(estimatedOneRepMaxEpley(100, 6)).toBeCloseTo(120);
    expect(estimatedOneRepMaxEpley(100, 13)).toBeNull();
    expect(estimatedOneRepMaxEpley(0, 6)).toBeNull();
  });
});
