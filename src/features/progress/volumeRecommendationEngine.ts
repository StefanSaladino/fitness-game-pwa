import type {
  MuscleVolumeMuscleGroup,
  MuscleVolumeStatus,
  MuscleVolumeSummary,
  MuscleVolumeWindowDays,
} from './model';
import {
  trendSupportsCorrectiveAction,
  type MusclePerformanceMonitor,
} from './performanceTrendEngine';

export interface MuscleVolumeAssessment {
  muscleGroup: MuscleVolumeMuscleGroup;
  windowDays: MuscleVolumeWindowDays;
  status: MuscleVolumeStatus;
  effectiveSets: number;
  targetMin: number;
  targetMax: number;
  highReviewAbove: number;
  deficitToTargetMin: number;
  excessAboveTargetMax: number;
  excessAboveHighReview: number;
  volumeEvidenceLimited: boolean;
}

export type VolumeRecommendationAction =
  | 'NO_ACTION'
  | 'MONITOR'
  | 'MAINTAIN'
  | 'ADD_VOLUME_CAUTIOUSLY'
  | 'HOLD_AND_REVIEW'
  | 'REDUCE_VOLUME_CAUTIOUSLY';

export interface MuscleVolumeRecommendation {
  muscleGroup: MuscleVolumeMuscleGroup;
  windowDays: MuscleVolumeWindowDays;
  action: VolumeRecommendationAction;
  volumeAssessment: MuscleVolumeAssessment;
  performance: MusclePerformanceMonitor;
  /**
   * Small corrective adjustment for the next 7 days.
   * This is not the full deficit/excess of the selected 7- or 28-day window.
   */
  suggestedEffectiveSetChange: number | null;
  headline: string;
  rationale: string;
}

function roundUpHalf(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value * 2) / 2;
}

export function assessMuscleVolume(
  volume: MuscleVolumeSummary,
): MuscleVolumeAssessment {
  return {
    muscleGroup: volume.muscleGroup,
    windowDays: volume.windowDays,
    status: volume.volumeStatus,
    effectiveSets: volume.effectiveSets,
    targetMin: volume.targetMin,
    targetMax: volume.targetMax,
    highReviewAbove: volume.highReviewAbove,
    deficitToTargetMin: roundUpHalf(
      Math.max(0, volume.targetMin - volume.effectiveSets),
    ),
    excessAboveTargetMax: roundUpHalf(
      Math.max(0, volume.effectiveSets - volume.targetMax),
    ),
    excessAboveHighReview: roundUpHalf(
      Math.max(0, volume.effectiveSets - volume.highReviewAbove),
    ),
    volumeEvidenceLimited:
      volume.effectiveSets <= 0 ||
      volume.lowOrProvisionalProportion >= 0.5,
  };
}

function monitor(
  assessment: MuscleVolumeAssessment,
  performance: MusclePerformanceMonitor,
  headline: string,
  rationale: string,
): MuscleVolumeRecommendation {
  return {
    muscleGroup: assessment.muscleGroup,
    windowDays: assessment.windowDays,
    action: 'MONITOR',
    volumeAssessment: assessment,
    performance,
    suggestedEffectiveSetChange: null,
    headline,
    rationale,
  };
}

