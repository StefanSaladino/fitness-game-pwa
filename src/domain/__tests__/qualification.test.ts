import { describe, expect, it } from 'vitest';
import { qualifiesWorkout } from '../workouts/qualification';
import type { WorkoutCategory, WorkoutQualificationInput } from '../types';

const base = (overrides: Partial<WorkoutQualificationInput>): WorkoutQualificationInput => ({
  category: 'RUNNING',
  status: 'COMPLETED',
  source: 'IN_APP',
  activeDurationSeconds: 15 * 60,
  ...overrides,
});

describe('workout qualification boundaries', () => {
  const cases: Array<[WorkoutCategory, number]> = [
    ['RUNNING', 15 * 60],
    ['WALKING_HIKING', 30 * 60],
    ['CYCLING', 20 * 60],
    ['SWIMMING', 15 * 60],
    ['SPORT', 20 * 60],
    ['CARDIO', 20 * 60],
    ['HIIT', 12 * 60],
    ['MOBILITY', 20 * 60],
    ['OTHER', 20 * 60],
  ];

  it.each(cases)('%s fails one second below and qualifies exactly at threshold', (category: WorkoutCategory, threshold: number) => {
    expect(qualifiesWorkout(base({ category, activeDurationSeconds: threshold - 1 }))).toBe(false);
    expect(qualifiesWorkout(base({ category, activeDurationSeconds: threshold }))).toBe(true);
  });

  it('requires a completed workout', () => {
    expect(qualifiesWorkout(base({ status: 'IN_PROGRESS' }))).toBe(false);
    expect(qualifiesWorkout(base({ status: 'CANCELLED' }))).toBe(false);
  });

  it.each(['MANUAL', 'IN_APP', 'EXTERNAL'] as const)('does not change qualification based on source: %s', (source: 'MANUAL' | 'IN_APP' | 'EXTERNAL') => {
    expect(qualifiesWorkout(base({ source }))).toBe(true);
  });
});

describe('strength qualification', () => {
  const working = (count: number) => Array.from({ length: count }, () => ({ setType: 'WORKING' as const, completed: true, reps: 8 }));

  it('qualifies at 15 minutes and four completed working sets', () => {
    expect(qualifiesWorkout(base({ category: 'STRENGTH', strengthSets: working(4) }))).toBe(true);
  });

  it('fails at 14:59 with four working sets', () => {
    expect(qualifiesWorkout(base({ category: 'STRENGTH', activeDurationSeconds: 899, strengthSets: working(4) }))).toBe(false);
  });

  it('fails at 15 minutes with only three working sets', () => {
    expect(qualifiesWorkout(base({ category: 'STRENGTH', strengthSets: working(3) }))).toBe(false);
  });

  it('does not count warmups, zero-rep sets, or incomplete sets', () => {
    const strengthSets = [
      ...working(3),
      { setType: 'WARMUP' as const, completed: true, reps: 8 },
      { setType: 'WORKING' as const, completed: true, reps: 0 },
      { setType: 'WORKING' as const, completed: false, reps: 8 },
    ];
    expect(qualifiesWorkout(base({ category: 'STRENGTH', strengthSets }))).toBe(false);
  });

  it('does not require weight for valid bodyweight working sets', () => {
    expect(qualifiesWorkout(base({ category: 'STRENGTH', strengthSets: working(4) }))).toBe(true);
  });
});
