import { describe, expect, it } from 'vitest';
import type { MusclePerformanceSourceObservation } from './musclePerformanceMonitor';
import type {
  TrainingReportMusclePeriodInput,
  TrainingReportPeriodSummary,
} from './trainingReportModel';
import {
  buildCompletedTrainingReport,
  buildTrainingReportPeriodDelta,
  inclusivePeriodDayCount,
} from './trainingReportModel';

const weeklyPeriod: TrainingReportPeriodSummary = {
  periodKind: 'WEEK',
  periodStart: '2026-09-07',
  periodEnd: '2026-09-13',
  completedLiftingSessions: 4,
  activeTrainingSeconds: 14_400,
  exerciseCount: 11,
  completedWorkingSets: 52,
  volumeKgReps: 42_000,
  prCount: 2,
};

function chestVolume(
  overrides: Partial<TrainingReportMusclePeriodInput> = {},
): TrainingReportMusclePeriodInput {
  return {
    muscleGroup: 'CHEST',
    methodologyVersion: 'muscle-volume-v1',
    effectiveSets: 7,
    directEffectiveSets: 6,
    indirectEffectiveSets: 1,
    eligibleLogicalSets: 8,
    eligibleStages: 8,
    reviewFlaggedLogicalSets: 0,
    benchmarkWindowDays: 7,
    targetMin: 10,
    targetMidpoint: 14,
    targetMax: 18,
    highReviewAbove: 20,
    lowStatusFractionOfTargetMin: 0.5,
    benchmarkEvidenceConfidence: 'MODERATE',
    highConfidenceEffectiveSets: 7,
    mediumConfidenceEffectiveSets: 0,
    lowOrProvisionalEffectiveSets: 0,
    provisionalEffectiveSets: 0,
    highConfidenceProportion: 1,
    mediumConfidenceProportion: 0,
    lowOrProvisionalProportion: 0,
    ...overrides,
  };
}