export function recommendMuscleVolumeAction(
  assessment: MuscleVolumeAssessment,
  performance: MusclePerformanceMonitor,
): MuscleVolumeRecommendation {
  const base = {
    muscleGroup: assessment.muscleGroup,
    windowDays: assessment.windowDays,
    volumeAssessment: assessment,
    performance,
  };

  if (assessment.status === 'NO_DATA') {
    return {
      ...base,
      action: 'NO_ACTION',
      suggestedEffectiveSetChange: null,
      headline: 'More training data needed',
      rationale:
        'There is not enough eligible effective-set data to assess a corrective volume change.',
    };
  }

  if (assessment.volumeEvidenceLimited) {
    return monitor(
      assessment,
      performance,
      'Monitor before changing volume',
      'The volume estimate relies heavily on low-confidence or provisional set evidence, so a corrective prescription would be premature.',
    );
  }

  if (assessment.status === 'ON_TARGET') {
    if (
      trendSupportsCorrectiveAction(performance) &&
      (performance.trend === 'DECLINING' || performance.trend === 'REGRESSING')
    ) {
      return {
        ...base,
        action: 'HOLD_AND_REVIEW',
        suggestedEffectiveSetChange: null,
        headline: 'Keep volume steady and review the decline',
        rationale:
          'Volume is already inside the target range. Review the sustained negative performance trend before changing set volume.',
      };
    }

    return {
      ...base,
      action: 'MAINTAIN',
      suggestedEffectiveSetChange: 0,
      headline: 'Maintain the current volume range',
      rationale:
        performance.trend === 'PLATEAU'
          ? 'Volume is on target. A sustained plateau should trigger progression and recovery review before changing volume.'
          : performance.trend === 'VARIABLE'
            ? 'Volume is on target while performance is variable. Keep the current range and continue monitoring until the signal becomes clearer.'
            : 'Effective volume is inside the target range. No corrective volume change is currently indicated.',
    };
  }

  if (performance.trend === 'INSUFFICIENT_DATA') {
    return monitor(
      assessment,
      performance,
      'More performance data is needed',
      'Volume is outside the target range, but there is not enough comparable performance history to justify a correction.',
    );
  }

  if (
    performance.persistence !== 'SUSTAINED' ||
    performance.confidence === 'LOW'
  ) {
    return monitor(
      assessment,
      performance,
      'Keep monitoring the trend',
      'Volume is outside the target range, but the performance pattern is not yet sustained strongly enough to justify changing effective sets.',
    );
  }

  if (
    assessment.status === 'LOW' ||
    assessment.status === 'BELOW_TARGET'
  ) {
    if (
      performance.trend === 'IMPROVING' ||
      performance.trend === 'RECOVERING'
    ) {
      return monitor(
        assessment,
        performance,
        'Progress is continuing below target',
        'Volume is below target, but performance is improving or recovering. Do not add sets solely to satisfy the benchmark.',
      );
    }

    if (performance.trend === 'VARIABLE') {
      return monitor(
        assessment,
        performance,
        'Performance is too variable to prescribe more volume',
        'Volume is below target, but performance is staggered or inconsistent. Continue monitoring until a clearer direction emerges.',
      );
    }

    if (performance.trend === 'STABLE') {
      return monitor(
        assessment,
        performance,
        'Below target with no corrective trend yet',
        'Volume is below target, but stable performance alone is not enough to prescribe more sets. Continue monitoring for a sustained plateau or directional change.',
      );
    }

    if (performance.trend === 'PLATEAU') {
      const firstStep = Math.min(assessment.deficitToTargetMin, 2);

      return {
        ...base,
        action: 'ADD_VOLUME_CAUTIOUSLY',
        suggestedEffectiveSetChange: firstStep > 0 ? firstStep : null,
        headline: 'Add a small amount of volume',
        rationale:
          `Volume is below target and the plateau is sustained. Add about ${firstStep} effective sets over the next 7 days as a first step, then monitor the next trend before adding more.`,
      };
    }

    if (
      performance.trend === 'DECLINING' ||
      performance.trend === 'REGRESSING'
    ) {
      return {
        ...base,
        action: 'HOLD_AND_REVIEW',
        suggestedEffectiveSetChange: null,
        headline: 'Do not add volume into a negative trend',
        rationale:
          'Volume is below target, but performance is declining or has reversed downward. Hold volume and review the continuing signal before adding work.',
      };
    }
  }

  if (
    assessment.status === 'ABOVE_TARGET' ||
    assessment.status === 'HIGH_REVIEW'
  ) {
    if (
      performance.trend === 'IMPROVING' ||
      performance.trend === 'RECOVERING'
    ) {
      return monitor(
        assessment,
        performance,
        'Performance is still moving positively',
        assessment.status === 'HIGH_REVIEW'
          ? 'Volume is above the high-review threshold, but performance is improving or recovering. Treat the volume state as a review flag, not an automatic instruction to cut sets.'
          : 'Volume is above target, but performance is improving or recovering. Monitor before reducing effective sets.',
      );
    }

    if (performance.trend === 'VARIABLE') {
      return monitor(
        assessment,
        performance,
        'Performance is too variable to prescribe a reduction',
        'Volume is above target, but the performance signal is staggered or inconsistent. Continue monitoring before changing volume.',
      );
    }

    if (performance.trend === 'STABLE') {
      return monitor(
        assessment,
        performance,
        'Above target with stable performance',
        'Volume is above target, but stable performance alone does not justify an automatic reduction. Continue monitoring for a sustained plateau or negative trend.',
      );
    }

    if (
      performance.trend === 'PLATEAU' ||
      performance.trend === 'DECLINING' ||
      performance.trend === 'REGRESSING'
    ) {
      const excess =
        assessment.status === 'HIGH_REVIEW'
          ? Math.max(
              assessment.excessAboveTargetMax,
              assessment.excessAboveHighReview,
            )
          : assessment.excessAboveTargetMax;
      const firstStep = Math.min(excess, 2);

      return {
        ...base,
        action: 'REDUCE_VOLUME_CAUTIOUSLY',
        suggestedEffectiveSetChange: firstStep > 0 ? -firstStep : null,
        headline:
          performance.trend === 'PLATEAU'
            ? 'Trim volume cautiously and reassess'
            : 'Reduce a small amount of volume and reassess',
        rationale:
          `Volume is above target and the ${performance.trend.toLowerCase()} pattern is sustained. Reduce about ${firstStep} effective sets over the next 7 days as a first step, then reassess performance.`,
      };
    }
  }

  return monitor(
    assessment,
    performance,
    'Continue monitoring',
    'The current combination of volume and performance does not support a corrective change yet.',
  );
}

export function buildMuscleVolumeRecommendation(
  volume: MuscleVolumeSummary,
  performance: MusclePerformanceMonitor,
): MuscleVolumeRecommendation {
  return recommendMuscleVolumeAction(
    assessMuscleVolume(volume),
    performance,
  );
}
