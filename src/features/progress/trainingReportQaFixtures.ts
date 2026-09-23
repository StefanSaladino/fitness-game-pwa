import type { MuscleVolumeMuscleGroup, MuscleVolumeStatus } from './model';
import type {
  MusclePerformanceMonitor,
  MusclePerformanceTrend,
} from './performanceTrendEngine';
import {
  TRAINING_REPORT_MUSCLE_GROUPS,
  type CompletedTrainingReport,
  type TrainingReportMuscleResult,
  type TrainingReportPeriodKind,
  type TrainingReportPeriodSummary,
} from './trainingReportModel';
import type { TrainingReportService } from './trainingReportService';
import type {
  MuscleVolumeAssessment,
  VolumeRecommendationAction,
} from './volumeRecommendationEngine';

export type TrainingReportQaScenario =
  | 'mixed'
  | 'healthy'
  | 'monitor'
  | 'empty'
  | 'stress';

export const TRAINING_REPORT_QA_SCENARIOS: readonly TrainingReportQaScenario[] = [
  'mixed',
  'healthy',
  'monitor',
  'empty',
  'stress',
] as const;

const MUSCLE_NAMES: Record<MuscleVolumeMuscleGroup, string> = {
  CHEST: 'Chest',
  LATS: 'Lats',
  UPPER_BACK: 'Upper Back',
  TRAPS: 'Traps',
  SPINAL_ERECTORS: 'Spinal Erectors',
  ANTERIOR_DELTS: 'Front Delts',
  LATERAL_DELTS: 'Side Delts',
  POSTERIOR_DELTS: 'Rear Delts',
  BACK: 'Back',
  SHOULDERS: 'Shoulders',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  QUADS: 'Quads',
  HAMSTRINGS: 'Hamstrings',
  GLUTES: 'Glutes',
  CALVES: 'Calves',
  FOREARMS_GRIP: 'Forearms & Grip',
  CORE: 'Core',
  OBLIQUES: 'Obliques',
  NECK: 'Neck',
};

interface QaMuscleState {
  action: VolumeRecommendationAction;
  trend: MusclePerformanceTrend;
}

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = utcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function monthEnd(value: string): string {
  const date = utcDate(value);
  return isoDate(new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    0,
  )));
}

function shiftMonth(value: string, amount: number): string {
  const date = utcDate(value);
  return isoDate(new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + amount,
    1,
  )));
}

function periodSummary(
  kind: TrainingReportPeriodKind,
  start: string,
  previous = false,
): TrainingReportPeriodSummary {
  const multiplier = kind === 'MONTH' ? 4 : 1;
  const reduction = previous ? 1 : 0;

  return {
    periodKind: kind,
    periodStart: start,
    periodEnd: kind === 'MONTH' ? monthEnd(start) : addDays(start, 6),
    completedLiftingSessions: 4 * multiplier - reduction,
    activeTrainingSeconds: 15_300 * multiplier - reduction * 1_500,
    exerciseCount: 11 + multiplier - reduction,
    completedWorkingSets: 48 * multiplier - reduction * 7,
    volumeKgReps: 42_500 * multiplier - reduction * 4_200,
    prCount: 3 * multiplier - reduction,
  };
}

function previousStart(
  kind: TrainingReportPeriodKind,
  start: string,
): string {
  return kind === 'MONTH'
    ? shiftMonth(start, -1)
    : addDays(start, -7);
}

function monitorFor(trend: MusclePerformanceTrend): MusclePerformanceMonitor {
  if (trend === 'INSUFFICIENT_DATA') {
    return {
      trend,
      persistence: 'INSUFFICIENT',
      confidence: 'LOW',
      evidenceCount: 2,
      exerciseCount: 1,
      spanDays: 5,
      overallChange: null,
      recentChange: null,
      variability: null,
    };
  }

  return {
    trend,
    persistence: 'SUSTAINED',
    confidence: 'HIGH',
    evidenceCount: 9,
    exerciseCount: 3,
    spanDays: 40,
    overallChange:
      trend === 'IMPROVING' || trend === 'RECOVERING'
        ? 0.08
        : trend === 'DECLINING' || trend === 'REGRESSING'
          ? -0.07
          : 0.01,
    recentChange:
      trend === 'IMPROVING' || trend === 'RECOVERING'
        ? 0.04
        : trend === 'DECLINING' || trend === 'REGRESSING'
          ? -0.04
          : 0,
    variability: trend === 'VARIABLE' ? 0.16 : 0.02,
  };
}

