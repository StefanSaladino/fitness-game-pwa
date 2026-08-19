import { LIFTING_WORKOUT_XP } from '../config';

export function calculateDailyLiftingWorkoutXp(qualifyingLiftingWorkoutCount: number): number {
  if (!Number.isFinite(qualifyingLiftingWorkoutCount) || qualifyingLiftingWorkoutCount <= 0) return 0;
  return LIFTING_WORKOUT_XP;
}

/** @deprecated v0.3 uses lifting-workout XP rather than generic base-workout XP. */
export function calculateDailyBaseWorkoutXp(qualifyingLiftingWorkoutCount: number): number {
  return calculateDailyLiftingWorkoutXp(qualifyingLiftingWorkoutCount);
}
