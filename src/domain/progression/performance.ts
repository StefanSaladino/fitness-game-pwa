import { MAX_DAILY_PROGRESSION_XP, MAX_PROGRESS_XP_PER_EXERCISE } from '../config';

const EPSILON = 1e-12;

/** Improvement expressed as a ratio: 0.01 = 1%, 0.05 = 5%. */
export function progressionBonusForImprovementRatio(improvementRatio: number): number {
  if (!Number.isFinite(improvementRatio) || improvementRatio + EPSILON < 0.01) return 0;
  if (improvementRatio + EPSILON < 0.025) return 5;
  if (improvementRatio + EPSILON < 0.05) return 10;
  return MAX_PROGRESS_XP_PER_EXERCISE;
}

export function bodyweightProgressionBonus(previousBestReps: number, currentReps: number): number {
  if (![previousBestReps, currentReps].every(Number.isFinite)) return 0;
  const delta = Math.floor(currentReps) - Math.floor(previousBestReps);
  if (delta <= 0) return 0;
  if (delta === 1) return 5;
  if (delta === 2) return 10;
  return MAX_PROGRESS_XP_PER_EXERCISE;
}

export function relativeImprovementHigherIsBetter(previousBest: number, current: number): number {
  if (!Number.isFinite(previousBest) || !Number.isFinite(current) || previousBest <= 0 || current <= previousBest) return 0;
  return (current - previousBest) / previousBest;
}

export interface ProgressionEligibilityInput {
  hasPriorBaseline: boolean;
  qualifyingLiftingWorkout: boolean;
  improvementRatio: number;
}

export function calculateExerciseProgressionBonus(input: ProgressionEligibilityInput): number {
  if (!input.hasPriorBaseline || !input.qualifyingLiftingWorkout) return 0;
  return progressionBonusForImprovementRatio(input.improvementRatio);
}

export function calculateDailyProgressionXp(bonuses: readonly number[]): number {
  const total = bonuses.reduce((sum, bonus) => {
    if (!Number.isFinite(bonus) || bonus <= 0) return sum;
    return sum + Math.min(MAX_PROGRESS_XP_PER_EXERCISE, bonus);
  }, 0);
  return Math.min(MAX_DAILY_PROGRESSION_XP, total);
}

export function estimatedOneRepMaxEpley(weightKg: number, reps: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps) || weightKg <= 0 || reps < 1 || reps > 12) return null;
  return weightKg * (1 + reps / 30);
}

/** @deprecated v0.3 removes the 168-hour account gate. */
export function isAccountPerformanceEligible(): boolean {
  return true;
}

/** @deprecated v0.3 uses progressionBonusForImprovementRatio. */
export const performanceBonusForImprovementRatio = progressionBonusForImprovementRatio;

/** @deprecated v0.3 uses calculateExerciseProgressionBonus. */
export function calculatePerformanceBonus(input: {
  qualifyingWorkout: boolean;
  validPriorObservationCount: number;
  improvementRatio: number;
}): number {
  return calculateExerciseProgressionBonus({
    hasPriorBaseline: input.validPriorObservationCount >= 1,
    qualifyingLiftingWorkout: input.qualifyingWorkout,
    improvementRatio: input.improvementRatio,
  });
}

/** @deprecated v0.3 progression bonuses sum by distinct exercise, capped at 30/day. */
export const calculateDailyPerformanceXp = calculateDailyProgressionXp;
