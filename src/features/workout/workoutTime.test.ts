import { describe, expect, it } from 'vitest';
import { elapsedWorkoutSeconds, formatWorkoutDuration } from './workoutTime';

describe('workout time', () => {
  it('derives a running timer from persisted accumulated time plus last resume time', () => {
    expect(elapsedWorkoutSeconds(
      { activeDurationSeconds: 120, lastResumedAt: '2026-08-19T20:00:00.000Z' },
      Date.parse('2026-08-19T20:32:12.000Z'),
    )).toBe(2052);
  });

  it('freezes the timer while persisted pause state has no last resume timestamp', () => {
    expect(elapsedWorkoutSeconds({ activeDurationSeconds: 845, lastResumedAt: null }, Date.now())).toBe(845);
  });

  it('formats short and long sessions', () => {
    expect(formatWorkoutDuration(2052)).toBe('34:12');
    expect(formatWorkoutDuration(3723)).toBe('01:02:03');
  });
});
