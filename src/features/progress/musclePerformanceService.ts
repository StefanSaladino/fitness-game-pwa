import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import {
  ALL_MUSCLE_VOLUME_MUSCLE_GROUPS,
  MUSCLE_VOLUME_MUSCLE_GROUPS,
  type MuscleVolumeMuscleGroup,
} from './model';
import type { MusclePerformanceSourceObservation } from './musclePerformanceMonitor';

type MusclePerformanceRow = {
  muscle_group: string;
  exercise_id: string;
  canonical_name: string;
  contribution_role: string;
  contribution_weight: number | string;
  scoring_date: string;
  observed_at: string;
  metric_type: string;
  metric_value: number | string;
  reference_metric_value: number | string;
  relative_performance_index: number | string;
};

export interface MusclePerformanceService {
  loadObservations(
    anchorDate?: string,
    lookbackDays?: number,
  ): Promise<MusclePerformanceSourceObservation[]>;
}

function requiredNumber(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function muscleGroup(value: string): MuscleVolumeMuscleGroup {
  if ((ALL_MUSCLE_VOLUME_MUSCLE_GROUPS as readonly string[]).includes(value)) {
    return value as MuscleVolumeMuscleGroup;
  }
  throw new Error(`Unexpected muscle-performance muscle group: ${value}`);
}

function contributionRole(value: string): 'DIRECT' | 'INDIRECT' {
  if (value === 'DIRECT' || value === 'INDIRECT') return value;
  throw new Error(`Unexpected muscle-performance contribution role: ${value}`);
}

function mapObservation(
  row: MusclePerformanceRow,
): MusclePerformanceSourceObservation {
  return {
    muscleGroup: muscleGroup(row.muscle_group),
    exerciseId: row.exercise_id,
    canonicalName: row.canonical_name,
    contributionRole: contributionRole(row.contribution_role),
    contributionWeight: requiredNumber(row.contribution_weight),
    scoringDate: row.scoring_date,
    observedAt: row.observed_at,
    relativePerformanceIndex: requiredNumber(row.relative_performance_index),
  };
}

export function createMusclePerformanceService(
  client: SupabaseClient = getSupabaseClient(),
): MusclePerformanceService {
  return {
    async loadObservations(anchorDate, lookbackDays = 56) {
      const args: Record<string, unknown> = {
        p_lookback_days: lookbackDays,
      };

      if (anchorDate) args.p_anchor_date = anchorDate;

      const { data, error } = await client.rpc(
        'get_my_muscle_performance_observations',
        args,
      );

      if (error) throw error;
      return ((data ?? []) as MusclePerformanceRow[]).map(mapObservation);
    },
  };
}