function volumeStateFor(
  action: VolumeRecommendationAction,
): {
  status: MuscleVolumeStatus;
  effectiveSets: number;
  targetMin: number;
  targetMax: number;
  highReviewAbove: number;
} {
  switch (action) {
    case 'ADD_VOLUME_CAUTIOUSLY':
      return {
        status: 'BELOW_TARGET',
        effectiveSets: 8,
        targetMin: 10,
        targetMax: 18,
        highReviewAbove: 20,
      };
    case 'REDUCE_VOLUME_CAUTIOUSLY':
      return {
        status: 'ABOVE_TARGET',
        effectiveSets: 22,
        targetMin: 10,
        targetMax: 18,
        highReviewAbove: 20,
      };
    case 'NO_ACTION':
      return {
        status: 'NO_DATA',
        effectiveSets: 0,
        targetMin: 10,
        targetMax: 18,
        highReviewAbove: 20,
      };
    case 'MONITOR':
      return {
        status: 'BELOW_TARGET',
        effectiveSets: 8,
        targetMin: 10,
        targetMax: 18,
        highReviewAbove: 20,
      };
    case 'HOLD_AND_REVIEW':
    case 'MAINTAIN':
    default:
      return {
        status: 'ON_TARGET',
        effectiveSets: 14,
        targetMin: 10,
        targetMax: 18,
        highReviewAbove: 20,
      };
  }
}

function copyFor(
  action: VolumeRecommendationAction,
  muscleName: string,
  stress: boolean,
): {
  headline: string;
  rationale: string;
  adjustment: number | null;
} {
  const suffix = stress
    ? ` Keep ${muscleName.toLowerCase()} work technically consistent, use the familiar exercise options below, and reassess only after another comparable block rather than reacting to one isolated session.`
    : '';

  switch (action) {
    case 'ADD_VOLUME_CAUTIOUSLY':
      return {
        headline: 'Add a small amount of volume',
        rationale:
          `Volume is below target and the plateau is sustained. Add about 2 effective sets over the next 7 days as a first step, then monitor the next trend before adding more.${suffix}`,
        adjustment: 2,
      };
    case 'REDUCE_VOLUME_CAUTIOUSLY':
      return {
        headline: 'Reduce a small amount of volume and reassess',
        rationale:
          `Volume is above target while the negative performance pattern is sustained. Reduce about 2 effective sets over the next 7 days, then reassess before cutting more.${suffix}`,
        adjustment: -2,
      };
    case 'HOLD_AND_REVIEW':
      return {
        headline: 'Keep volume steady and review the decline',
        rationale:
          `Volume is already in the target range, so do not chase the benchmark with more sets. Hold the current amount and review progression and recovery while the negative trend continues.${suffix}`,
        adjustment: null,
      };
    case 'MAINTAIN':
      return {
        headline: 'Maintain the current volume range',
        rationale:
          `Volume and performance support keeping the current plan intact.${suffix}`,
        adjustment: 0,
      };
    case 'MONITOR':
      return {
        headline: 'Keep monitoring the trend',
        rationale:
          `The current signal is not strong enough to justify a volume change. Keep the plan stable and collect more comparable performance evidence.${suffix}`,
        adjustment: null,
      };
    case 'NO_ACTION':
    default:
      return {
        headline: 'More training data needed',
        rationale:
          'There is not enough comparable performance history to make a useful corrective call yet.',
        adjustment: null,
      };
  }
}

function preferredExercises(
  group: MuscleVolumeMuscleGroup,
  stress: boolean,
): string[] {
  const label = MUSCLE_NAMES[group];

  if (!stress) {
    return [
      `${label} primary movement`,
      `${label} secondary movement`,
    ];
  }

  return [
    `${label} familiar primary compound with controlled tempo`,
    `${label} long-range secondary movement using the usual equipment setup`,
    `${label} stable accessory variation from recent training history`,
  ];
}

