import { MAX_DAILY_XP } from '../config';
import type { DailyXpBreakdown } from '../types';

function safeXp(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value;
}

export function calculateDailyXpTotal(breakdown: DailyXpBreakdown): number {
  const total = safeXp(breakdown.liftingWorkoutXp)
    + safeXp(breakdown.exerciseXp)
    + safeXp(breakdown.progressionXp)
    + safeXp(breakdown.cardioBonusXp);
  return Math.min(MAX_DAILY_XP, total);
}
