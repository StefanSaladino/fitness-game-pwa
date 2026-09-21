import { describe, expect, it } from 'vitest';
import type { CompletedTrainingReport } from './trainingReportModel';
import {
  buildMonthlyTrainingReportPdfContent,
  generateMonthlyTrainingReportPdf,
  monthlyTrainingReportPdfFileName,
} from './trainingReportPdf';

const performance = {
  persistence: 'SUSTAINED' as const,
  confidence: 'HIGH' as const,
  evidenceCount: 8,
  exerciseCount: 2,
  spanDays: 35,
  overallChange: 0,
  recentChange: 0,
  variability: 0.02,
};

const chestAssessment = {
  muscleGroup: 'CHEST' as const,
  windowDays: 28 as const,
  status: 'BELOW_TARGET' as const,
  effectiveSets: 28,
  targetMin: 40,
  targetMax: 72,
  highReviewAbove: 80,
  deficitToTargetMin: 12,
  excessAboveTargetMax: 0,
  excessAboveHighReview: 0,
  volumeEvidenceLimited: false,
};

const report: CompletedTrainingReport = {
  reportVersion: 'training-report-v1',
  methodologyVersion: 'muscle-volume-v1',
  period: {
    periodKind: 'MONTH',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
    completedLiftingSessions: 10,
    activeTrainingSeconds: 36000,
    exerciseCount: 18,
    completedWorkingSets: 140,
    volumeKgReps: 72000,
    prCount: 4,
  },
  previousPeriod: null,
  delta: {
    completedLiftingSessions: null,
    activeTrainingSeconds: null,
    exerciseCount: null,
    completedWorkingSets: null,
    volumeKgReps: null,
    prCount: null,
  },
  statusCounts: {
    onTarget: 1,
    belowTarget: 1,
    aboveTarget: 0,
    noData: 0,
  },
  actionCounts: {
    add: 1,
    reduce: 0,
    maintain: 1,
    holdReview: 0,
    monitor: 0,
    noAction: 0,
  },
  muscles: [
    {
      snapshot: {
        muscleGroup: 'CHEST',
        methodologyVersion: 'muscle-volume-v1',
        periodEffectiveSets: 31,
        periodDirectEffectiveSets: 28,
        periodIndirectEffectiveSets: 3,
        benchmarkWindowDays: 28,
        benchmarkEquivalentEffectiveSets: 28,
        benchmarkEquivalentDirectEffectiveSets: 25.3,
        benchmarkEquivalentIndirectEffectiveSets: 2.7,
        targetMin: 40,
        targetMidpoint: 56,
        targetMax: 72,
        highReviewAbove: 80,
        volumeStatus: 'BELOW_TARGET',
        benchmarkEvidenceConfidence: 'MODERATE',
        highConfidenceProportion: 1,
        mediumConfidenceProportion: 0,
        lowOrProvisionalProportion: 0,
        provisionalEffectiveSets: 0,
        eligibleLogicalSets: 31,
        eligibleStages: 31,
        reviewFlaggedLogicalSets: 0,
      },
      performance: { ...performance, trend: 'PLATEAU' },
      sources: [],
      recommendation: {
        muscleGroup: 'CHEST',
        windowDays: 28,
        action: 'ADD_VOLUME_CAUTIOUSLY',
        volumeAssessment: chestAssessment,
        performance: { ...performance, trend: 'PLATEAU' },
        suggestedEffectiveSetChange: 2,
        headline: 'Add a small amount of volume',
        rationale:
          'Volume is below target and the plateau is sustained. Add about 2 effective sets over the next 7 days as a first step, then monitor the next trend before adding more.',
      },
      correctivePlan: {
        action: 'ADD_VOLUME_CAUTIOUSLY',
        weeklyEffectiveSetAdjustment: 2,
        headline: 'Add a small amount of volume',
        rationale:
          'Volume is below target and the plateau is sustained. Add about 2 effective sets over the next 7 days as a first step, then monitor the next trend before adding more.',
        preferredExercises: ['Barbell Bench Press', 'Cable Chest Fly'],
      },
    },
    {
      snapshot: {
        muscleGroup: 'BACK',
        methodologyVersion: 'muscle-volume-v1',
        periodEffectiveSets: 60,
        periodDirectEffectiveSets: 50,
        periodIndirectEffectiveSets: 10,
        benchmarkWindowDays: 28,
        benchmarkEquivalentEffectiveSets: 54.2,
        benchmarkEquivalentDirectEffectiveSets: 45.2,
        benchmarkEquivalentIndirectEffectiveSets: 9,
        targetMin: 48,
        targetMidpoint: 64,
        targetMax: 80,
        highReviewAbove: 88,
        volumeStatus: 'ON_TARGET',
        benchmarkEvidenceConfidence: 'MODERATE',
        highConfidenceProportion: 1,
        mediumConfidenceProportion: 0,
        lowOrProvisionalProportion: 0,
        provisionalEffectiveSets: 0,
        eligibleLogicalSets: 60,
        eligibleStages: 60,
        reviewFlaggedLogicalSets: 0,
      },
      performance: { ...performance, trend: 'IMPROVING' },
      sources: [],
      recommendation: {
        muscleGroup: 'BACK',
        windowDays: 28,
        action: 'MAINTAIN',
        volumeAssessment: {
          ...chestAssessment,
          muscleGroup: 'BACK',
          status: 'ON_TARGET',
          effectiveSets: 54.2,
          targetMin: 48,
          targetMax: 80,
          highReviewAbove: 88,
          deficitToTargetMin: 0,
        },
        performance: { ...performance, trend: 'IMPROVING' },
        suggestedEffectiveSetChange: 0,
        headline: 'Maintain the current volume range',
        rationale:
          'Effective volume is inside the target range. No corrective volume change is currently indicated.',
      },
      correctivePlan: {
        action: 'MAINTAIN',
        weeklyEffectiveSetAdjustment: 0,
        headline: 'Maintain the current volume range',
        rationale:
          'Effective volume is inside the target range. No corrective volume change is currently indicated.',
        preferredExercises: ['Barbell Row'],
      },
    },
  ],
};

describe('monthly training report PDF', () => {
  it('builds a decision-focused monthly report payload', () => {
    const content = buildMonthlyTrainingReportPdfContent(report);

    expect(content.actionable.map((muscle) => muscle.snapshot.muscleGroup))
      .toEqual(['CHEST']);
    expect(content.maintain.map((muscle) => muscle.snapshot.muscleGroup))
      .toEqual(['BACK']);
    expect(content.positiveDirectionCount).toBe(1);
    expect(content.attentionCount).toBe(1);
  });

  it('uses a deterministic month-based file name', () => {
    expect(monthlyTrainingReportPdfFileName(report))
      .toBe('top-set-training-review-2026-08.pdf');
  });

  it('generates a real PDF binary', async () => {
    const bytes = await generateMonthlyTrainingReportPdf(report, 'Stefan');
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });

  it('rejects weekly payloads', () => {
    const weekly = {
      ...report,
      period: {
        ...report.period,
        periodKind: 'WEEK' as const,
        periodStart: '2026-09-07',
        periodEnd: '2026-09-13',
      },
    };

    expect(() => buildMonthlyTrainingReportPdfContent(weekly))
      .toThrow(/requires a monthly training report/i);
  });
});
