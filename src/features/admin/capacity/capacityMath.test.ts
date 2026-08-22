import { describe, expect, it } from 'vitest';
import {
  assessCapacityMetric,
  capacityUtilizationPercent,
  estimateCapacityGrowth,
  latestComparableMeasurements,
  validateCapacityThresholds,
} from './capacityMath';
import type { CapacityMetricMeasurement, CapacitySnapshot } from './model';

function measurement(overrides: Partial<CapacityMetricMeasurement> = {}): CapacityMetricMeasurement {
  return {
    code: 'database_bytes',
    source: 'DATABASE_LOCAL',
    unit: 'bytes',
    value: 50,
    limit: 100,
    measuredAt: '2026-08-20T00:00:00.000Z',
    available: true,
    ...overrides,
  };
}

describe('capacity warning semantics', () => {
  it.each([
    [59.99, 'NORMAL'],
    [60, 'WATCH'],
    [74.99, 'WATCH'],
    [75, 'WARNING'],
    [84.99, 'WARNING'],
    [85, 'CRITICAL'],
    [99.99, 'CRITICAL'],
    [100, 'EXCEEDED'],
    [125, 'EXCEEDED'],
  ] as const)('classifies %s%% as %s', (value, status) => {
    expect(assessCapacityMetric(measurement({ value })).status).toBe(status);
  });

  it('keeps a measurable metric unconfigured until a real allowance is supplied', () => {
    expect(assessCapacityMetric(measurement({ limit: null }))).toMatchObject({
      status: 'UNCONFIGURED',
      utilizationPercent: null,
    });
  });

  it('does not turn provider failure into zero usage', () => {
    expect(assessCapacityMetric(measurement({ available: false, value: null }))).toMatchObject({
      status: 'UNAVAILABLE',
      utilizationPercent: null,
    });
  });

  it('rejects malformed thresholds instead of silently reordering them', () => {
    expect(() => validateCapacityThresholds({ watch: 75, warning: 60, critical: 85 })).toThrow(/increase/);
    expect(() => validateCapacityThresholds({ watch: 0, warning: 75, critical: 85 })).toThrow(/between 0 and 100/);
    expect(() => validateCapacityThresholds({ watch: 60, warning: 75, critical: 100 })).toThrow(/between 0 and 100/);
  });

  it('rejects invalid usage and limit inputs', () => {
    expect(() => capacityUtilizationPercent(-1, 100)).toThrow(/non-negative/);
    expect(() => capacityUtilizationPercent(1, 0)).toThrow(/positive/);
  });
});

describe('capacity growth estimates', () => {
  it('estimates positive daily growth and time to a configured limit', () => {
    const previous = measurement({ value: 40, measuredAt: '2026-08-18T00:00:00.000Z' });
    const current = measurement({ value: 60, measuredAt: '2026-08-20T00:00:00.000Z' });

    expect(estimateCapacityGrowth(previous, current)).toEqual({
      metricCode: 'database_bytes',
      source: 'DATABASE_LOCAL',
      unitsPerDay: 10,
      daysUntilLimit: 4,
    });
  });

  it('returns zero days when a growing metric has already reached its limit', () => {
    expect(estimateCapacityGrowth(
      measurement({ value: 90, measuredAt: '2026-08-19T00:00:00.000Z' }),
      measurement({ value: 105, measuredAt: '2026-08-20T00:00:00.000Z' }),
    )?.daysUntilLimit).toBe(0);
  });

  it('refuses misleading projections for flat, shrinking, mismatched, unavailable, or time-reversed samples', () => {
    const base = measurement();
    expect(estimateCapacityGrowth(base, measurement({ value: 50, measuredAt: '2026-08-21T00:00:00.000Z' }))).toBeNull();
    expect(estimateCapacityGrowth(base, measurement({ value: 40, measuredAt: '2026-08-21T00:00:00.000Z' }))).toBeNull();
    expect(estimateCapacityGrowth(base, measurement({ code: 'storage_bytes', measuredAt: '2026-08-21T00:00:00.000Z' }))).toBeNull();
    expect(estimateCapacityGrowth(base, measurement({ available: false, value: null, measuredAt: '2026-08-21T00:00:00.000Z' }))).toBeNull();
    expect(estimateCapacityGrowth(base, measurement({ value: 60, measuredAt: '2026-08-19T00:00:00.000Z' }))).toBeNull();
  });

  it('selects only the two newest comparable measurements for trend work', () => {
    const snapshots: CapacitySnapshot[] = [
      { capturedAt: '2026-08-18T00:00:00.000Z', metrics: [measurement({ value: 30, measuredAt: '2026-08-18T00:00:00.000Z' })] },
      { capturedAt: '2026-08-19T00:00:00.000Z', metrics: [measurement({ code: 'storage_bytes', value: 20, measuredAt: '2026-08-19T00:00:00.000Z' })] },
      { capturedAt: '2026-08-20T00:00:00.000Z', metrics: [measurement({ value: 50, measuredAt: '2026-08-20T00:00:00.000Z' })] },
      { capturedAt: '2026-08-21T00:00:00.000Z', metrics: [measurement({ value: 60, measuredAt: '2026-08-21T00:00:00.000Z' })] },
    ];

    expect(latestComparableMeasurements(snapshots, measurement()).map((item) => item.value)).toEqual([60, 50]);
  });
});