function performance(
  values: number[],
): MusclePerformanceSourceObservation[] {
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

describe('training report model', () => {
  it('uses an exact 7-day completed week against the 7-day benchmark', () => {
    const report = buildCompletedTrainingReport({
      period: weeklyPeriod,
      muscleVolume: [chestVolume()],
      performanceObservations: performance([
        1,
        1.01,
        1,
        1.005,
        1,
        1.01,
        1,
      ]),
    });

    const chest = report.muscles[0];

    expect(report.reportVersion).toBe('training-report-v1');
    expect(report.methodologyVersion).toBe('muscle-volume-v1');
    expect(chest?.snapshot.periodEffectiveSets).toBe(7);
    expect(chest?.snapshot.benchmarkEquivalentEffectiveSets).toBe(7);
    expect(chest?.snapshot.volumeStatus).toBe('BELOW_TARGET');
    expect(chest?.performance.trend).toBe('PLATEAU');
    expect(chest?.correctivePlan.action).toBe('ADD_VOLUME_CAUTIOUSLY');
    expect(chest?.correctivePlan.weeklyEffectiveSetAdjustment).toBe(2);
    expect(chest?.correctivePlan.preferredExercises).toEqual([
      'Barbell Bench Press',
    ]);
  });

  it('normalizes a 31-day calendar month to a 28-day benchmark pace without changing the frozen raw month total', () => {
    const report = buildCompletedTrainingReport({
      period: {
        ...weeklyPeriod,
        periodKind: 'MONTH',
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
      },
      muscleVolume: [
        chestVolume({
          benchmarkWindowDays: 28,
          effectiveSets: 31,
          directEffectiveSets: 31,
          indirectEffectiveSets: 0,
          targetMin: 40,
          targetMidpoint: 56,
          targetMax: 72,
          highReviewAbove: 80,
          highConfidenceEffectiveSets: 31,
        }),
      ],
      performanceObservations: performance([
        0.94,
        0.96,
        0.98,
        1,
        1.03,
        1.05,
        1.07,
      ]),
    });

    const chest = report.muscles[0];

    expect(chest?.snapshot.periodEffectiveSets).toBe(31);
    expect(chest?.snapshot.benchmarkEquivalentEffectiveSets).toBeCloseTo(28);
    expect(chest?.snapshot.volumeStatus).toBe('BELOW_TARGET');
    expect(chest?.correctivePlan.action).toBe('MONITOR');
  });

  it('does not let variable performance mechanically trigger a corrective volume change', () => {
    const report = buildCompletedTrainingReport({
      period: weeklyPeriod,
      muscleVolume: [chestVolume({ effectiveSets: 22 })],
      performanceObservations: performance([
        1,
        1.08,
        0.95,
        1.09,
        0.94,
        1.07,
        0.96,
        1.06,
      ]),
    });

    const chest = report.muscles[0];

    expect(chest?.performance.trend).toBe('VARIABLE');
    expect(chest?.correctivePlan.action).toBe('MONITOR');
    expect(chest?.correctivePlan.weeklyEffectiveSetAdjustment).toBeNull();
  });

  it('omits Neck from the user-facing report muscle list', () => {
    const report = buildCompletedTrainingReport({
      period: weeklyPeriod,
      muscleVolume: [
        chestVolume(),
        chestVolume({
          muscleGroup: 'NECK',
          targetMin: 6,
          targetMidpoint: 7.5,
          targetMax: 9,
          highReviewAbove: 10,
        }),
      ],
      performanceObservations: [],
    });

    expect(report.muscles.map((muscle) => muscle.snapshot.muscleGroup))
      .toEqual(['CHEST']);
  });

  it('computes comparable high-level period deltas and returns nulls when no previous period exists', () => {
    expect(buildTrainingReportPeriodDelta(weeklyPeriod, null)).toEqual({
      completedLiftingSessions: null,
      activeTrainingSeconds: null,
      exerciseCount: null,
      completedWorkingSets: null,
      volumeKgReps: null,
      prCount: null,
    });

    expect(
      buildTrainingReportPeriodDelta(weeklyPeriod, {
        ...weeklyPeriod,
        completedLiftingSessions: 3,
        activeTrainingSeconds: 12_000,
        exerciseCount: 10,
        completedWorkingSets: 47,
        volumeKgReps: 39_500,
        prCount: 1,
      }),
    ).toEqual({
      completedLiftingSessions: 1,
      activeTrainingSeconds: 2_400,
      exerciseCount: 1,
      completedWorkingSets: 5,
      volumeKgReps: 2_500,
      prCount: 1,
    });
  });

  it('counts calendar periods inclusively and rejects inverted periods', () => {
    expect(inclusivePeriodDayCount('2026-09-07', '2026-09-13')).toBe(7);
    expect(inclusivePeriodDayCount('2026-08-01', '2026-08-31')).toBe(31);
    expect(() =>
      inclusivePeriodDayCount('2026-09-13', '2026-09-07'),
    ).toThrow(/end must be on or after/i);
  });

  it('rejects a monthly report that is incorrectly paired with a 7-day benchmark', () => {
    expect(() =>
      buildCompletedTrainingReport({
        period: {
          ...weeklyPeriod,
          periodKind: 'MONTH',
          periodStart: '2026-08-01',
          periodEnd: '2026-08-31',
        },
        muscleVolume: [chestVolume()],
        performanceObservations: [],
      }),
    ).toThrow(/monthly reports require the 28-day benchmark/i);
  });
  it('rejects incomplete calendar periods before a report can be frozen', () => {
    expect(() =>
      buildCompletedTrainingReport({
        period: {
          ...weeklyPeriod,
          periodStart: '2026-09-08',
          periodEnd: '2026-09-14',
        },
        muscleVolume: [chestVolume()],
        performanceObservations: [],
      }),
    ).toThrow(/Monday through Sunday/i);

    expect(() =>
      buildCompletedTrainingReport({
        period: {
          ...weeklyPeriod,
          periodKind: 'MONTH',
          periodStart: '2026-08-01',
          periodEnd: '2026-08-30',
        },
        muscleVolume: [
          chestVolume({
            benchmarkWindowDays: 28,
            targetMin: 40,
            targetMidpoint: 56,
            targetMax: 72,
            highReviewAbove: 80,
          }),
        ],
        performanceObservations: [],
      }),
    ).toThrow(/final calendar day/i);
  });

  it('rejects mixed methodology versions inside one frozen report', () => {
    expect(() =>
      buildCompletedTrainingReport({
        period: weeklyPeriod,
        muscleVolume: [
          chestVolume(),
          chestVolume({
            muscleGroup: 'BACK',
            methodologyVersion: 'future-methodology',
          }),
        ],
        performanceObservations: [],
      }),
    ).toThrow(/cannot mix methodology versions/i);
  });

});
