import type { CardioBonusCategory } from './types';

export const SCORING_VERSION = 'lifting-v1' as const;

export const LIFTING_WORKOUT_XP = 50;
export const EXERCISE_COMPLETION_XP = 5;
export const MIN_WORKING_SETS_FOR_EXERCISE_XP = 2;
export const MAX_SCORING_EXERCISES_PER_DAY = 6;
export const MAX_DAILY_EXERCISE_XP = EXERCISE_COMPLETION_XP * MAX_SCORING_EXERCISES_PER_DAY;
export const MAX_PROGRESS_XP_PER_EXERCISE = 15;
export const MAX_DAILY_PROGRESSION_XP = 30;
export const MAX_DAILY_CARDIO_BONUS_XP = 15;
export const MAX_DAILY_XP = 125;
export const MAX_AUTO_QUALIFY_ACTIVE_SECONDS = 6 * 60 * 60;

export const STRENGTH_MIN_ACTIVE_SECONDS = 15 * 60;
export const STRENGTH_MIN_WORKING_SETS = 4;

export const CARDIO_BONUS_MIN_ACTIVE_SECONDS: Readonly<Record<CardioBonusCategory, number>> = Object.freeze({
  RUNNING: 15 * 60,
  WALKING_HIKING: 30 * 60,
  CYCLING: 20 * 60,
  SWIMMING: 15 * 60,
  SPORT: 20 * 60,
  CARDIO: 20 * 60,
  HIIT: 12 * 60,
});
