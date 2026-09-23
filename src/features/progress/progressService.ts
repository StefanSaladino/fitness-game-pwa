import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import {
  ALL_MUSCLE_VOLUME_MUSCLE_GROUPS,
  MUSCLE_VOLUME_MUSCLE_GROUPS,
  type ExerciseProgressHistoryEntry,
  type ExerciseProgressMeasurementType,
  type ExerciseProgressMetricType,
  type ExerciseProgressSummary,
  type LiftingCalendarSummary,
  type MuscleVolumeBenchmarkEvidenceConfidence,
  type MuscleVolumeMuscleGroup,
  type MuscleVolumeStatus,
  type MuscleVolumeSummary,
  type MuscleVolumeWindowDays,
} from './model';

type OverviewRow = {
  exercise_id: string;
  canonical_name: string;
  measurement_type: ExerciseProgressMeasurementType;
  metric_type: ExerciseProgressMetricType | null;
  best_value: number | string | null;
  best_weight_kg: number | string | null;
  best_reps: number | null;
  achieved_at: string | null;
  previous_pr_value: number | string | null;
  session_count: number | string;
  observation_count: number | string;
  first_performed_at: string;
  last_performed_at: string;
  average_days_between_sessions: number | string | null;
  latest_metric_value: number | string | null;
  latest_weight_kg: number | string | null;
  latest_reps: number | null;
  latest_observed_at: string | null;
};

type CalendarSummaryRow = {
  period_kind: 'WEEK' | 'MONTH';
  period_start: string;
  period_end: string;
  completed_lifting_sessions: number | string;
  exercise_count: number | string;
  completed_working_sets: number | string;
  volume_kg_reps: number | string;
  pr_count: number | string;
};

type HistoryRow = {
  workout_id: string;
  scoring_date: string;
  observed_at: string;
  metric_type: ExerciseProgressMetricType | null;
  metric_value: number | string | null;
  weight_kg: number | string | null;
  reps: number | null;
  previous_pr_value: number | string | null;
  is_baseline: boolean;
  is_pr: boolean;
  is_current_pr: boolean;
  completed_working_sets: number | string;
  session_volume_kg_reps: number | string;
  heaviest_weight_kg: number | string | null;
  max_completed_reps: number | null;
  plain_bodyweight_sets: number | string;
  added_weight_sets: number | string;
  assisted_sets: number | string;
};

type MuscleVolumeRow = {
  muscle_group: string;
  window_days: number | string;
  window_start: string;
  window_end: string;
  methodology_version: string;
  effective_sets: number | string;
  direct_effective_sets: number | string;
  indirect_effective_sets: number | string;
  eligible_logical_sets: number | string;
  eligible_stages: number | string;
  review_flagged_logical_sets: number | string;
  target_min: number | string;
  target_midpoint: number | string;
  target_max: number | string;
  high_review_above: number | string;
  volume_status: string;
  benchmark_evidence_confidence: string;
  high_confidence_effective_sets: number | string;
  medium_confidence_effective_sets: number | string;
  low_or_provisional_effective_sets: number | string;
  provisional_effective_sets: number | string;
  high_confidence_proportion: number | string;
  medium_confidence_proportion: number | string;
  low_or_provisional_proportion: number | string;
};

export interface ExerciseProgressService {
  listOverview(): Promise<ExerciseProgressSummary[]>;
  loadCalendarSummaries(): Promise<LiftingCalendarSummary[]>;
  loadHistory(exerciseId: string): Promise<ExerciseProgressHistoryEntry[]>;
  loadMuscleVolume(anchorDate?: string): Promise<MuscleVolumeSummary[]>;
}

function nullableNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requiredNumber(value: number | string): number {
  return nullableNumber(value) ?? 0;
}

function muscleGroup(value: string): MuscleVolumeMuscleGroup {
  if ((ALL_MUSCLE_VOLUME_MUSCLE_GROUPS as readonly string[]).includes(value)) {
    return value as MuscleVolumeMuscleGroup;
  }
  throw new Error(`Unexpected muscle-volume muscle group: ${value}`);
}

function muscleVolumeWindowDays(value: number | string): MuscleVolumeWindowDays {
  const parsed = requiredNumber(value);
  if (parsed === 7 || parsed === 28) return parsed;
  throw new Error(`Unexpected muscle-volume window: ${value}`);
}

function muscleVolumeStatus(value: string): MuscleVolumeStatus {
  if (
    value === 'NO_DATA'
    || value === 'LOW'
    || value === 'BELOW_TARGET'
    || value === 'ON_TARGET'
    || value === 'ABOVE_TARGET'
    || value === 'HIGH_REVIEW'
  ) {
    return value;
  }
  throw new Error(`Unexpected muscle-volume status: ${value}`);
}

function benchmarkEvidenceConfidence(value: string): MuscleVolumeBenchmarkEvidenceConfidence {
  if (
    value === 'HIGH'
    || value === 'MODERATE_HIGH'
    || value === 'MODERATE'
    || value === 'MODERATE_LOW'
    || value === 'LOW_MODERATE'
    || value === 'LOW'
  ) {
    return value;
  }
  throw new Error(`Unexpected muscle-volume benchmark confidence: ${value}`);
}

