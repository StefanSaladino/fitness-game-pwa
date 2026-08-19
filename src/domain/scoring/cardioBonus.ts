import { MAX_DAILY_CARDIO_BONUS_XP } from '../config';
import type { WorkoutQualificationInput } from '../types';
import { qualifiesCardioBonusActivity } from '../workouts/qualification';

export function cardioBonusForActivity(workout: WorkoutQualificationInput): number {
  if (!qualifiesCardioBonusActivity(workout)) return 0;
  if (workout.activeDurationSeconds >= 45 * 60) return 15;
  if (workout.activeDurationSeconds >= 30 * 60) return 10;
  return 5;
}

export function calculateDailyCardioBonusXp(workouts: readonly WorkoutQualificationInput[]): number {
  const best = workouts.reduce((highest, workout) => Math.max(highest, cardioBonusForActivity(workout)), 0);
  return Math.min(MAX_DAILY_CARDIO_BONUS_XP, best);
}
