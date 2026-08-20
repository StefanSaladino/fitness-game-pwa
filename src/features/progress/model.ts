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
