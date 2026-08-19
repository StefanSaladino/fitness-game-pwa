import { describe, expect, it } from 'vitest';
import {
  calculateDailyCardioBonusXp,
  calculateDailyExerciseXp,
  calculateDailyLiftingWorkoutXp,
  calculateDailyProgressionXp,
  qualifiesLiftingWorkout,
} from '..';

const strength = (weightKg: number) => ({
  category: 'STRENGTH' as const,
  status: 'COMPLETED' as const,
  source: 'IN_APP' as const,
  activeDurationSeconds: 20 * 60,
  strengthSets: Array.from({ length: 4 }, () => ({ setType: 'WORKING' as const, completed: true, reps: 8, weightKg })),
});

describe('lifting-v1 fairness invariants', () => {
  it('raw strength does not change workout-completion XP eligibility', () => {
    expect(qualifiesLiftingWorkout(strength(20))).toBe(true);
    expect(qualifiesLiftingWorkout(strength(140))).toBe(true);
    expect(calculateDailyLiftingWorkoutXp(1)).toBe(50);
  });

  it('additional same-day lifting workouts cannot increase lifting-workout XP', () => {
    for (let count = 1; count <= 100; count += 1) {
      expect(calculateDailyLiftingWorkoutXp(count)).toBe(50);
    }
  });

  it('exercise padding is capped and duplicate canonical exercises score once', () => {
    expect(calculateDailyExerciseXp([
      { exerciseId: 'bench', completedWorkingSetCount: 2 },
      { exerciseId: 'bench', completedWorkingSetCount: 10 },
      ...Array.from({ length: 20 }, (_, index) => ({ exerciseId: `other-${index}`, completedWorkingSetCount: 2 })),
    ])).toBe(30);
  });

  it('progression and cardio are independently capped', () => {
    expect(calculateDailyProgressionXp([15, 15, 15, 15])).toBe(30);
    expect(calculateDailyCardioBonusXp([
      { category: 'RUNNING', status: 'COMPLETED', source: 'IN_APP', activeDurationSeconds: 45 * 60 },
      { category: 'CYCLING', status: 'COMPLETED', source: 'IN_APP', activeDurationSeconds: 3 * 60 * 60 },
    ])).toBe(15);
  });
});