function muscleResult(
  group: MuscleVolumeMuscleGroup,
  state: QaMuscleState,
  kind: TrainingReportPeriodKind,
  stress: boolean,
): TrainingReportMuscleResult {
  const performance = monitorFor(state.trend);
  const volume = volumeStateFor(state.action);
  const copy = copyFor(state.action, MUSCLE_NAMES[group], stress);
  const windowDays = kind === 'MONTH' ? 28 : 7;
  const monthFactor = kind === 'MONTH' ? 4 : 1;
  const periodSets = volume.effectiveSets * monthFactor;
  const benchmarkEquivalent = volume.effectiveSets;
  const deficit = Math.max(0, volume.targetMin - benchmarkEquivalent);
  const excessTarget = Math.max(0, benchmarkEquivalent - volume.targetMax);
  const excessHigh = Math.max(0, benchmarkEquivalent - volume.highReviewAbove);

  const assessment: MuscleVolumeAssessment = {
    muscleGroup: group,
    windowDays,
    status: volume.status,
    effectiveSets: benchmarkEquivalent,
    targetMin: volume.targetMin,
    targetMax: volume.targetMax,
    highReviewAbove: volume.highReviewAbove,
    deficitToTargetMin: deficit,
    excessAboveTargetMax: excessTarget,
    excessAboveHighReview: excessHigh,
    volumeEvidenceLimited: state.action === 'NO_ACTION',
  };

  return {
    snapshot: {
      muscleGroup: group,
      methodologyVersion: 'qa-fixture-v1',
      periodEffectiveSets: periodSets,
      periodDirectEffectiveSets: periodSets * 0.8,
      periodIndirectEffectiveSets: periodSets * 0.2,
      benchmarkWindowDays: windowDays,
      benchmarkEquivalentEffectiveSets: benchmarkEquivalent,
      benchmarkEquivalentDirectEffectiveSets: benchmarkEquivalent * 0.8,
      benchmarkEquivalentIndirectEffectiveSets: benchmarkEquivalent * 0.2,
      targetMin: volume.targetMin,
      targetMidpoint: (volume.targetMin + volume.targetMax) / 2,
      targetMax: volume.targetMax,
      highReviewAbove: volume.highReviewAbove,
      volumeStatus: volume.status,
      benchmarkEvidenceConfidence: 'MODERATE',
      highConfidenceProportion: state.action === 'NO_ACTION' ? 0 : 1,
      mediumConfidenceProportion: 0,
      lowOrProvisionalProportion: state.action === 'NO_ACTION' ? 1 : 0,
      provisionalEffectiveSets: 0,
      eligibleLogicalSets: Math.round(periodSets),
      eligibleStages: Math.round(periodSets),
      reviewFlaggedLogicalSets: 0,
    },
    performance,
    sources: [],
    recommendation: {
      muscleGroup: group,
      windowDays,
      action: state.action,
      volumeAssessment: assessment,
      performance,
      suggestedEffectiveSetChange: copy.adjustment,
      headline: copy.headline,
      rationale: copy.rationale,
    },
    correctivePlan: {
      action: state.action,
      weeklyEffectiveSetAdjustment: copy.adjustment,
      headline: copy.headline,
      rationale: copy.rationale,
      preferredExercises: preferredExercises(group, stress),
    },
  };
}

function statesForScenario(
  scenario: TrainingReportQaScenario,
): QaMuscleState[] {
  if (scenario === 'healthy') {
    return TRAINING_REPORT_MUSCLE_GROUPS.map((_, index) => ({
      action: 'MAINTAIN',
      trend: index % 3 === 0 ? 'RECOVERING' : 'IMPROVING',
    }));
  }

  if (scenario === 'monitor') {
    const trends: MusclePerformanceTrend[] = [
      'IMPROVING',
      'VARIABLE',
      'STABLE',
      'RECOVERING',
    ];

    return TRAINING_REPORT_MUSCLE_GROUPS.map((_, index) => ({
      action: 'MONITOR',
      trend: trends[index % trends.length]!,
    }));
  }

  if (scenario === 'empty') {
    return TRAINING_REPORT_MUSCLE_GROUPS.map(() => ({
      action: 'NO_ACTION',
      trend: 'INSUFFICIENT_DATA',
    }));
  }

  if (scenario === 'stress') {
    const actions: VolumeRecommendationAction[] = [
      'ADD_VOLUME_CAUTIOUSLY',
      'REDUCE_VOLUME_CAUTIOUSLY',
      'HOLD_AND_REVIEW',
    ];
    const trends: MusclePerformanceTrend[] = [
      'PLATEAU',
      'REGRESSING',
      'DECLINING',
    ];

    return TRAINING_REPORT_MUSCLE_GROUPS.map((_, index) => ({
      action: actions[index % actions.length]!,
      trend: trends[index % trends.length]!,
    }));
  }

  const mixed: QaMuscleState[] = [
    { action: 'ADD_VOLUME_CAUTIOUSLY', trend: 'PLATEAU' },
    { action: 'MAINTAIN', trend: 'IMPROVING' },
    { action: 'MONITOR', trend: 'VARIABLE' },
    { action: 'HOLD_AND_REVIEW', trend: 'DECLINING' },
    { action: 'REDUCE_VOLUME_CAUTIOUSLY', trend: 'REGRESSING' },
    { action: 'MAINTAIN', trend: 'RECOVERING' },
    { action: 'MONITOR', trend: 'IMPROVING' },
    { action: 'NO_ACTION', trend: 'INSUFFICIENT_DATA' },
    { action: 'ADD_VOLUME_CAUTIOUSLY', trend: 'PLATEAU' },
    { action: 'REDUCE_VOLUME_CAUTIOUSLY', trend: 'PLATEAU' },
    { action: 'MAINTAIN', trend: 'STABLE' },
    { action: 'MONITOR', trend: 'STABLE' },
  ];

  return TRAINING_REPORT_MUSCLE_GROUPS.map(
    (_, index) => mixed[index % mixed.length]!,
  );
}

