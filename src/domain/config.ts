import type { WorkoutCategory } from './types';

export const BASE_WORKOUT_XP = 100;
export const MAX_DAILY_BASE_XP = 100;
export const MAX_DAILY_PERFORMANCE_XP = 25;
export const MAX_DAILY_WORKOUT_XP = 125;
export const ACCOUNT_PERFORMANCE_UNLOCK_HOURS = 168;
export const REQUIRED_BENCHMARK_CALIBRATION_OBSERVATIONS = 2;
export const BENCHMARK_COOLDOWN_SCORING_DATES = 7;
export const MAX_WEEKLY_IMPROVEMENT_XP = 50;

export interface QualificationRule {
  minActiveSeconds: number;
  minWorkingSets?: number;
}

export const WORKOUT_QUALIFICATION_RULES: Readonly<Record<WorkoutCategory, QualificationRule>> = Object.freeze({
  STRENGTH: { minActiveSeconds: 15 * 60, minWorkingSets: 4 },
  RUNNING: { minActiveSeconds: 15 * 60 },
  WALKING_HIKING: { minActiveSeconds: 30 * 60 },
  CYCLING: { minActiveSeconds: 20 * 60 },
  SWIMMING: { minActiveSeconds: 15 * 60 },
  SPORT: { minActiveSeconds: 20 * 60 },
  CARDIO: { minActiveSeconds: 20 * 60 },
  HIIT: { minActiveSeconds: 12 * 60 },
  MOBILITY: { minActiveSeconds: 20 * 60 },
  OTHER: { minActiveSeconds: 20 * 60 },
});
