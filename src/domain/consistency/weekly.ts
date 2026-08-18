import { MAX_WEEKLY_IMPROVEMENT_XP } from '../config';

const EPSILON = 1e-12;

export function calculateWeeklyConsistency(qualifyingDays: number, weeklyTarget: number): number {
  if (!Number.isFinite(qualifyingDays) || !Number.isFinite(weeklyTarget) || weeklyTarget <= 0) return 0;
  return Math.min(1, Math.max(0, qualifyingDays) / weeklyTarget);
}

/** Difference is a ratio/percentage-point fraction: 0.10 = +10 percentage points. */
export function weeklyImprovementBonus(previousConsistency: number, currentConsistency: number, sameTarget = true): number {
  if (!sameTarget) return 0;
  if (![previousConsistency, currentConsistency].every(Number.isFinite)) return 0;
  const delta = currentConsistency - previousConsistency;
  if (delta <= 0) return 0;
  if (delta + EPSILON < 0.10) return 10;
  if (delta + EPSILON < 0.25) return 20;
  if (delta + EPSILON < 0.50) return 35;
  return MAX_WEEKLY_IMPROVEMENT_XP;
}
