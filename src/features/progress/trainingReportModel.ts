import {
  MUSCLE_VOLUME_MUSCLE_GROUPS,
  type MuscleVolumeBenchmarkEvidenceConfidence,
  type MuscleVolumeMuscleGroup,
  type MuscleVolumeStatus,
  type MuscleVolumeSummary,
  type MuscleVolumeWindowDays,
} from './model';
import {
  buildMusclePerformanceMonitor,
  type MusclePerformanceSourceObservation,
  type MusclePerformanceSourceSummary,
} from './musclePerformanceMonitor';
import type { MusclePerformanceMonitor } from './performanceTrendEngine';
import {
  buildMuscleVolumeRecommendation,
  type MuscleVolumeRecommendation,
  type VolumeRecommendationAction,
} from './volumeRecommendationEngine';

export const TRAINING_REPORT_VERSION = 'training-report-v1' as const;
export type TrainingReportVersion = typeof TRAINING_REPORT_VERSION;
export type TrainingReportPeriodKind = 'WEEK' | 'MONTH';

export interface TrainingReportPeriodSummary {
  periodKind: TrainingReportPeriodKind;
  periodStart: string;
  periodEnd: string;
  completedLiftingSessions: number;
  activeTrainingSeconds: number;
  exerciseCount: number;
  completedWorkingSets: number;
  volumeKgReps: number;
  prCount: number;
}

export interface TrainingReportPeriodDelta {
  completedLiftingSessions: number | null;
  activeTrainingSeconds: number | null;
  exerciseCount: number | null;
  completedWorkingSets: number | null;
  volumeKgReps: number | null;
  prCount: number | null;
}

export interface TrainingReportMusclePeriodInput {
  muscleGroup: MuscleVolumeMuscleGroup;
  methodologyVersion: string;
  effectiveSets: number;
  directEffectiveSets: number;
  indirectEffectiveSets: number;
  eligibleLogicalSets: number;
  eligibleStages: number;
  reviewFlaggedLogicalSets: number;
  benchmarkWindowDays: MuscleVolumeWindowDays;
  targetMin: number;
  targetMidpoint: number;
  targetMax: number;
  highReviewAbove: number;
  lowStatusFractionOfTargetMin: number;
  benchmarkEvidenceConfidence: MuscleVolumeBenchmarkEvidenceConfidence;
  highConfidenceEffectiveSets: number;
  mediumConfidenceEffectiveSets: number;
  lowOrProvisionalEffectiveSets: number;
  provisionalEffectiveSets: number;
  highConfidenceProportion: number;
  mediumConfidenceProportion: number;
  lowOrProvisionalProportion: number;
}

export interface TrainingReportMuscleSnapshot {
  muscleGroup: MuscleVolumeMuscleGroup;
  methodologyVersion: string;
  periodEffectiveSets: number;
  periodDirectEffectiveSets: number;
  periodIndirectEffectiveSets: number;
  benchmarkWindowDays: MuscleVolumeWindowDays;
  benchmarkEquivalentEffectiveSets: number;
  benchmarkEquivalentDirectEffectiveSets: number;
  benchmarkEquivalentIndirectEffectiveSets: number;
  targetMin: number;
  targetMidpoint: number;
  targetMax: number;
  highReviewAbove: number;
  volumeStatus: MuscleVolumeStatus;
  benchmarkEvidenceConfidence: MuscleVolumeBenchmarkEvidenceConfidence;
  highConfidenceProportion: number;
  mediumConfidenceProportion: number;
  lowOrProvisionalProportion: number;
  provisionalEffectiveSets: number;
  eligibleLogicalSets: number;
  eligibleStages: number;
  reviewFlaggedLogicalSets: number;
}

export interface TrainingReportCorrectivePlan {
  action: VolumeRecommendationAction;
  weeklyEffectiveSetAdjustment: number | null;
  headline: string;
  rationale: string;
  preferredExercises: string[];
}

export interface TrainingReportMuscleResult {
  snapshot: TrainingReportMuscleSnapshot;
  performance: MusclePerformanceMonitor;
  sources: MusclePerformanceSourceSummary[];
  recommendation: MuscleVolumeRecommendation;
  correctivePlan: TrainingReportCorrectivePlan;
}

