export type ExerciseProgressMetricType = 'E1RM' | 'BODYWEIGHT_REPS';
export type ExerciseProgressMeasurementType = 'WEIGHT_REPS' | 'BODYWEIGHT_REPS' | 'DURATION' | 'OTHER';

export interface ExerciseProgressSummary {
  exerciseId: string;
  canonicalName: string;
  measurementType: ExerciseProgressMeasurementType;
  metricType: ExerciseProgressMetricType | null;
  bestValue: number | null;
  bestWeightKg: number | null;
  bestReps: number | null;
  achievedAt: string | null;
  previousPrValue: number | null;
  sessionCount: number;
  observationCount: number;
  firstPerformedAt: string;
  lastPerformedAt: string;
  averageDaysBetweenSessions: number | null;
  latestMetricValue: number | null;
  latestWeightKg: number | null;
  latestReps: number | null;
  latestObservedAt: string | null;
}

export interface ExerciseProgressHistoryEntry {
  workoutId: string;
  scoringDate: string;
  observedAt: string;
  metricType: ExerciseProgressMetricType | null;
  metricValue: number | null;
  weightKg: number | null;
  reps: number | null;
  previousPrValue: number | null;
  isBaseline: boolean;
  isPr: boolean;
  isCurrentPr: boolean;
  completedWorkingSets: number;
  sessionVolumeKgReps: number;
  heaviestWeightKg: number | null;
  maxCompletedReps: number | null;
  plainBodyweightSets: number;
  addedWeightSets: number;
  assistedSets: number;
}

export type LiftingCalendarPeriodKind = 'WEEK' | 'MONTH';

export interface LiftingCalendarSummary {
  periodKind: LiftingCalendarPeriodKind;
  periodStart: string;
  periodEnd: string;
  completedLiftingSessions: number;
  exerciseCount: number;
  completedWorkingSets: number;
  volumeKgReps: number;
  prCount: number;
}

export const MUSCLE_VOLUME_MUSCLE_GROUPS = [
  'CHEST',
  'LATS',
  'UPPER_BACK',
  'TRAPS',
  'SPINAL_ERECTORS',
  'ANTERIOR_DELTS',
  'LATERAL_DELTS',
  'POSTERIOR_DELTS',
  'BICEPS',
  'TRICEPS',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'FOREARMS_GRIP',
  'CORE',
  'OBLIQUES',
  'NECK',
] as const;

export const LEGACY_MUSCLE_VOLUME_MUSCLE_GROUPS = [
  'BACK',
  'SHOULDERS',
] as const;

export const ALL_MUSCLE_VOLUME_MUSCLE_GROUPS = [
  ...MUSCLE_VOLUME_MUSCLE_GROUPS,
  ...LEGACY_MUSCLE_VOLUME_MUSCLE_GROUPS,
] as const;

export type ActiveMuscleVolumeMuscleGroup =
  typeof MUSCLE_VOLUME_MUSCLE_GROUPS[number];
export type LegacyMuscleVolumeMuscleGroup =
  typeof LEGACY_MUSCLE_VOLUME_MUSCLE_GROUPS[number];
export type MuscleVolumeMuscleGroup =
  | ActiveMuscleVolumeMuscleGroup
  | LegacyMuscleVolumeMuscleGroup;
export type MuscleVolumeWindowDays = 7 | 28;

export type MuscleVolumeStatus =
  | 'NO_DATA'
  | 'LOW'
  | 'BELOW_TARGET'
  | 'ON_TARGET'
  | 'ABOVE_TARGET'
  | 'HIGH_REVIEW';

export type MuscleVolumeBenchmarkEvidenceConfidence =
  | 'HIGH'
  | 'MODERATE_HIGH'
  | 'MODERATE'
  | 'MODERATE_LOW'
  | 'LOW_MODERATE'
  | 'LOW';

export interface MuscleVolumeSummary {
  muscleGroup: MuscleVolumeMuscleGroup;
  windowDays: MuscleVolumeWindowDays;
  windowStart: string;
  windowEnd: string;
  methodologyVersion: string;
  effectiveSets: number;
  directEffectiveSets: number;
  indirectEffectiveSets: number;
  eligibleLogicalSets: number;
  eligibleStages: number;
  reviewFlaggedLogicalSets: number;
  targetMin: number;
  targetMidpoint: number;
  targetMax: number;
  highReviewAbove: number;
  volumeStatus: MuscleVolumeStatus;
  benchmarkEvidenceConfidence: MuscleVolumeBenchmarkEvidenceConfidence;
  highConfidenceEffectiveSets: number;
  mediumConfidenceEffectiveSets: number;
  lowOrProvisionalEffectiveSets: number;
  provisionalEffectiveSets: number;
  highConfidenceProportion: number;
  mediumConfidenceProportion: number;
  lowOrProvisionalProportion: number;
}
