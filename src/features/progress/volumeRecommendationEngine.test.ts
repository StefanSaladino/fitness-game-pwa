import { describe, expect, it } from 'vitest';
import type { MuscleVolumeSummary } from './model';
import type { MusclePerformanceMonitor, MusclePerformanceTrend } from './performanceTrendEngine';
import { buildMuscleVolumeRecommendation } from './volumeRecommendationEngine';

function volume(overrides: Partial<MuscleVolumeSummary> = {}): MuscleVolumeSummary {
  return {
    muscleGroup: 'CHEST',
    windowDays: 7,
    windowStart: '2026-09-13',
    windowEnd: '2026-09-19',
    methodologyVersion: 'muscle-volume-v1',
    effectiveSets: 8,
    directEffectiveSets: 7,
    indirectEffectiveSets: 1,
    eligibleLogicalSets: 8,
    eligibleStages: 8,
    reviewFlaggedLogicalSets: 0,
    targetMin: 10,
    targetMidpoint: 14,
    targetMax: 18,
    highReviewAbove: 20,
    volumeStatus: 'BELOW_TARGET',
    benchmarkEvidenceConfidence: 'MODERATE',
    highConfidenceEffectiveSets: 7,
    mediumConfidenceEffectiveSets: 1,
    lowOrProvisionalEffectiveSets: 0,
    provisionalEffectiveSets: 0,
    highConfidenceProportion: 0.875,
    mediumConfidenceProportion: 0.125,
    lowOrProvisionalProportion: 0,
    ...overrides,
  };
}

function performance(
  trend: MusclePerformanceTrend,
  overrides: Partial<MusclePerformanceMonitor> = {},
): MusclePerformanceMonitor {
  return {
    trend,
    persistence: 'SUSTAINED',
    confidence: 'MODERATE',
    evidenceCount: 7,
    exerciseCount: 2,
    spanDays: 28,
    overallChange: 0,
    recentChange: 0,
    variability: 0.03,
    ...overrides,
  };
}

describe('volume recommendation matrix across practical trend states', () => {
  it.each([
    ['IMPROVING'],
    ['RECOVERING'],
    ['VARIABLE'],
    ['STABLE'],
  ] as const)('monitors below-target volume during %s performance', (trend) => {
    const result = buildMuscleVolumeRecommendation(
      volume({ effectiveSets: 7 }),
      performance(trend),
    );

    expect(result.action).toBe('MONITOR');
    expect(result.suggestedEffectiveSetChange).toBeNull();
  });

  it('adds cautiously only when below-target volume aligns with a sustained plateau', () => {
    const result = buildMuscleVolumeRecommendation(
      volume({ effectiveSets: 6 }),
      performance('PLATEAU'),
    );

    expect(result.action).toBe('ADD_VOLUME_CAUTIOUSLY');
    expect(result.suggestedEffectiveSetChange).toBe(2);
  });

  it.each([
    ['DECLINING'],
    ['REGRESSING'],
  ] as const)('holds below-target volume during %s performance', (trend) => {
    const result = buildMuscleVolumeRecommendation(
      volume({ effectiveSets: 6 }),
      performance(trend),
    );

    expect(result.action).toBe('HOLD_AND_REVIEW');
    expect(result.suggestedEffectiveSetChange).toBeNull();
  });

  it.each([
    ['IMPROVING'],
    ['RECOVERING'],
    ['VARIABLE'],
    ['STABLE'],
  ] as const)('monitors high volume during %s performance', (trend) => {
    const result = buildMuscleVolumeRecommendation(
      volume({ effectiveSets: 22, volumeStatus: 'HIGH_REVIEW' }),
      performance(trend),
    );

    expect(result.action).toBe('MONITOR');
    expect(result.suggestedEffectiveSetChange).toBeNull();
  });

  it.each([
    ['PLATEAU'],
    ['DECLINING'],
    ['REGRESSING'],
  ] as const)('reduces cautiously when high volume aligns with sustained %s performance', (trend) => {
    const result = buildMuscleVolumeRecommendation(
      volume({ effectiveSets: 22, volumeStatus: 'HIGH_REVIEW' }),
      performance(trend),
    );

    expect(result.action).toBe('REDUCE_VOLUME_CAUTIOUSLY');
    expect(result.suggestedEffectiveSetChange).toBe(-2);
  });

  it('maintains on-target volume during a plateau and reviews progression before volume', () => {
    const result = buildMuscleVolumeRecommendation(
      volume({ effectiveSets: 14, volumeStatus: 'ON_TARGET' }),
      performance('PLATEAU'),
    );

    expect(result.action).toBe('MAINTAIN');
    expect(result.rationale).toMatch(/progression and recovery review/i);
  });

  it('holds on-target volume during sustained decline rather than prescribing more or less volume', () => {
    const result = buildMuscleVolumeRecommendation(
      volume({ effectiveSets: 14, volumeStatus: 'ON_TARGET' }),
      performance('DECLINING'),
    );

    expect(result.action).toBe('HOLD_AND_REVIEW');
    expect(result.suggestedEffectiveSetChange).toBeNull();
  });

  it('monitors any off-target state when trend evidence is insufficient', () => {
    const result = buildMuscleVolumeRecommendation(
      volume({ effectiveSets: 6 }),
      performance('INSUFFICIENT_DATA', {
        persistence: 'INSUFFICIENT',
        confidence: 'LOW',
        evidenceCount: 2,
        exerciseCount: 1,
        spanDays: 5,
        overallChange: null,
        recentChange: null,
        variability: null,
      }),
    );

    expect(result.action).toBe('MONITOR');
  });

  it('monitors instead of acting when the volume estimate is mostly provisional', () => {
    const result = buildMuscleVolumeRecommendation(
      volume({
        effectiveSets: 6,
        lowOrProvisionalProportion: 0.7,
        highConfidenceProportion: 0.2,
        mediumConfidenceProportion: 0.1,
      }),
      performance('PLATEAU'),
    );

    expect(result.action).toBe('MONITOR');
  });
  it('treats a 28-day correction as a small next-7-day adjustment', () => {
    const result = buildMuscleVolumeRecommendation(
      volume({
        windowDays: 28,
        effectiveSets: 24,
        targetMin: 40,
        targetMidpoint: 56,
        targetMax: 72,
        highReviewAbove: 80,
        volumeStatus: 'BELOW_TARGET',
      }),
      performance('PLATEAU'),
    );

    expect(result.suggestedEffectiveSetChange).toBe(2);
    expect(result.rationale).toMatch(/next 7 days/i);
  });

});
