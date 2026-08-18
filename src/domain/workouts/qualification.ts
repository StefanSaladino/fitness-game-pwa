import { WORKOUT_QUALIFICATION_RULES } from '../config';
import type { StrengthSetInput, WorkoutQualificationInput } from '../types';

export function countCompletedWorkingSets(sets: readonly StrengthSetInput[] = []): number {
  return sets.filter((set) => set.setType === 'WORKING' && set.completed && set.reps >= 1).length;
}

export function qualifiesWorkout(workout: WorkoutQualificationInput): boolean {
  if (workout.status !== 'COMPLETED') return false;
  if (!Number.isFinite(workout.activeDurationSeconds) || workout.activeDurationSeconds < 0) return false;

  const rule = WORKOUT_QUALIFICATION_RULES[workout.category];
  if (workout.activeDurationSeconds < rule.minActiveSeconds) return false;

  if (workout.category === 'STRENGTH') {
    return countCompletedWorkingSets(workout.strengthSets) >= (rule.minWorkingSets ?? 0);
  }

  return true;
}
