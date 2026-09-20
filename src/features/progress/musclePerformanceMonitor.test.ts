import { describe, expect, it } from 'vitest';
import type { MusclePerformanceSourceObservation } from './musclePerformanceMonitor';
import {
  buildAllMusclePerformanceMonitors,
  buildMusclePerformanceMonitor,
} from './musclePerformanceMonitor';

function observation(
  dayOffset: number,
  index: number,
  overrides: Partial<MusclePerformanceSourceObservation> = {},
): MusclePerformanceSourceObservation {
  const start = Date.parse('2026-08-01T12:00:00Z');
  const date = new Date(start + dayOffset * 86_400_000);

  return {
    muscleGroup: 'CHEST',
    exerciseId: 'bench',
    canonicalName: 'Bench Press',
    contributionRole: 'DIRECT',
    contributionWeight: 1,
    scoringDate: date.toISOString().slice(0, 10),
    observedAt: date.toISOString(),
    relativePerformanceIndex: index,
    ...overrides,
  };
}

describe('buildMusclePerformanceMonitor', () => {
  it('creates one muscle-level scoring-day signal instead of alternating raw exercise points', () => {
    const rows: MusclePerformanceSourceObservation[] = [
      observation(0, 1, { exerciseId: 'bench', canonicalName: 'Bench Press' }),
      observation(0, 1.02, { exerciseId: 'fly', canonicalName: 'Cable Fly' }),
      observation(5, 1.01, { exerciseId: 'bench', canonicalName: 'Bench Press' }),
      observation(5, 1.03, { exerciseId: 'fly', canonicalName: 'Cable Fly' }),
      observation(10, 1.02),
      observation(15, 1.03),
    ];

    const result = buildMusclePerformanceMonitor('CHEST', rows);

    expect(result.monitor.evidenceCount).toBe(4);
    expect(result.monitor.exerciseCount).toBe(2);
    expect(result.monitor.confidence).toBe('MODERATE');
    expect(result.sources).toHaveLength(2);
  });

  it('weights direct contributors more heavily than indirect contributors', () => {
    const rows: MusclePerformanceSourceObservation[] = [
      observation(0, 1, { exerciseId: 'bench', canonicalName: 'Bench Press' }),
      observation(0, 0.8, {
        exerciseId: 'triceps',
        canonicalName: 'Triceps Extension',
        contributionRole: 'INDIRECT',
        contributionWeight: 0.5,
      }),
      observation(5, 1.03),
      observation(10, 1.06),
      observation(15, 1.09),
      observation(20, 1.12),
      observation(25, 1.15),
    ];

    const result = buildMusclePerformanceMonitor('CHEST', rows);

    expect(result.monitor.trend).toBe('IMPROVING');
    expect(result.sources[0]?.canonicalName).toBe('Bench Press');
  });

  it('preserves staggered performance as variable at muscle level', () => {
    const rows = [
      observation(0, 1),
      observation(5, 1.08),
      observation(10, 0.95),
      observation(15, 1.09),
      observation(20, 0.94),
      observation(25, 1.07),
      observation(30, 0.96),
      observation(35, 1.06),
    ];

    const result = buildMusclePerformanceMonitor('CHEST', rows);

    expect(result.monitor.trend).toBe('VARIABLE');
    expect(result.monitor.persistence).toBe('SUSTAINED');
  });

  it('uses scoringDate as the daily boundary even when observedAt crosses UTC dates', () => {
    const rows = [
      observation(0, 1, { observedAt: '2026-08-02T03:55:00Z' }),
      observation(0, 1.01, {
        exerciseId: 'fly',
        canonicalName: 'Cable Fly',
        observedAt: '2026-08-02T04:05:00Z',
      }),
      observation(5, 1.02),
      observation(10, 1.03),
      observation(15, 1.04),
    ];

    const result = buildMusclePerformanceMonitor('CHEST', rows);

    expect(result.monitor.evidenceCount).toBe(4);
  });

  it('does not let unrelated muscle observations contaminate the monitor', () => {
    const rows = [
      observation(0, 1),
      observation(5, 1.01),
      observation(10, 1.02),
      observation(15, 1.03),
      observation(20, 1.04),
      observation(25, 1.05),
      observation(0, 0.7, {
        muscleGroup: 'BACK',
        exerciseId: 'row',
        canonicalName: 'Barbell Row',
      }),
    ];

    const chest = buildMusclePerformanceMonitor('CHEST', rows);

    expect(chest.sources.some((source) => source.exerciseId === 'row')).toBe(false);
    expect(chest.monitor.evidenceCount).toBe(6);
  });

  it('does not manufacture a trend from a sequence of one-off exercises', () => {
    const rows = Array.from({ length: 7 }, (_, index) =>
      observation(index * 5, 1, {
        exerciseId: `exercise-${index}`,
        canonicalName: `Exercise ${index}`,
      }),
    );

    const result = buildMusclePerformanceMonitor('CHEST', rows);

    expect(result.monitor.trend).toBe('INSUFFICIENT_DATA');
    expect(result.monitor.exerciseCount).toBe(0);
    expect(result.monitor.evidenceCount).toBe(0);
    expect(result.sources).toEqual([]);
  });

  it('builds independent monitors for each muscle group present', () => {
    const rows = [
      observation(0, 1),
      observation(5, 1.01),
      observation(10, 1.02),
      observation(15, 1.03),
      observation(0, 1, {
        muscleGroup: 'BACK',
        exerciseId: 'row',
        canonicalName: 'Barbell Row',
      }),
      observation(5, 0.99, {
        muscleGroup: 'BACK',
        exerciseId: 'row',
        canonicalName: 'Barbell Row',
      }),
      observation(10, 0.98, {
        muscleGroup: 'BACK',
        exerciseId: 'row',
        canonicalName: 'Barbell Row',
      }),
      observation(15, 0.97, {
        muscleGroup: 'BACK',
        exerciseId: 'row',
        canonicalName: 'Barbell Row',
      }),
    ];

    const monitors = buildAllMusclePerformanceMonitors(rows);

    expect(monitors.map((result) => result.muscleGroup)).toEqual([
      'BACK',
      'CHEST',
    ]);
  });
});
