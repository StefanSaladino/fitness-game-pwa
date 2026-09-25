/**
 * Maintainer boundary: constructs completed-period reports from authoritative
 * read models/frozen sources. Historical monthly snapshots are the source
 * boundary; do not silently rebuild a frozen month from mutable current data.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import {
  ALL_MUSCLE_VOLUME_MUSCLE_GROUPS,
  MUSCLE_VOLUME_MUSCLE_GROUPS,
  type MuscleVolumeBenchmarkEvidenceConfidence,
  type MuscleVolumeMuscleGroup,
  type MuscleVolumeWindowDays,
} from './model';
import type { MusclePerformanceSourceObservation } from './musclePerformanceMonitor';
import { createMusclePerformanceService } from './musclePerformanceService';
import {
  buildCompletedTrainingReport,
  type CompletedTrainingReport,
  type TrainingReportMusclePeriodInput,
  type TrainingReportPeriodKind,
  type TrainingReportPeriodSummary,
} from './trainingReportModel';

type ExactPeriodRow = {
  report_version: string;
  period_kind: string;
  period_start: string;
  period_end: string;
  methodology_version: string;
  low_status_fraction_of_target_min: number | string;
  completed_lifting_sessions: number | string;
  active_training_seconds: number | string;
  exercise_count: number | string;
  completed_working_sets: number | string;
  volume_kg_reps: number | string;
  pr_count: number | string;
  muscle_group: string;
  benchmark_window_days: number | string;
  period_effective_sets: number | string;
  period_direct_effective_sets: number | string;
  period_indirect_effective_sets: number | string;
  eligible_logical_sets: number | string;
  eligible_stages: number | string;
  review_flagged_logical_sets: number | string;
  target_min: number | string;
  target_midpoint: number | string;
  target_max: number | string;
  high_review_above: number | string;
  benchmark_evidence_confidence: string;
  high_confidence_effective_sets: number | string;
  medium_confidence_effective_sets: number | string;
  low_or_provisional_effective_sets: number | string;
  provisional_effective_sets: number | string;
  high_confidence_proportion: number | string;
  medium_confidence_proportion: number | string;
  low_or_provisional_proportion: number | string;
};

type FrozenParentRow = {
  id: string;
  report_version: string;
  period_start: string;
  period_end: string;
  methodology_version: string;
  low_status_fraction_of_target_min: number | string;
  completed_lifting_sessions: number | string;
  active_training_seconds: number | string;
  exercise_count: number | string;
  completed_working_sets: number | string;
  volume_kg_reps: number | string;
  pr_count: number | string;
};

type FrozenMuscleRow = {
  muscle_group: string;
  benchmark_window_days: number | string;
  period_effective_sets: number | string;
  period_direct_effective_sets: number | string;
  period_indirect_effective_sets: number | string;
  eligible_logical_sets: number | string;
  eligible_stages: number | string;
  review_flagged_logical_sets: number | string;
  target_min: number | string;
  target_midpoint: number | string;
  target_max: number | string;
  high_review_above: number | string;
  benchmark_evidence_confidence: string;
  high_confidence_effective_sets: number | string;
  medium_confidence_effective_sets: number | string;
  low_or_provisional_effective_sets: number | string;
  provisional_effective_sets: number | string;
  high_confidence_proportion: number | string;
  medium_confidence_proportion: number | string;
  low_or_provisional_proportion: number | string;
};

type FrozenPerformanceRow = {
  muscle_group: string;
  exercise_id: string;
  canonical_name: string;
  contribution_role: string;
  contribution_weight: number | string;
  scoring_date: string;
  observed_at: string;
  relative_performance_index: number | string;
};

const CONFIDENCE_VALUES = [
  'HIGH',
  'MODERATE_HIGH',
  'MODERATE',
  'MODERATE_LOW',
  'LOW_MODERATE',
  'LOW',
] as const;

export interface TrainingReportService {
  loadReport(
    periodKind: TrainingReportPeriodKind,
    periodStart: string,
  ): Promise<CompletedTrainingReport>;
}

function numberValue(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid training-report numeric value: ${String(value)}`);
  }
  return parsed;
}

function integerValue(value: number | string): number {
  return Math.trunc(numberValue(value));
}

function muscleGroup(value: string): MuscleVolumeMuscleGroup {
  if ((ALL_MUSCLE_VOLUME_MUSCLE_GROUPS as readonly string[]).includes(value)) {
    return value as MuscleVolumeMuscleGroup;
  }
  throw new Error(`Unexpected report muscle group: ${value}`);
}

function benchmarkWindow(value: number | string): MuscleVolumeWindowDays {
  const parsed = integerValue(value);
  if (parsed === 7 || parsed === 28) return parsed;
  throw new Error(`Unexpected report benchmark window: ${String(value)}`);
}

function benchmarkConfidence(
  value: string,
): MuscleVolumeBenchmarkEvidenceConfidence {
  if ((CONFIDENCE_VALUES as readonly string[]).includes(value)) {
    return value as MuscleVolumeBenchmarkEvidenceConfidence;
  }
  throw new Error(`Unexpected report benchmark confidence: ${value}`);
}

function performanceRole(value: string): 'DIRECT' | 'INDIRECT' {
  if (value === 'DIRECT' || value === 'INDIRECT') return value;
  throw new Error(`Unexpected report contribution role: ${value}`);
}

function periodKind(value: string): TrainingReportPeriodKind {
  if (value === 'WEEK' || value === 'MONTH') return value;
  throw new Error(`Unexpected report period kind: ${value}`);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`Invalid report period date: ${value}`);
  }
  return parsed;
}

function addUtcDays(value: string, days: number): string {
  const date = utcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function shiftUtcMonth(value: string, months: number): string {
  const date = utcDate(value);
  return isoDate(new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + months,
    1,
  )));
}

function localCalendarDate(timezone: string, now: Date): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const part = (type: 'year' | 'month' | 'day') =>
    Number(parts.find((item) => item.type === type)?.value ?? '');

  const year = part('year');
  const month = part('month');
  const day = part('day');

  if (!year || !month || !day) {
    throw new Error('Unable to resolve the profile calendar date.');
  }

  return new Date(Date.UTC(year, month - 1, day));
}

export function latestCompletedTrainingReportPeriodStart(
  kind: TrainingReportPeriodKind,
  timezone: string,
  now = new Date(),
): string {
  const localDate = localCalendarDate(timezone, now);

  if (kind === 'MONTH') {
    return isoDate(new Date(Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth() - 1,
      1,
    )));
  }

  const weekday = localDate.getUTCDay();
  const isoWeekday = weekday === 0 ? 7 : weekday;
  const currentMonday = new Date(localDate);
  currentMonday.setUTCDate(currentMonday.getUTCDate() - (isoWeekday - 1));
  currentMonday.setUTCDate(currentMonday.getUTCDate() - 7);
  return isoDate(currentMonday);
}

export function shiftTrainingReportPeriodStart(
  kind: TrainingReportPeriodKind,
  periodStart: string,
  amount: number,
): string {
  return kind === 'WEEK'
    ? addUtcDays(periodStart, amount * 7)
    : shiftUtcMonth(periodStart, amount);
}

export function trainingReportPeriodEnd(
  kind: TrainingReportPeriodKind,
  periodStart: string,
): string {
  if (kind === 'WEEK') return addUtcDays(periodStart, 6);
  const nextMonth = shiftUtcMonth(periodStart, 1);
  return addUtcDays(nextMonth, -1);
}

function summaryFromExactRows(
  rows: ExactPeriodRow[],
): TrainingReportPeriodSummary {
  const first = rows[0];
  if (!first) throw new Error('Training report source returned no rows.');

  return {
    periodKind: periodKind(first.period_kind),
    periodStart: first.period_start,
    periodEnd: first.period_end,
    completedLiftingSessions: integerValue(first.completed_lifting_sessions),
    activeTrainingSeconds: integerValue(first.active_training_seconds),
    exerciseCount: integerValue(first.exercise_count),
    completedWorkingSets: integerValue(first.completed_working_sets),
    volumeKgReps: numberValue(first.volume_kg_reps),
    prCount: integerValue(first.pr_count),
  };
}

function muscleFromExactRow(row: ExactPeriodRow): TrainingReportMusclePeriodInput {
  return {
    muscleGroup: muscleGroup(row.muscle_group),
    methodologyVersion: row.methodology_version,
    effectiveSets: numberValue(row.period_effective_sets),
    directEffectiveSets: numberValue(row.period_direct_effective_sets),
    indirectEffectiveSets: numberValue(row.period_indirect_effective_sets),
    eligibleLogicalSets: integerValue(row.eligible_logical_sets),
    eligibleStages: integerValue(row.eligible_stages),
    reviewFlaggedLogicalSets: integerValue(row.review_flagged_logical_sets),
    benchmarkWindowDays: benchmarkWindow(row.benchmark_window_days),
    targetMin: numberValue(row.target_min),
    targetMidpoint: numberValue(row.target_midpoint),
    targetMax: numberValue(row.target_max),
    highReviewAbove: numberValue(row.high_review_above),
    lowStatusFractionOfTargetMin: numberValue(
      row.low_status_fraction_of_target_min,
    ),
    benchmarkEvidenceConfidence: benchmarkConfidence(
      row.benchmark_evidence_confidence,
    ),
    highConfidenceEffectiveSets: numberValue(
      row.high_confidence_effective_sets,
    ),
    mediumConfidenceEffectiveSets: numberValue(
      row.medium_confidence_effective_sets,
    ),
    lowOrProvisionalEffectiveSets: numberValue(
      row.low_or_provisional_effective_sets,
    ),
    provisionalEffectiveSets: numberValue(row.provisional_effective_sets),
    highConfidenceProportion: numberValue(row.high_confidence_proportion),
    mediumConfidenceProportion: numberValue(row.medium_confidence_proportion),
    lowOrProvisionalProportion: numberValue(
      row.low_or_provisional_proportion,
    ),
  };
}

function summaryFromFrozenParent(
  row: FrozenParentRow,
): TrainingReportPeriodSummary {
  return {
    periodKind: 'MONTH',
    periodStart: row.period_start,
    periodEnd: row.period_end,
    completedLiftingSessions: integerValue(row.completed_lifting_sessions),
    activeTrainingSeconds: integerValue(row.active_training_seconds),
    exerciseCount: integerValue(row.exercise_count),
    completedWorkingSets: integerValue(row.completed_working_sets),
    volumeKgReps: numberValue(row.volume_kg_reps),
    prCount: integerValue(row.pr_count),
  };
}

function muscleFromFrozenRow(
  row: FrozenMuscleRow,
  parent: FrozenParentRow,
): TrainingReportMusclePeriodInput {
  return {
    muscleGroup: muscleGroup(row.muscle_group),
    methodologyVersion: parent.methodology_version,
    effectiveSets: numberValue(row.period_effective_sets),
    directEffectiveSets: numberValue(row.period_direct_effective_sets),
    indirectEffectiveSets: numberValue(row.period_indirect_effective_sets),
    eligibleLogicalSets: integerValue(row.eligible_logical_sets),
    eligibleStages: integerValue(row.eligible_stages),
    reviewFlaggedLogicalSets: integerValue(row.review_flagged_logical_sets),
    benchmarkWindowDays: benchmarkWindow(row.benchmark_window_days),
    targetMin: numberValue(row.target_min),
    targetMidpoint: numberValue(row.target_midpoint),
    targetMax: numberValue(row.target_max),
    highReviewAbove: numberValue(row.high_review_above),
    lowStatusFractionOfTargetMin: numberValue(
      parent.low_status_fraction_of_target_min,
    ),
    benchmarkEvidenceConfidence: benchmarkConfidence(
      row.benchmark_evidence_confidence,
    ),
    highConfidenceEffectiveSets: numberValue(
      row.high_confidence_effective_sets,
    ),
    mediumConfidenceEffectiveSets: numberValue(
      row.medium_confidence_effective_sets,
    ),
    lowOrProvisionalEffectiveSets: numberValue(
      row.low_or_provisional_effective_sets,
    ),
    provisionalEffectiveSets: numberValue(row.provisional_effective_sets),
    highConfidenceProportion: numberValue(row.high_confidence_proportion),
    mediumConfidenceProportion: numberValue(row.medium_confidence_proportion),
    lowOrProvisionalProportion: numberValue(
      row.low_or_provisional_proportion,
    ),
  };
}

function performanceFromFrozenRow(
  row: FrozenPerformanceRow,
): MusclePerformanceSourceObservation {
  return {
    muscleGroup: muscleGroup(row.muscle_group),
    exerciseId: row.exercise_id,
    canonicalName: row.canonical_name,
    contributionRole: performanceRole(row.contribution_role),
    contributionWeight: numberValue(row.contribution_weight),
    scoringDate: row.scoring_date,
    observedAt: row.observed_at,
    relativePerformanceIndex: numberValue(row.relative_performance_index),
  };
}

async function exactRows(
  client: SupabaseClient,
  kind: TrainingReportPeriodKind,
  start: string,
): Promise<ExactPeriodRow[]> {
  const { data, error } = await client.rpc(
    'get_my_completed_training_report_period',
    {
      p_period_kind: kind,
      p_period_start: start,
    },
  );

  if (error) throw error;
  const rows = (data ?? []) as ExactPeriodRow[];
  if (!rows.length) throw new Error('Training report source returned no rows.');
  return rows;
}

async function frozenMonth(
  client: SupabaseClient,
  start: string,
): Promise<{
  parent: FrozenParentRow;
  muscles: FrozenMuscleRow[];
  performance: MusclePerformanceSourceObservation[];
}> {
  const { error: freezeError } = await client.rpc(
    'freeze_my_monthly_training_report_source',
    { p_month_start: start },
  );
  if (freezeError) throw freezeError;

  const { data: parentData, error: parentError } = await client
    .from('monthly_training_report_source_snapshots')
    .select(
      'id,report_version,period_start,period_end,methodology_version,low_status_fraction_of_target_min,completed_lifting_sessions,active_training_seconds,exercise_count,completed_working_sets,volume_kg_reps,pr_count',
    )
    .eq('period_start', start)
    .maybeSingle();

  if (parentError) throw parentError;
  if (!parentData) throw new Error('Frozen monthly report source was not found.');

  const parent = parentData as FrozenParentRow;

  const [{ data: muscleData, error: muscleError }, {
    data: performanceData,
    error: performanceError,
  }] = await Promise.all([
    client
      .from('monthly_training_report_muscle_snapshots')
      .select(
        'muscle_group,benchmark_window_days,period_effective_sets,period_direct_effective_sets,period_indirect_effective_sets,eligible_logical_sets,eligible_stages,review_flagged_logical_sets,target_min,target_midpoint,target_max,high_review_above,benchmark_evidence_confidence,high_confidence_effective_sets,medium_confidence_effective_sets,low_or_provisional_effective_sets,provisional_effective_sets,high_confidence_proportion,medium_confidence_proportion,low_or_provisional_proportion',
      )
      .eq('snapshot_id', parent.id),
    client
      .from('monthly_training_report_performance_snapshots')
      .select(
        'muscle_group,exercise_id,canonical_name,contribution_role,contribution_weight,scoring_date,observed_at,relative_performance_index',
      )
      .eq('snapshot_id', parent.id)
      .order('scoring_date', { ascending: true })
      .order('observed_at', { ascending: true }),
  ]);

  if (muscleError) throw muscleError;
  if (performanceError) throw performanceError;

  return {
    parent,
    muscles: (muscleData ?? []) as FrozenMuscleRow[],
    performance: ((performanceData ?? []) as FrozenPerformanceRow[]).map(
      performanceFromFrozenRow,
    ),
  };
}

export function createTrainingReportService(
  client: SupabaseClient = getSupabaseClient(),
): TrainingReportService {
  const performanceService = createMusclePerformanceService(client);

  return {
    async loadReport(kind, start) {
      const previousStart = shiftTrainingReportPeriodStart(kind, start, -1);
      const previousRowsPromise = exactRows(client, kind, previousStart);

      if (kind === 'WEEK') {
        const currentRows = await exactRows(client, kind, start);
        const period = summaryFromExactRows(currentRows);
        const [previousRows, performanceObservations] = await Promise.all([
          previousRowsPromise,
          performanceService.loadObservations(period.periodEnd, 56),
        ]);

        return buildCompletedTrainingReport({
          period,
          previousPeriod: summaryFromExactRows(previousRows),
          muscleVolume: currentRows.map(muscleFromExactRow),
          performanceObservations,
        });
      }

      const [{ parent, muscles, performance }, previousRows] =
        await Promise.all([
          frozenMonth(client, start),
          previousRowsPromise,
        ]);

      return buildCompletedTrainingReport({
        period: summaryFromFrozenParent(parent),
        previousPeriod: summaryFromExactRows(previousRows),
        muscleVolume: muscles.map((row) => muscleFromFrozenRow(row, parent)),
        performanceObservations: performance,
      });
    },
  };
}
