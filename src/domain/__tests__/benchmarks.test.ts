import { describe, expect, it } from 'vitest';
import { exerciseBaselineState, selectPriorHigherIsBetterPersonalBest } from '../progression/benchmarks';

describe('exercise baseline lifecycle', () => {
  it('establishes a baseline after the first valid observation', () => {
    expect(exerciseBaselineState(0)).toBe('UNSEEN');
    expect(exerciseBaselineState(1)).toBe('ESTABLISHED');
    expect(exerciseBaselineState(10)).toBe('ESTABLISHED');
  });

  it('uses the best prior valid observation as the personal best', () => {
    expect(selectPriorHigherIsBetterPersonalBest([100, 105, 103])).toBe(105);
    expect(selectPriorHigherIsBetterPersonalBest([Number.NaN, -1, 0])).toBeNull();
  });
});