function mapOverview(row: OverviewRow): ExerciseProgressSummary {
  return {
    exerciseId: row.exercise_id,
    canonicalName: row.canonical_name,
    measurementType: row.measurement_type,
    metricType: row.metric_type,
    bestValue: nullableNumber(row.best_value),
    bestWeightKg: nullableNumber(row.best_weight_kg),
    bestReps: row.best_reps,
    achievedAt: row.achieved_at,
    previousPrValue: nullableNumber(row.previous_pr_value),
    sessionCount: requiredNumber(row.session_count),
    observationCount: requiredNumber(row.observation_count),
    firstPerformedAt: row.first_performed_at,
    lastPerformedAt: row.last_performed_at,
    averageDaysBetweenSessions: nullableNumber(row.average_days_between_sessions),
    latestMetricValue: nullableNumber(row.latest_metric_value),
    latestWeightKg: nullableNumber(row.latest_weight_kg),
    latestReps: row.latest_reps,
    latestObservedAt: row.latest_observed_at,
  };
}

function mapCalendarSummary(row: CalendarSummaryRow): LiftingCalendarSummary {
  return {
    periodKind: row.period_kind,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    completedLiftingSessions: requiredNumber(row.completed_lifting_sessions),
    exerciseCount: requiredNumber(row.exercise_count),
    completedWorkingSets: requiredNumber(row.completed_working_sets),
    volumeKgReps: requiredNumber(row.volume_kg_reps),
    prCount: requiredNumber(row.pr_count),
  };
}

function mapHistory(row: HistoryRow): ExerciseProgressHistoryEntry {
  return {
    workoutId: row.workout_id,
    scoringDate: row.scoring_date,
    observedAt: row.observed_at,
    metricType: row.metric_type,
    metricValue: nullableNumber(row.metric_value),
    weightKg: nullableNumber(row.weight_kg),
    reps: row.reps,
    previousPrValue: nullableNumber(row.previous_pr_value),
    isBaseline: Boolean(row.is_baseline),
    isPr: Boolean(row.is_pr),
    isCurrentPr: Boolean(row.is_current_pr),
    completedWorkingSets: requiredNumber(row.completed_working_sets),
    sessionVolumeKgReps: requiredNumber(row.session_volume_kg_reps),
    heaviestWeightKg: nullableNumber(row.heaviest_weight_kg),
    maxCompletedReps: row.max_completed_reps,
    plainBodyweightSets: requiredNumber(row.plain_bodyweight_sets),
    addedWeightSets: requiredNumber(row.added_weight_sets),
    assistedSets: requiredNumber(row.assisted_sets),
  };
}

function mapMuscleVolume(row: MuscleVolumeRow): MuscleVolumeSummary {
  return {
    muscleGroup: muscleGroup(row.muscle_group),
    windowDays: muscleVolumeWindowDays(row.window_days),
    windowStart: row.window_start,
    windowEnd: row.window_end,
    methodologyVersion: row.methodology_version,
    effectiveSets: requiredNumber(row.effective_sets),
    directEffectiveSets: requiredNumber(row.direct_effective_sets),
    indirectEffectiveSets: requiredNumber(row.indirect_effective_sets),
    eligibleLogicalSets: requiredNumber(row.eligible_logical_sets),
    eligibleStages: requiredNumber(row.eligible_stages),
    reviewFlaggedLogicalSets: requiredNumber(row.review_flagged_logical_sets),
    targetMin: requiredNumber(row.target_min),
    targetMidpoint: requiredNumber(row.target_midpoint),
    targetMax: requiredNumber(row.target_max),
    highReviewAbove: requiredNumber(row.high_review_above),
    volumeStatus: muscleVolumeStatus(row.volume_status),
    benchmarkEvidenceConfidence: benchmarkEvidenceConfidence(row.benchmark_evidence_confidence),
    highConfidenceEffectiveSets: requiredNumber(row.high_confidence_effective_sets),
    mediumConfidenceEffectiveSets: requiredNumber(row.medium_confidence_effective_sets),
    lowOrProvisionalEffectiveSets: requiredNumber(row.low_or_provisional_effective_sets),
    provisionalEffectiveSets: requiredNumber(row.provisional_effective_sets),
    highConfidenceProportion: requiredNumber(row.high_confidence_proportion),
    mediumConfidenceProportion: requiredNumber(row.medium_confidence_proportion),
    lowOrProvisionalProportion: requiredNumber(row.low_or_provisional_proportion),
  };
}

export function createExerciseProgressService(client: SupabaseClient = getSupabaseClient()): ExerciseProgressService {
  return {
    async listOverview() {
      const { data, error } = await client.rpc('get_my_exercise_progress_overview');
      if (error) throw error;
      return ((data ?? []) as OverviewRow[]).map(mapOverview);
    },

    async loadCalendarSummaries() {
      const { data, error } = await client.rpc('get_my_lifting_calendar_summaries', {
        p_week_count: 12,
        p_month_count: 6,
      });
      if (error) throw error;
      return ((data ?? []) as CalendarSummaryRow[]).map(mapCalendarSummary);
    },

    async loadHistory(exerciseId) {
      const { data, error } = await client.rpc('get_my_exercise_progress_history', {
        p_exercise_id: exerciseId,
      });
      if (error) throw error;
      return ((data ?? []) as HistoryRow[]).map(mapHistory);
    },

    async loadMuscleVolume(anchorDate) {
      const { data, error } = await client.rpc(
        'get_my_muscle_volume',
        anchorDate ? { p_anchor_date: anchorDate } : {},
      );
      if (error) throw error;
      return ((data ?? []) as MuscleVolumeRow[]).map(mapMuscleVolume);
    },
  };
}
