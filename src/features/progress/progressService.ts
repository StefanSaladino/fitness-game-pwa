import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type {
  ExerciseProgressHistoryEntry,
  ExerciseProgressMeasurementType,
  ExerciseProgressMetricType,
  ExerciseProgressSummary,
  LiftingCalendarSummary,
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

export interface ExerciseProgressService {
  listOverview(): Promise<ExerciseProgressSummary[]>;
  loadCalendarSummaries(): Promise<LiftingCalendarSummary[]>;
  loadHistory(exerciseId: string): Promise<ExerciseProgressHistoryEntry[]>;
}

function nullableNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requiredNumber(value: number | string): number {
  return nullableNumber(value) ?? 0;
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
  };
}
