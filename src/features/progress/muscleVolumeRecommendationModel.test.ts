import { describe, expect, it } from 'vitest';
import type { MuscleVolumeSummary } from './model';
import type { MusclePerformanceSourceObservation } from './musclePerformanceMonitor';
import {
  buildMuscleVolumeRecommendationPayloads,
  indexMuscleVolumeRecommendationPayloads,
  muscleVolumeRecommendationPayloadKey,
} from './muscleVolumeRecommendationModel';

function volume(
  windowDays: 7 | 28,
  overrides: Partial<MuscleVolumeSummary> = {},
): MuscleVolumeSummary {
  return {
    muscleGroup: 'CHEST',
    windowDays,
    windowStart: windowDays === 7 ? '2026-09-13' : '2026-08-23',
    windowEnd: '2026-09-19',
    methodologyVersion: 'muscle-volume-v1',
    effectiveSets: windowDays === 7 ? 6 : 24,
    directEffectiveSets: windowDays === 7 ? 6 : 24,
    indirectEffectiveSets: 0,
    eligibleLogicalSets: windowDays === 7 ? 6 : 24,
    eligibleStages: windowDays === 7 ? 6 : 24,
    reviewFlaggedLogicalSets: 0,
    targetMin: windowDays === 7 ? 10 : 40,
    targetMidpoint: windowDays === 7 ? 14 : 56,
    targetMax: windowDays === 7 ? 18 : 72,
    highReviewAbove: windowDays === 7 ? 20 : 80,
    volumeStatus: 'BELOW_TARGET',
    benchmarkEvidenceConfidence: 'MODERATE',
    highConfidenceEffectiveSets: windowDays === 7 ? 6 : 24,
    mediumConfidenceEffectiveSets: 0,
    lowOrProvisionalEffectiveSets: 0,
    provisionalEffectiveSets: 0,
    highConfidenceProportion: 1,
    mediumConfidenceProportion: 0,
    lowOrProvisionalProportion: 0,
    ...overrides,
  };
}

function observations(values: number[]): MusclePerformanceSourceObservation[] {
  const start = Date.parse('2026-08-01T12:00:00Z');

  return values.map((value, index) => {
    const date = new Date(start + index * 5 * 86_400_000);
    return {
      muscleGroup: 'CHEST',
      exerciseId: 'bench',
      canonicalName: 'Barbell Bench Press',
      contributionRole: 'DIRECT',
      contributionWeight: 1,
      scoringDate: date.toISOString().slice(0, 10),
      observedAt: date.toISOString(),
      relativePerformanceIndex: value,
    };
  });
}

describe('muscle volume recommendation payload model', () => {
  it('combines one sustained muscle trend with both 7-day and 28-day volume assessments', () => {
    const payloads = buildMuscleVolumeRecommendationPayloads(
      [volume(7), volume(28)],
      observations([1, 1.01, 1, 1.005, 1, 1.01, 1]),
    );

    expect(payloads).toHaveLength(2);
    expect(payloads[0]?.performance.trend).toBe('PLATEAU');
    expect(payloads[1]?.performance.trend).toBe('PLATEAU');
    expect(payloads[0]?.recommendation.action).toBe('ADD_VOLUME_CAUTIOUSLY');
    expect(payloads[1]?.recommendation.action).toBe('ADD_VOLUME_CAUTIOUSLY');
  });

  it('keeps improving performance in monitor mode even when volume is below target', () => {
    const [payload] = buildMuscleVolumeRecommendationPayloads(
      [volume(7)],
      observations([0.94, 0.96, 0.98, 1, 1.03, 1.05, 1.07]),
    );

    expect(payload?.performance.trend).toBe('IMPROVING');
    expect(payload?.recommendation.action).toBe('MONITOR');
    expect(payload?.recommendation.suggestedEffectiveSetChange).toBeNull();
  });

  it('indexes payloads by muscle and volume window', () => {
    const payloads = buildMuscleVolumeRecommendationPayloads(
      [volume(7), volume(28)],
      observations([0.94, 0.96, 0.98, 1, 1.03, 1.05, 1.07]),
    );
    const index = indexMuscleVolumeRecommendationPayloads(payloads);

    expect(
      index.get(muscleVolumeRecommendationPayloadKey('CHEST', 28))?.windowDays,
    ).toBe(28);
  });
});
