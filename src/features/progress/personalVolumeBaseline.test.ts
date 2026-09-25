import { describe, expect, it } from 'vitest';
import type { MuscleVolumeSummary } from './model';
import type { MusclePerformanceSourceObservation } from './musclePerformanceMonitor';
import {
  applyPersonalVolumeBaseline,
  buildPersonalVolumeBaseline,
  type WeeklyMuscleVolumeHistory,
} from './personalVolumeBaseline';

function volume(): MuscleVolumeSummary {
  return {
    muscleGroup: 'CHEST', windowDays: 7,
    windowStart: '2026-07-01', windowEnd: '2026-09-23',
    methodologyVersion: 'muscle-volume-v2',
    effectiveSets: 9, directEffectiveSets: 9, indirectEffectiveSets: 0,
    eligibleLogicalSets: 9, eligibleStages: 9, reviewFlaggedLogicalSets: 0,
    targetMin: 10, targetMidpoint: 14, targetMax: 18, highReviewAbove: 20,
    volumeStatus: 'BELOW_TARGET', benchmarkEvidenceConfidence: 'MODERATE',
    highConfidenceEffectiveSets: 9, mediumConfidenceEffectiveSets: 0,
    lowOrProvisionalEffectiveSets: 0, provisionalEffectiveSets: 0,
    highConfidenceProportion: 1, mediumConfidenceProportion: 0,
    lowOrProvisionalProportion: 0,
  };
}

function history(weeks: number): WeeklyMuscleVolumeHistory[] {
  const start = Date.parse('2026-07-06T00:00:00Z');
  return Array.from({ length: weeks }, (_, index) => ({
    muscleGroup: 'CHEST',
    weekStart: new Date(start + index * 7 * 86_400_000)
      .toISOString().slice(0, 10),
    effectiveSets: 8 + (index % 3),
    directEffectiveSets: 8 + (index % 3),
    indirectEffectiveSets: 0,
    eligibleLogicalSets: 8 + (index % 3),
  }));
}

function observations(weeks: number): MusclePerformanceSourceObservation[] {
  const start = Date.parse('2026-07-06T12:00:00Z');
  return Array.from({ length: weeks }).flatMap((_, index) => {
    const monday = new Date(start + index * 7 * 86_400_000);
    const friday = new Date(start + (index * 7 + 4) * 86_400_000);
    return [
      {
        muscleGroup: 'CHEST' as const, exerciseId: 'bench',
        canonicalName: 'Bench Press', contributionRole: 'DIRECT' as const,
        contributionWeight: 1, scoringDate: monday.toISOString().slice(0,10),
        observedAt: monday.toISOString(),
        relativePerformanceIndex: 1 + index * 0.02,
      },
      {
        muscleGroup: 'CHEST' as const, exerciseId: 'bench',
        canonicalName: 'Bench Press', contributionRole: 'DIRECT' as const,
        contributionWeight: 1, scoringDate: friday.toISOString().slice(0,10),
        observedAt: friday.toISOString(),
        relativePerformanceIndex: 1.02 + index * 0.02,
      },
    ];
  });
}

describe('personal volume baseline', () => {
  it('keeps population targets until personal evidence is sufficient', () => {
    const baseline = buildPersonalVolumeBaseline(
      volume(), history(4), observations(4),
    );
    expect(baseline.status).toBe('INSUFFICIENT_DATA');
    expect(baseline.personalWeight).toBe(0);
    expect(applyPersonalVolumeBaseline(volume(), baseline)).toEqual(volume());
  });

  it('learns a muscle-specific response range and blends it conservatively', () => {
    const baseline = buildPersonalVolumeBaseline(
      volume(), history(10), observations(10),
    );
    expect(baseline.status).toBe('ESTABLISHED');
    expect(baseline.personalWeight).toBe(0.7);
    expect(baseline.positiveResponseWeekCount).toBe(10);
    const personalized = applyPersonalVolumeBaseline(volume(), baseline);
    expect(personalized.targetMin).toBeLessThan(volume().targetMin);
    expect(personalized.targetMax).toBeLessThan(volume().targetMax);
  });

  it('does not borrow another muscle group response history', () => {
    const baseline = buildPersonalVolumeBaseline(
      { ...volume(), muscleGroup: 'QUADS' },
      history(10), observations(10),
    );
    expect(baseline.status).toBe('INSUFFICIENT_DATA');
    expect(baseline.personalWeight).toBe(0);
  });
});
