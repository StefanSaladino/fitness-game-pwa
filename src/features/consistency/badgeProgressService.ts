import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import { LIFTING_BADGE_KEYS, type EarnedLiftingBadge, type LiftingBadgeKey, type LiftingBadgeProgressSnapshot } from './model';

type ProgressRow = {
  pr_count: number | string;
  lifting_day_count: number | string;
  goals_hit: number | string;
  best_completed_week_streak: number | string;
  cardio_bonus_day_count: number | string;
  badges: unknown;
};

export interface LiftingBadgeProgressService {
  load(): Promise<LiftingBadgeProgressSnapshot>;
}

const badgeKeys = new Set<string>(LIFTING_BADGE_KEYS);

function integerValue(value: number | string, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
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

export function createLiftingBadgeProgressService(client: SupabaseClient = getSupabaseClient()): LiftingBadgeProgressService {
  return {
    async load() {
      const result = await client.rpc('get_my_lifting_badge_progress');
      if (result.error) throw result.error;
      const rows = Array.isArray(result.data) ? result.data as ProgressRow[] : [];
      const row = rows[0];
      if (!row) throw new Error('Lifting badge progress was unavailable.');

      return {
        prCount: integerValue(row.pr_count),
        liftingDayCount: integerValue(row.lifting_day_count),
        goalsHit: integerValue(row.goals_hit),
        bestCompletedWeekStreak: integerValue(row.best_completed_week_streak),
        cardioBonusDayCount: integerValue(row.cardio_bonus_day_count),
        badges: parseBadges(row.badges),
      };
    },
  };
}
