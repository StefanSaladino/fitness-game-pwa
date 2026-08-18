import { BASE_WORKOUT_XP } from '../config';

export function calculateDailyBaseWorkoutXp(qualifyingWorkoutCount: number): number {
  if (!Number.isFinite(qualifyingWorkoutCount) || qualifyingWorkoutCount <= 0) return 0;
  return BASE_WORKOUT_XP;
}
