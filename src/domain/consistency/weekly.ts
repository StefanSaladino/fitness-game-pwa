export function calculateWeeklyLiftingConsistency(liftingDays: number, weeklyLiftingTarget: number): number {
  if (!Number.isFinite(liftingDays) || !Number.isFinite(weeklyLiftingTarget) || weeklyLiftingTarget <= 0) return 0;
  return Math.min(1, Math.max(0, liftingDays) / weeklyLiftingTarget);
}

export function weeklyLiftingGoalAchieved(liftingDays: number, weeklyLiftingTarget: number): boolean {
  return calculateWeeklyLiftingConsistency(liftingDays, weeklyLiftingTarget) >= 1;
}

export function nextWeeklyGoalStreak(previousCompletedWeekStreak: number, currentWeekAchieved: boolean): number {
  if (!currentWeekAchieved) return 0;
  if (!Number.isFinite(previousCompletedWeekStreak) || previousCompletedWeekStreak < 0) return 1;
  return Math.floor(previousCompletedWeekStreak) + 1;
}

/** @deprecated v0.3 weekly consistency counts lifting days only. */
export const calculateWeeklyConsistency = calculateWeeklyLiftingConsistency;

/** @deprecated v0.3 weekly-improvement XP was removed. Weekly goals drive streaks, not XP. */
export function weeklyImprovementBonus(): number {
  return 0;
}
