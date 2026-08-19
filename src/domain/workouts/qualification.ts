import {
  CARDIO_BONUS_MIN_ACTIVE_SECONDS,
  MAX_AUTO_QUALIFY_ACTIVE_SECONDS,
  STRENGTH_MIN_ACTIVE_SECONDS,
  STRENGTH_MIN_WORKING_SETS,
} from '../config';
import type { CardioBonusCategory, StrengthSetInput, WorkoutQualificationInput } from '../types';

const cardioCategories = new Set<CardioBonusCategory>([
  'RUNNING',
  'WALKING_HIKING',
  'CYCLING',
  'SWIMMING',
  'SPORT',
  'CARDIO',
  'HIIT',
]);

export function countCompletedWorkingSets(sets: readonly StrengthSetInput[] = []): number {
  return sets.filter((set) => set.setType === 'WORKING' && set.completed && set.reps >= 1).length;
}

function hasValidCompletedDuration(workout: WorkoutQualificationInput): boolean {
  return workout.status === 'COMPLETED'
    && Number.isFinite(workout.activeDurationSeconds)
    && workout.activeDurationSeconds >= 0
    && workout.activeDurationSeconds <= MAX_AUTO_QUALIFY_ACTIVE_SECONDS;
}

export function qualifiesLiftingWorkout(workout: WorkoutQualificationInput): boolean {
  if (!hasValidCompletedDuration(workout) || workout.category !== 'STRENGTH') return false;
  if (workout.activeDurationSeconds < STRENGTH_MIN_ACTIVE_SECONDS) return false;
  return countCompletedWorkingSets(workout.strengthSets) >= STRENGTH_MIN_WORKING_SETS;
}

export function isCardioBonusCategory(category: WorkoutQualificationInput['category']): category is CardioBonusCategory {
  return cardioCategories.has(category as CardioBonusCategory);
}

export function qualifiesCardioBonusActivity(workout: WorkoutQualificationInput): boolean {
  if (!hasValidCompletedDuration(workout) || !isCardioBonusCategory(workout.category)) return false;
  return workout.activeDurationSeconds >= CARDIO_BONUS_MIN_ACTIVE_SECONDS[workout.category];
}

/**
 * Transitional compatibility helper. v0.3 callers should prefer the explicit lifting/cardio functions.
 * Mobility/Other are trackable history but do not qualify for XP.
 */
export function qualifiesWorkout(workout: WorkoutQualificationInput): boolean {
  return qualifiesLiftingWorkout(workout) || qualifiesCardioBonusActivity(workout);
}
