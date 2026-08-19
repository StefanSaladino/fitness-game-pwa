import {
  EXERCISE_COMPLETION_XP,
  MAX_DAILY_EXERCISE_XP,
  MAX_SCORING_EXERCISES_PER_DAY,
  MIN_WORKING_SETS_FOR_EXERCISE_XP,
} from '../config';
import type { ExerciseCompletionInput } from '../types';

export function qualifiesExerciseForCompletionXp(exercise: ExerciseCompletionInput): boolean {
  return exercise.exerciseId.trim().length > 0
    && Number.isFinite(exercise.completedWorkingSetCount)
    && exercise.completedWorkingSetCount >= MIN_WORKING_SETS_FOR_EXERCISE_XP;
}

export function countScoringExercises(exercises: readonly ExerciseCompletionInput[]): number {
  const unique = new Set(
    exercises
      .filter(qualifiesExerciseForCompletionXp)
      .map((exercise) => exercise.exerciseId.trim()),
  );
  return Math.min(MAX_SCORING_EXERCISES_PER_DAY, unique.size);
}

export function calculateDailyExerciseXp(exercises: readonly ExerciseCompletionInput[]): number {
  return Math.min(MAX_DAILY_EXERCISE_XP, countScoringExercises(exercises) * EXERCISE_COMPLETION_XP);
}
