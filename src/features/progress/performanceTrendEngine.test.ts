import { describe, expect, it } from 'vitest';
import {
  classifyMusclePerformanceTrend,
  trendSupportsCorrectiveAction,
  type MusclePerformanceSample,
} from './performanceTrendEngine';

function samples(values: number[], start = '2026-08-01'): MusclePerformanceSample[] {
  const startMs = Date.parse(`${start}T12:00:00Z`);

  return values.map((value, index) => ({
    exerciseId: index % 2 === 0 ? 'bench' : 'incline',
    observedAt: new Date(startMs + index * 5 * 86_400_000).toISOString(),
    relativePerformanceIndex: value,
  }));
}

describe('classifyMusclePerformanceTrend', () => {
  it('classifies sustained improving performance', () => {
    const result = classifyMusclePerformanceTrend(
      samples([0.94, 0.96, 0.98, 1.0, 1.03, 1.05, 1.07]),
    );

    expect(result.trend).toBe('IMPROVING');
    expect(result.persistence).toBe('SUSTAINED');
  });

  it('classifies sustained declining performance', () => {
    const result = classifyMusclePerformanceTrend(
      samples([1.08, 1.06, 1.04, 1.01, 0.99, 0.96, 0.94]),
    );

    expect(result.trend).toBe('DECLINING');
  });

  it('classifies a long flat signal as a plateau', () => {
    const result = classifyMusclePerformanceTrend(
      samples([1.0, 1.01, 0.995, 1.005, 1.0, 1.01, 1.0]),
    );

    expect(result.trend).toBe('PLATEAU');
  });

  it('classifies a shorter flat signal as stable rather than plateau', () => {
    const result = classifyMusclePerformanceTrend(
      samples([1.0, 1.01, 1.0, 1.005], '2026-09-01'),
    );

    expect(result.trend).toBe('STABLE');
  });

  it('classifies staggered oscillating performance as variable', () => {
    const result = classifyMusclePerformanceTrend(
      samples([1.0, 1.07, 0.96, 1.08, 0.95, 1.06, 0.97, 1.05]),
    );

    expect(result.trend).toBe('VARIABLE');
  });

  it('classifies an upward reversal after decline as recovering', () => {
    const result = classifyMusclePerformanceTrend(
      samples([1.05, 1.02, 0.99, 0.96, 0.98, 1.01, 1.04, 1.06]),
    );

    expect(result.trend).toBe('RECOVERING');
  });

  it('classifies a downward reversal after improvement as regressing', () => {
    const result = classifyMusclePerformanceTrend(
      samples([0.96, 0.99, 1.02, 1.05, 1.03, 1.0, 0.97, 0.95]),
    );

    expect(result.trend).toBe('REGRESSING');
  });

  it('returns insufficient data instead of forcing a trend', () => {
    const result = classifyMusclePerformanceTrend(
      samples([1.0, 1.03, 1.02]),
    );

    expect(result.trend).toBe('INSUFFICIENT_DATA');
    expect(result.persistence).toBe('INSUFFICIENT');
  });

  it('only allows sustained plateau/decline/regression to drive corrective action', () => {
    const plateau = classifyMusclePerformanceTrend(
      samples([1.0, 1.01, 0.995, 1.005, 1.0, 1.01, 1.0]),
    );
    const improving = classifyMusclePerformanceTrend(
      samples([0.94, 0.96, 0.98, 1.0, 1.03, 1.05, 1.07]),
    );
    const variable = classifyMusclePerformanceTrend(
      samples([1.0, 1.07, 0.96, 1.08, 0.95, 1.06, 0.97, 1.05]),
    );

    expect(trendSupportsCorrectiveAction(plateau)).toBe(true);
    expect(trendSupportsCorrectiveAction(improving)).toBe(false);
    expect(trendSupportsCorrectiveAction(variable)).toBe(false);
  });
});
