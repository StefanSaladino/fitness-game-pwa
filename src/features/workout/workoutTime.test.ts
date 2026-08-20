import { describe, expect, it } from 'vitest';
import { elapsedWorkoutSeconds, formatWorkoutDuration } from './workoutTime';

describe('workout time', () => {
  it('derives a running timer from persisted accumulated time plus last resume time', () => {
    expect(elapsedWorkoutSeconds(
      { activeDurationSeconds: 120, lastResumedAt: '2026-08-19T20:00:00.000Z', pausedAt: null },
      Date.parse('2026-08-19T20:32:12.000Z'),
    )).toBe(2052);
  });

  it('freezes the timer while persisted pause state has no last resume timestamp', () => {
    expect(elapsedWorkoutSeconds({ activeDurationSeconds: 845, lastResumedAt: null, pausedAt: '2026-08-19T20:14:05.000Z' }, Date.now())).toBe(845);
  });

  it('does not double-count wall-clock seconds when a paused response retains lastResumedAt', () => {
    expect(elapsedWorkoutSeconds(
      {
        activeDurationSeconds: 60,
        lastResumedAt: '2026-08-19T20:00:00.000Z',
        pausedAt: '2026-08-19T20:01:00.000Z',
      },
      Date.parse('2026-08-19T20:01:04.000Z'),
    )).toBe(60);
  });

  it('formats short and long sessions', () => {
    expect(formatWorkoutDuration(2052)).toBe('34:12');
    expect(formatWorkoutDuration(3723)).toBe('01:02:03');
  });
});