function statusCounts(
  muscles: TrainingReportMuscleResult[],
): CompletedTrainingReport['statusCounts'] {
  return muscles.reduce(
    (counts, muscle) => {
      const status = muscle.snapshot.volumeStatus;

      if (status === 'ON_TARGET') counts.onTarget += 1;
      else if (status === 'LOW' || status === 'BELOW_TARGET') {
        counts.belowTarget += 1;
      } else if (status === 'ABOVE_TARGET' || status === 'HIGH_REVIEW') {
        counts.aboveTarget += 1;
      } else {
        counts.noData += 1;
      }

      return counts;
    },
    { onTarget: 0, belowTarget: 0, aboveTarget: 0, noData: 0 },
  );
}

function actionCounts(
  muscles: TrainingReportMuscleResult[],
): CompletedTrainingReport['actionCounts'] {
  return muscles.reduce(
    (counts, muscle) => {
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
      return counts;
    },
    {
      add: 0,
      reduce: 0,
      maintain: 0,
      holdReview: 0,
      monitor: 0,
      noAction: 0,
    },
  );
}

export function buildTrainingReportQaFixture(
  scenario: TrainingReportQaScenario,
  kind: TrainingReportPeriodKind,
  start: string,
): CompletedTrainingReport {
  const states = statesForScenario(scenario);
  const stress = scenario === 'stress';
  const muscles = TRAINING_REPORT_MUSCLE_GROUPS.map((group, index) =>
    muscleResult(group, states[index]!, kind, stress));

  const period = periodSummary(kind, start);
  const prior = periodSummary(kind, previousStart(kind, start), true);

  return {
    reportVersion: 'training-report-v1',
    methodologyVersion: 'qa-fixture-v1',
    period,
    previousPeriod: prior,
    delta: {
      completedLiftingSessions:
        period.completedLiftingSessions - prior.completedLiftingSessions,
      activeTrainingSeconds:
        period.activeTrainingSeconds - prior.activeTrainingSeconds,
      exerciseCount: period.exerciseCount - prior.exerciseCount,
      completedWorkingSets:
        period.completedWorkingSets - prior.completedWorkingSets,
      volumeKgReps: period.volumeKgReps - prior.volumeKgReps,
      prCount: period.prCount - prior.prCount,
    },
    muscles,
    statusCounts: statusCounts(muscles),
    actionCounts: actionCounts(muscles),
  };
}

export function createTrainingReportQaService(
  scenario: TrainingReportQaScenario,
): TrainingReportService {
  return {
    async loadReport(kind, start) {
      return buildTrainingReportQaFixture(scenario, kind, start);
    },
  };
}

export function trainingReportQaScenarioFromLocation():
  | TrainingReportQaScenario
  | null {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return null;

  const requested = new URLSearchParams(window.location.search).get('qa');

  return TRAINING_REPORT_QA_SCENARIOS.includes(
    requested as TrainingReportQaScenario,
  )
    ? requested as TrainingReportQaScenario
    : null;
}
