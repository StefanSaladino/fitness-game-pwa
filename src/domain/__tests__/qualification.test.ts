import { describe, expect, it } from 'vitest';
import { qualifiesCardioBonusActivity, qualifiesLiftingWorkout, qualifiesWorkout } from '../workouts/qualification';
import type { WorkoutQualificationInput } from '../types';

const base = (overrides: Partial<WorkoutQualificationInput>): WorkoutQualificationInput => ({
  category: 'STRENGTH',
  status: 'COMPLETED',
  source: 'IN_APP',
  activeDurationSeconds: 15 * 60,
  ...overrides,
});

const working = (count: number) => Array.from({ length: count }, () => ({
  setType: 'WORKING' as const,
  completed: true,
  reps: 8,
}));

describe('lifting qualification', () => {
  it('qualifies at 15 minutes and four completed working sets', () => {
    expect(qualifiesLiftingWorkout(base({ strengthSets: working(4) }))).toBe(true);
  });

  it('fails below either lifting boundary', () => {
    expect(qualifiesLiftingWorkout(base({ activeDurationSeconds: 899, strengthSets: working(4) }))).toBe(false);
    expect(qualifiesLiftingWorkout(base({ strengthSets: working(3) }))).toBe(false);
  });

  it('does not count warmups, zero-rep sets, or incomplete sets', () => {
    expect(qualifiesLiftingWorkout(base({
      strengthSets: [
        ...working(3),
        { setType: 'WARMUP', completed: true, reps: 8 },
        { setType: 'WORKING', completed: true, reps: 0 },
        { setType: 'WORKING', completed: false, reps: 8 },
      ],
    }))).toBe(false);
  });

  it('does not require external weight for bodyweight working sets', () => {
    expect(qualifiesLiftingWorkout(base({ strengthSets: working(4) }))).toBe(true);
  });

  it('never treats cardio as a lifting workout', () => {
    expect(qualifiesLiftingWorkout(base({ category: 'RUNNING', activeDurationSeconds: 90 * 60 }))).toBe(false);
  });
});

describe('cardio bonus qualification', () => {
  it.each([
    ['RUNNING', 15 * 60],
    ['WALKING_HIKING', 30 * 60],
    ['CYCLING', 20 * 60],
    ['SWIMMING', 15 * 60],
    ['SPORT', 20 * 60],
    ['CARDIO', 20 * 60],
    ['HIIT', 12 * 60],
  ] as const)('%s uses its minimum duration', (category, threshold) => {
    expect(qualifiesCardioBonusActivity(base({ category, activeDurationSeconds: threshold - 1, strengthSets: undefined }))).toBe(false);
    expect(qualifiesCardioBonusActivity(base({ category, activeDurationSeconds: threshold, strengthSets: undefined }))).toBe(true);
  });

  it('does not award cardio eligibility to mobility or other', () => {
    expect(qualifiesCardioBonusActivity(base({ category: 'MOBILITY', activeDurationSeconds: 60 * 60 }))).toBe(false);
    expect(qualifiesCardioBonusActivity(base({ category: 'OTHER', activeDurationSeconds: 60 * 60 }))).toBe(false);
  });

  it('requires a completed non-review activity', () => {
    expect(qualifiesCardioBonusActivity(base({ category: 'RUNNING', status: 'IN_PROGRESS', activeDurationSeconds: 60 * 60 }))).toBe(false);
    expect(qualifiesCardioBonusActivity(base({ category: 'RUNNING', activeDurationSeconds: 6 * 60 * 60 + 1 }))).toBe(false);
  });

  it('generic qualification is now scoring eligibility, not generic exercise participation', () => {
    expect(qualifiesWorkout(base({ strengthSets: working(4) }))).toBe(true);
    expect(qualifiesWorkout(base({ category: 'RUNNING', activeDurationSeconds: 15 * 60 }))).toBe(true);
    expect(qualifiesWorkout(base({ category: 'MOBILITY', activeDurationSeconds: 30 * 60 }))).toBe(false);
  });
});
