import { describe, expect, it } from 'vitest';
import { calculateDailyExerciseXp, countScoringExercises, qualifiesExerciseForCompletionXp } from '../scoring/exerciseXp';

describe('exercise completion XP', () => {
  it('requires two completed working sets for an exercise to score', () => {
    expect(qualifiesExerciseForCompletionXp({ exerciseId: 'bench', completedWorkingSetCount: 1 })).toBe(false);
    expect(qualifiesExerciseForCompletionXp({ exerciseId: 'bench', completedWorkingSetCount: 2 })).toBe(true);
  });

  it('counts a canonical exercise only once per day', () => {
    const exercises = [
      { exerciseId: 'bench', completedWorkingSetCount: 3 },
      { exerciseId: 'bench', completedWorkingSetCount: 4 },
      { exerciseId: 'squat', completedWorkingSetCount: 2 },
    ];
    expect(countScoringExercises(exercises)).toBe(2);
    expect(calculateDailyExerciseXp(exercises)).toBe(10);
  });

  it('caps exercise XP at six exercises / 30 XP per day', () => {
    const exercises = Array.from({ length: 20 }, (_, index) => ({ exerciseId: `exercise-${index}`, completedWorkingSetCount: 3 }));
    expect(countScoringExercises(exercises)).toBe(6);
    expect(calculateDailyExerciseXp(exercises)).toBe(30);
  });
});
