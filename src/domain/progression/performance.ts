import {
  ACCOUNT_PERFORMANCE_UNLOCK_HOURS,
  MAX_DAILY_PERFORMANCE_XP,
  REQUIRED_BENCHMARK_CALIBRATION_OBSERVATIONS,
} from '../config';

const HOUR_MS = 60 * 60 * 1000;
const EPSILON = 1e-12;

export function isAccountPerformanceEligible(onboardingCompletedAt: Date, observationAt: Date): boolean {
  const elapsedMs = observationAt.getTime() - onboardingCompletedAt.getTime();
  return Number.isFinite(elapsedMs) && elapsedMs >= ACCOUNT_PERFORMANCE_UNLOCK_HOURS * HOUR_MS;
}

/** Improvement expressed as a ratio: 0.01 = 1%, 0.05 = 5%. */
export function performanceBonusForImprovementRatio(improvementRatio: number): number {
  if (!Number.isFinite(improvementRatio) || improvementRatio + EPSILON < 0.01) return 0;
  if (improvementRatio + EPSILON < 0.025) return 5;
  if (improvementRatio + EPSILON < 0.05) return 10;
  if (improvementRatio + EPSILON < 0.10) return 15;
  return MAX_DAILY_PERFORMANCE_XP;
}

export function relativeImprovementHigherIsBetter(previousBest: number, current: number): number {
  if (!Number.isFinite(previousBest) || !Number.isFinite(current) || previousBest <= 0 || current <= previousBest) return 0;
  return (current - previousBest) / previousBest;
}

export function relativeImprovementLowerIsBetter(previousBest: number, current: number): number {
  if (!Number.isFinite(previousBest) || !Number.isFinite(current) || previousBest <= 0 || current <= 0 || current >= previousBest) return 0;
  return (previousBest - current) / previousBest;
}

export interface PerformanceEligibilityInput {
  accountEligible: boolean;
  qualifyingWorkout: boolean;
  validPriorObservationCount: number;
  cooldownEligible: boolean;
  improvementRatio: number;
}

export function calculatePerformanceBonus(input: PerformanceEligibilityInput): number {
  if (!input.accountEligible || !input.qualifyingWorkout || !input.cooldownEligible) return 0;
  if (input.validPriorObservationCount < REQUIRED_BENCHMARK_CALIBRATION_OBSERVATIONS) return 0;
  return performanceBonusForImprovementRatio(input.improvementRatio);
}

export function calculateDailyPerformanceXp(bonuses: readonly number[]): number {
  const valid = bonuses.filter((bonus) => Number.isFinite(bonus) && bonus > 0);
  return Math.min(MAX_DAILY_PERFORMANCE_XP, valid.length ? Math.max(...valid) : 0);
}

export function estimatedOneRepMaxEpley(weightKg: number, reps: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps) || weightKg <= 0 || reps < 1 || reps > 12) return null;
  return weightKg * (1 + reps / 30);
}
