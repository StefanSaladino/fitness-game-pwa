import { describe, expect, it } from 'vitest';
import {
  bodyweightProgressionBonus,
  calculateDailyProgressionXp,
  calculateExerciseProgressionBonus,
  estimatedOneRepMaxEpley,
  progressionBonusForImprovementRatio,
  relativeImprovementHigherIsBetter,
} from '../progression/performance';

describe('weighted lifting progression tiers', () => {
  it.each([
    [0, 0],
    [0.00999, 0],
    [0.01, 5],
    [0.02499, 5],
    [0.025, 10],
    [0.04999, 10],
    [0.05, 15],
    [0.50, 15],
  ])('%d improvement -> %i XP', (ratio: number, expected: number) => {
    expect(progressionBonusForImprovementRatio(ratio)).toBe(expected);
  });

  it('first valid exercise observation establishes baseline but earns no progression XP', () => {
    expect(calculateExerciseProgressionBonus({
      hasPriorBaseline: false,
      qualifyingLiftingWorkout: true,
      improvementRatio: 0.10,
    })).toBe(0);
  });

  it('requires the observation to come from a qualifying lifting workout', () => {
    expect(calculateExerciseProgressionBonus({
      hasPriorBaseline: true,
      qualifyingLiftingWorkout: false,
      improvementRatio: 0.10,
    })).toBe(0);
  });

  it('sums distinct exercise bonuses but caps progression XP at 30/day', () => {
    expect(calculateDailyProgressionXp([])).toBe(0);
    expect(calculateDailyProgressionXp([5, 10])).toBe(15);
    expect(calculateDailyProgressionXp([15, 15])).toBe(30);
    expect(calculateDailyProgressionXp([15, 15, 15])).toBe(30);
    expect(calculateDailyProgressionXp([100, 100])).toBe(30);
  });
});

describe('lifting performance calculations', () => {
  it('calculates higher-is-better improvement only above the prior personal best', () => {
    expect(relativeImprovementHigherIsBetter(100, 105)).toBeCloseTo(0.05);
    expect(relativeImprovementHigherIsBetter(100, 99)).toBe(0);
  });

  it('calculates Epley e1RM only for valid weighted working-set ranges', () => {
    expect(estimatedOneRepMaxEpley(100, 6)).toBeCloseTo(120);
    expect(estimatedOneRepMaxEpley(100, 13)).toBeNull();
    expect(estimatedOneRepMaxEpley(0, 6)).toBeNull();
  });

  it.each([
    [10, 10, 0],
    [10, 11, 5],
    [10, 12, 10],
    [10, 13, 15],
    [10, 20, 15],
  ])('bodyweight best %i -> %i gives %i XP', (previous, current, expected) => {
    expect(bodyweightProgressionBonus(previous, current)).toBe(expected);
  });
});
