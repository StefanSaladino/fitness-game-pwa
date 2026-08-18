import { describe, expect, it } from 'vitest';
import { calculateDailyBaseWorkoutXp, qualifiesWorkout } from '..';

const strength = (weightKg: number) => ({
  category: 'STRENGTH' as const,
  status: 'COMPLETED' as const,
  source: 'IN_APP' as const,
  activeDurationSeconds: 20 * 60,
  strengthSets: Array.from({ length: 4 }, () => ({ setType: 'WORKING' as const, completed: true, reps: 8, weightKg })),
});

describe('fairness invariants', () => {
  it('raw strength does not change base XP eligibility', () => {
    expect(qualifiesWorkout(strength(20))).toBe(true);
    expect(qualifiesWorkout(strength(140))).toBe(true);
    expect(calculateDailyBaseWorkoutXp(1)).toBe(100);
  });

  it('additional same-day qualifying workouts cannot increase base XP', () => {
    for (let count = 1; count <= 100; count += 1) {
      expect(calculateDailyBaseWorkoutXp(count)).toBe(100);
    }
  });
});
