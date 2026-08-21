import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import { LIFTING_BADGE_KEYS, type EarnedLiftingBadge, type LiftingBadgeKey, type LiftingConsistencySummary, type WeeklyLiftingSnapshot } from './model';

type SummaryRow = {
  current_week_start: string;
  current_week_target: number | string;
  current_week_lifting_days: number | string;
  current_completed_week_streak: number | string;
  best_completed_week_streak: number | string;
  completed_weeks: number | string;
  goals_hit: number | string;
  recent_weeks: unknown;
  badges: unknown;
};

export interface LiftingConsistencyService {
  load(): Promise<LiftingConsistencySummary>;
}

const badgeKeys = new Set<string>(LIFTING_BADGE_KEYS);

function integerValue(value: number | string, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function parseRecentWeeks(value: unknown): WeeklyLiftingSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.weekStart !== 'string' || typeof row.achieved !== 'boolean') return [];
    const target = integerValue(row.target as number | string, 1);
    const liftingDays = integerValue(row.liftingDays as number | string);
    return [{ weekStart: row.weekStart, target: Math.min(7, Math.max(1, target)), liftingDays: Math.min(7, liftingDays), achieved: row.achieved }];
  });
}

function parseBadges(value: unknown): EarnedLiftingBadge[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.badgeKey !== 'string' || !badgeKeys.has(row.badgeKey) || typeof row.earnedAt !== 'string') return [];
    return [{ badgeKey: row.badgeKey as LiftingBadgeKey, earnedAt: row.earnedAt }];
  });
}

export function createLiftingConsistencyService(client: SupabaseClient = getSupabaseClient()): LiftingConsistencyService {
  return {
    async load() {
      const result = await client.rpc('get_my_lifting_consistency_summary');
      if (result.error) throw result.error;
      const rows = Array.isArray(result.data) ? result.data as SummaryRow[] : [];
      const row = rows[0];
      if (!row) throw new Error('Weekly lifting consistency summary was unavailable.');

      return {
        currentWeekStart: row.current_week_start,
        currentWeekTarget: Math.min(7, Math.max(1, integerValue(row.current_week_target, 1))),
        currentWeekLiftingDays: Math.min(7, integerValue(row.current_week_lifting_days)),
        currentCompletedWeekStreak: integerValue(row.current_completed_week_streak),
        bestCompletedWeekStreak: integerValue(row.best_completed_week_streak),
        completedWeeks: integerValue(row.completed_weeks),
        goalsHit: integerValue(row.goals_hit),
        recentWeeks: parseRecentWeeks(row.recent_weeks),
        badges: parseBadges(row.badges),
      };
    },
  };
}
