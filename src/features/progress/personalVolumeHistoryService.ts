/**
 * Maintainer boundary: read-only adapter for reviewed weekly muscle-stimulus
 * history. Keep this owner-scoped and methodology-backed; do not reconstruct
 * hypertrophy credit from raw sets/reps/load in the client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import {
  ALL_MUSCLE_VOLUME_MUSCLE_GROUPS,
  type MuscleVolumeMuscleGroup,
} from './model';
import type { WeeklyMuscleVolumeHistory } from './personalVolumeBaseline';

type WeeklyRow = {
  muscle_group: string;
  week_start: string;
  effective_sets: number | string;
  direct_effective_sets: number | string;
  indirect_effective_sets: number | string;
  eligible_logical_sets: number | string;
};

function number(value: number | string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function muscle(value: string): MuscleVolumeMuscleGroup {
  if ((ALL_MUSCLE_VOLUME_MUSCLE_GROUPS as readonly string[]).includes(value)) {
    return value as MuscleVolumeMuscleGroup;
  }
  throw new Error(`Unexpected personal-volume muscle group: ${value}`);
}

export interface PersonalVolumeHistoryService {
  load(anchorDate?: string, lookbackDays?: number):
    Promise<WeeklyMuscleVolumeHistory[]>;
}

export function createPersonalVolumeHistoryService(
  client: SupabaseClient = getSupabaseClient(),
): PersonalVolumeHistoryService {
  return {
    async load(anchorDate, lookbackDays = 126) {
      const args: Record<string, unknown> = {
        p_lookback_days: lookbackDays,
      };
      if (anchorDate) args.p_anchor_date = anchorDate;

      const { data, error } = await client.rpc(
        'get_my_weekly_muscle_volume_history',
        args,
      );
      if (error) throw error;

      return ((data ?? []) as WeeklyRow[]).map((row) => ({
        muscleGroup: muscle(row.muscle_group),
        weekStart: row.week_start,
        effectiveSets: number(row.effective_sets),
        directEffectiveSets: number(row.direct_effective_sets),
        indirectEffectiveSets: number(row.indirect_effective_sets),
        eligibleLogicalSets: number(row.eligible_logical_sets),
      }));
    },
  };
}