export interface CompletedTrainingReport {
  reportVersion: TrainingReportVersion;
  methodologyVersion: string | null;
  period: TrainingReportPeriodSummary;
  previousPeriod: TrainingReportPeriodSummary | null;
  delta: TrainingReportPeriodDelta;
  muscles: TrainingReportMuscleResult[];
  statusCounts: {
    onTarget: number;
    belowTarget: number;
    aboveTarget: number;
    noData: number;
  };
  actionCounts: {
    add: number;
    reduce: number;
    maintain: number;
    holdReview: number;
    monitor: number;
    noAction: number;
  };
}

export interface BuildCompletedTrainingReportInput {
  period: TrainingReportPeriodSummary;
  previousPeriod?: TrainingReportPeriodSummary | null;
  muscleVolume: TrainingReportMusclePeriodInput[];
  performanceObservations: MusclePerformanceSourceObservation[];
}

export const TRAINING_REPORT_MUSCLE_GROUPS = MUSCLE_VOLUME_MUSCLE_GROUPS.filter(
  (muscleGroup): muscleGroup is Exclude<MuscleVolumeMuscleGroup, 'NECK'> =>
    muscleGroup !== 'NECK',
);

function parseIsoDate(value: string): number {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid report date: ${value}`);
  }
  return parsed;
}

export function inclusivePeriodDayCount(
  periodStart: string,
  periodEnd: string,
): number {
  const start = parseIsoDate(periodStart);
  const end = parseIsoDate(periodEnd);

  if (end < start) {
    throw new Error('Report period end must be on or after period start.');
  }

  return Math.round((end - start) / 86_400_000) + 1;
}


function assertCompletedPeriod(period: TrainingReportPeriodSummary): void {
  const dayCount = inclusivePeriodDayCount(
    period.periodStart,
    period.periodEnd,
  );

  if (period.periodKind === 'WEEK') {
    if (dayCount !== 7) {
      throw new Error('Weekly reports require exactly 7 completed days.');
    }

    const start = new Date(`${period.periodStart}T00:00:00Z`);
    const end = new Date(`${period.periodEnd}T00:00:00Z`);

    if (start.getUTCDay() !== 1 || end.getUTCDay() !== 0) {
      throw new Error('Weekly reports must run Monday through Sunday.');
    }
    return;
  }

  const start = new Date(`${period.periodStart}T00:00:00Z`);
  const end = new Date(`${period.periodEnd}T00:00:00Z`);

  if (start.getUTCDate() !== 1) {
    throw new Error('Monthly reports must start on the first calendar day.');
  }

  if (
    start.getUTCFullYear() !== end.getUTCFullYear()
    || start.getUTCMonth() !== end.getUTCMonth()
  ) {
    throw new Error('Monthly reports must stay within one calendar month.');
  }

  const lastDay = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth() + 1,
    0,
  )).getUTCDate();

  if (end.getUTCDate() !== lastDay) {
    throw new Error('Monthly reports must end on the final calendar day.');
  }
}

function deltaValue(
  current: number,
  previous: number | undefined,
): number | null {
  return previous === undefined ? null : current - previous;
}

export function buildTrainingReportPeriodDelta(
  current: TrainingReportPeriodSummary,
  previous: TrainingReportPeriodSummary | null,
): TrainingReportPeriodDelta {
  if (!previous) {
    return {
      completedLiftingSessions: null,
      activeTrainingSeconds: null,
      exerciseCount: null,
      completedWorkingSets: null,
      volumeKgReps: null,
      prCount: null,
    };
  }

  return {
    completedLiftingSessions: deltaValue(
      current.completedLiftingSessions,
      previous.completedLiftingSessions,
    ),
    activeTrainingSeconds: deltaValue(
      current.activeTrainingSeconds,
      previous.activeTrainingSeconds,
    ),
    exerciseCount: deltaValue(
      current.exerciseCount,
      previous.exerciseCount,
    ),
    completedWorkingSets: deltaValue(
      current.completedWorkingSets,
      previous.completedWorkingSets,
    ),
    volumeKgReps: deltaValue(
      current.volumeKgReps,
      previous.volumeKgReps,
    ),
    prCount: deltaValue(current.prCount, previous.prCount),
  };
}

function statusFor(
  eligibleStages: number,
  effectiveSets: number,
  targetMin: number,
  targetMax: number,
  highReviewAbove: number,
  lowStatusFractionOfTargetMin: number,
): MuscleVolumeStatus {
  if (eligibleStages <= 0) return 'NO_DATA';
  if (effectiveSets < targetMin * lowStatusFractionOfTargetMin) return 'LOW';
  if (effectiveSets < targetMin) return 'BELOW_TARGET';
  if (effectiveSets <= targetMax) return 'ON_TARGET';
  if (effectiveSets > highReviewAbove) return 'HIGH_REVIEW';
  return 'ABOVE_TARGET';
}

function benchmarkNormalizationFactor(
  period: TrainingReportPeriodSummary,
  benchmarkWindowDays: MuscleVolumeWindowDays,
): number {
  const days = inclusivePeriodDayCount(period.periodStart, period.periodEnd);

  if (period.periodKind === 'WEEK') {
    if (days !== 7 || benchmarkWindowDays !== 7) {
      throw new Error(
        'Weekly reports require an exact 7-day period and a 7-day benchmark.',
      );
    }
    return 1;
  }

  if (benchmarkWindowDays !== 28) {
    throw new Error('Monthly reports require the 28-day benchmark.');
  }

  // Calendar months vary from 28-31 days. Keep the frozen raw month total,
  // but compare its pace against the versioned 28-day benchmark.
  return 28 / days;
}

function asBenchmarkVolumeSummary(
  period: TrainingReportPeriodSummary,
  input: TrainingReportMusclePeriodInput,
): MuscleVolumeSummary {
  const factor = benchmarkNormalizationFactor(period, input.benchmarkWindowDays);
  const effectiveSets = input.effectiveSets * factor;
  const directEffectiveSets = input.directEffectiveSets * factor;
  const indirectEffectiveSets = input.indirectEffectiveSets * factor;
  const highConfidenceEffectiveSets = input.highConfidenceEffectiveSets * factor;
  const mediumConfidenceEffectiveSets = input.mediumConfidenceEffectiveSets * factor;
  const lowOrProvisionalEffectiveSets =
    input.lowOrProvisionalEffectiveSets * factor;
  const provisionalEffectiveSets = input.provisionalEffectiveSets * factor;

  return {
    muscleGroup: input.muscleGroup,
    windowDays: input.benchmarkWindowDays,
    windowStart: period.periodStart,
    windowEnd: period.periodEnd,
    methodologyVersion: input.methodologyVersion,
    effectiveSets,
    directEffectiveSets,
    indirectEffectiveSets,
    eligibleLogicalSets: input.eligibleLogicalSets,
    eligibleStages: input.eligibleStages,
    reviewFlaggedLogicalSets: input.reviewFlaggedLogicalSets,
    targetMin: input.targetMin,
    targetMidpoint: input.targetMidpoint,
    targetMax: input.targetMax,
    highReviewAbove: input.highReviewAbove,
    volumeStatus: statusFor(
      input.eligibleStages,
      effectiveSets,
      input.targetMin,
      input.targetMax,
      input.highReviewAbove,
      input.lowStatusFractionOfTargetMin,
    ),
    benchmarkEvidenceConfidence: input.benchmarkEvidenceConfidence,
    highConfidenceEffectiveSets,
    mediumConfidenceEffectiveSets,
    lowOrProvisionalEffectiveSets,
    provisionalEffectiveSets,
    highConfidenceProportion: input.highConfidenceProportion,
    mediumConfidenceProportion: input.mediumConfidenceProportion,
    lowOrProvisionalProportion: input.lowOrProvisionalProportion,
  };
}

function correctivePlanFor(
  recommendation: MuscleVolumeRecommendation,
  sources: MusclePerformanceSourceSummary[],
): TrainingReportCorrectivePlan {
  const preferredExercises = sources
    .filter((source) => source.observationCount >= 2)
    .slice(0, 3)
    .map((source) => source.canonicalName);

  return {
    action: recommendation.action,
    weeklyEffectiveSetAdjustment:
      recommendation.suggestedEffectiveSetChange,
    headline: recommendation.headline,
    rationale: recommendation.rationale,
    preferredExercises,
  };
}

function buildMuscleResult(
  period: TrainingReportPeriodSummary,
  input: TrainingReportMusclePeriodInput,
  performanceObservations: MusclePerformanceSourceObservation[],
): TrainingReportMuscleResult {
  const benchmarkVolume = asBenchmarkVolumeSummary(period, input);
  const performanceResult = buildMusclePerformanceMonitor(
    input.muscleGroup,
    performanceObservations,
  );
  const recommendation = buildMuscleVolumeRecommendation(
    benchmarkVolume,
    performanceResult.monitor,
  );

  return {
    snapshot: {
      muscleGroup: input.muscleGroup,
      methodologyVersion: input.methodologyVersion,
      periodEffectiveSets: input.effectiveSets,
      periodDirectEffectiveSets: input.directEffectiveSets,
      periodIndirectEffectiveSets: input.indirectEffectiveSets,
      benchmarkWindowDays: input.benchmarkWindowDays,
      benchmarkEquivalentEffectiveSets: benchmarkVolume.effectiveSets,
      benchmarkEquivalentDirectEffectiveSets:
        benchmarkVolume.directEffectiveSets,
      benchmarkEquivalentIndirectEffectiveSets:
        benchmarkVolume.indirectEffectiveSets,
      targetMin: input.targetMin,
      targetMidpoint: input.targetMidpoint,
      targetMax: input.targetMax,
      highReviewAbove: input.highReviewAbove,
      volumeStatus: benchmarkVolume.volumeStatus,
      benchmarkEvidenceConfidence: input.benchmarkEvidenceConfidence,
      highConfidenceProportion: input.highConfidenceProportion,
      mediumConfidenceProportion: input.mediumConfidenceProportion,
      lowOrProvisionalProportion: input.lowOrProvisionalProportion,
      provisionalEffectiveSets: input.provisionalEffectiveSets,
      eligibleLogicalSets: input.eligibleLogicalSets,
      eligibleStages: input.eligibleStages,
      reviewFlaggedLogicalSets: input.reviewFlaggedLogicalSets,
    },
    performance: performanceResult.monitor,
    sources: performanceResult.sources,
    recommendation,
    correctivePlan: correctivePlanFor(
      recommendation,
      performanceResult.sources,
    ),
  };
}

function statusCounts(
  muscles: TrainingReportMuscleResult[],
): CompletedTrainingReport['statusCounts'] {
  const counts = {
    onTarget: 0,
    belowTarget: 0,
    aboveTarget: 0,
    noData: 0,
  };

  for (const muscle of muscles) {
    const status = muscle.snapshot.volumeStatus;
    if (status === 'ON_TARGET') counts.onTarget += 1;
    else if (status === 'LOW' || status === 'BELOW_TARGET') {
      counts.belowTarget += 1;
    } else if (status === 'ABOVE_TARGET' || status === 'HIGH_REVIEW') {
      counts.aboveTarget += 1;
    } else {
      counts.noData += 1;
    }
  }

  return counts;
}

function actionCounts(
  muscles: TrainingReportMuscleResult[],
): CompletedTrainingReport['actionCounts'] {
  const counts = {
    add: 0,
    reduce: 0,
    maintain: 0,
    holdReview: 0,
    monitor: 0,
    noAction: 0,
  };

  for (const muscle of muscles) {
    switch (muscle.correctivePlan.action) {
      case 'ADD_VOLUME_CAUTIOUSLY':
        counts.add += 1;
        break;
      case 'REDUCE_VOLUME_CAUTIOUSLY':
        counts.reduce += 1;
        break;
      case 'MAINTAIN':
        counts.maintain += 1;
        break;
      case 'HOLD_AND_REVIEW':
        counts.holdReview += 1;
        break;
      case 'MONITOR':
        counts.monitor += 1;
        break;
      case 'NO_ACTION':
        counts.noAction += 1;
        break;
    }
  }

  return counts;
}

export function buildCompletedTrainingReport(
  input: BuildCompletedTrainingReportInput,
): CompletedTrainingReport {
  assertCompletedPeriod(input.period);

  const methodologyVersions = [
    ...new Set(input.muscleVolume.map((muscle) => muscle.methodologyVersion)),
  ].sort();

  if (methodologyVersions.length > 1) {
    throw new Error(
      'A frozen training report cannot mix methodology versions.',
    );
  }

  const muscleByGroup = new Map(
    input.muscleVolume.map((muscle) => [muscle.muscleGroup, muscle] as const),
  );

  const muscles = TRAINING_REPORT_MUSCLE_GROUPS
    .map((muscleGroup) => muscleByGroup.get(muscleGroup))
    .filter(
      (muscle): muscle is TrainingReportMusclePeriodInput =>
        muscle !== undefined,
    )
    .map((muscle) =>
      buildMuscleResult(
        input.period,
        muscle,
        input.performanceObservations,
      ),
    );

  return {
    reportVersion: TRAINING_REPORT_VERSION,
    methodologyVersion: methodologyVersions[0] ?? null,
    period: input.period,
    previousPeriod: input.previousPeriod ?? null,
    delta: buildTrainingReportPeriodDelta(
      input.period,
      input.previousPeriod ?? null,
    ),
    muscles,
    statusCounts: statusCounts(muscles),
    actionCounts: actionCounts(muscles),
  };
}
