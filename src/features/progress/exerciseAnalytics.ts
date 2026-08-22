import type {
  ExerciseProgressHistoryEntry,
  ExerciseProgressMetricType,
  ExerciseProgressSummary,
} from './model';

export interface ExerciseMetricTrendPoint {
  workoutId: string;
  scoringDate: string;
  observedAt: string;
  value: number;
  isPr: boolean;
  isCurrentPr: boolean;
}

export interface ExerciseVolumeTrendPoint {
  workoutId: string;
  scoringDate: string;
  observedAt: string;
  value: number;
}

export interface ExercisePrTimelineEntry {
  workoutId: string;
  observedAt: string;
  metricType: ExerciseProgressMetricType | null;
  metricValue: number | null;
  weightKg: number | null;
  reps: number | null;
  kind: 'baseline' | 'pr' | 'current-pr';
}

export interface ExerciseAnalyticsSnapshot {
  metricType: ExerciseProgressMetricType | null;
  metricTrend: ExerciseMetricTrendPoint[];
  volumeTrend: ExerciseVolumeTrendPoint[];
  bestWeightKg: number | null;
  bestReps: number | null;
  totalVolumeKgReps: number;
  latestVolumeKgReps: number;
  prTimeline: ExercisePrTimelineEntry[];
}

function byObservedAt(left: ExerciseProgressHistoryEntry, right: ExerciseProgressHistoryEntry): number {
  return new Date(left.observedAt).getTime() - new Date(right.observedAt).getTime();
}

function maxNullable(values: Array<number | null>): number | null {
  const comparable = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return comparable.length > 0 ? Math.max(...comparable) : null;
}

export function buildExerciseAnalytics(
  exercise: ExerciseProgressSummary | null,
  history: readonly ExerciseProgressHistoryEntry[],
): ExerciseAnalyticsSnapshot | null {
  if (!exercise) return null;

  const chronological = [...history].sort(byObservedAt);
  const metricTrend = chronological
    .filter((entry) => entry.metricType === exercise.metricType && entry.metricValue !== null)
    .map((entry) => ({
      workoutId: entry.workoutId,
      scoringDate: entry.scoringDate,
      observedAt: entry.observedAt,
      value: entry.metricValue!,
      isPr: entry.isPr,
      isCurrentPr: entry.isCurrentPr,
    }));

  const volumeTrend = chronological.map((entry) => ({
    workoutId: entry.workoutId,
    scoringDate: entry.scoringDate,
    observedAt: entry.observedAt,
    value: Math.max(0, entry.sessionVolumeKgReps),
  }));

  const prTimeline = chronological
    .filter((entry) => entry.isBaseline || entry.isPr || entry.isCurrentPr)
    .map((entry) => ({
      workoutId: entry.workoutId,
      observedAt: entry.observedAt,
      metricType: entry.metricType,
      metricValue: entry.metricValue,
      weightKg: entry.weightKg,
      reps: entry.reps,
      kind: entry.isCurrentPr ? 'current-pr' as const : entry.isPr ? 'pr' as const : 'baseline' as const,
    }));

  return {
    metricType: exercise.metricType,
    metricTrend,
    volumeTrend,
    bestWeightKg: maxNullable(chronological.map((entry) => entry.heaviestWeightKg)),
    bestReps: maxNullable(chronological.map((entry) => entry.maxCompletedReps)),
    totalVolumeKgReps: chronological.reduce((total, entry) => total + Math.max(0, entry.sessionVolumeKgReps), 0),
    latestVolumeKgReps: volumeTrend.at(-1)?.value ?? 0,
    prTimeline,
  };
}
