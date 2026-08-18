import { describe, expect, it } from 'vitest';
import {
  benchmarkState,
  selectInitialHigherIsBetterBenchmark,
  selectInitialLowerIsBetterBenchmark,
} from '../progression/benchmarks';

describe('benchmark lifecycle', () => {
  it.each([
    [0, 'UNSEEN'],
    [1, 'CALIBRATING'],
    [2, 'ESTABLISHED'],
    [3, 'ESTABLISHED'],
  ] as const)('%i prior observations -> %s', (count: number, state: 'UNSEEN' | 'CALIBRATING' | 'ESTABLISHED') => {
    expect(benchmarkState(count)).toBe(state);
  });

  it('uses the better of the first two higher-is-better calibration observations', () => {
    expect(selectInitialHigherIsBetterBenchmark([100, 105])).toBe(105);
    expect(selectInitialHigherIsBetterBenchmark([105, 100])).toBe(105);
  });

  it('uses the better of the first two lower-is-better calibration observations', () => {
    expect(selectInitialLowerIsBetterBenchmark([1680, 1740])).toBe(1680);
    expect(selectInitialLowerIsBetterBenchmark([1740, 1680])).toBe(1680);
  });

  it('does not establish a benchmark from one observation', () => {
    expect(selectInitialHigherIsBetterBenchmark([100])).toBeNull();
    expect(selectInitialLowerIsBetterBenchmark([100])).toBeNull();
  });
});
