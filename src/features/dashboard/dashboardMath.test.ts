import { describe, expect, it } from 'vitest';
import { scoringDateInTimezone, summarizeScoringEvents, uniqueScoringDayCount, weekBoundsForScoringDate } from './dashboardMath';

describe('dashboard math', () => {
  it('derives Monday-Sunday bounds from a scoring date', () => {
    expect(weekBoundsForScoringDate('2026-08-19')).toEqual({ weekStart: '2026-08-17', weekEnd: '2026-08-23' });
    expect(weekBoundsForScoringDate('2026-08-23')).toEqual({ weekStart: '2026-08-17', weekEnd: '2026-08-23' });
  });

  it('uses the profile timezone when resolving the scoring date', () => {
    const now = new Date('2026-08-20T02:30:00.000Z');
    expect(scoringDateInTimezone(now, 'America/Toronto')).toBe('2026-08-19');
  });

  it('counts unique lifting dates rather than sessions', () => {
    expect(uniqueScoringDayCount(['2026-08-17', '2026-08-17', '2026-08-19'])).toBe(2);
  });

  it('sums lifting-v1 categories without letting cardio change categories', () => {
    expect(summarizeScoringEvents([
      { eventType: 'LIFTING_WORKOUT', amount: 50 },
      { eventType: 'EXERCISE_COMPLETE', amount: 25 },
      { eventType: 'EXERCISE_PROGRESS', amount: 10 },
      { eventType: 'CARDIO_BONUS', amount: 5 },
    ])).toEqual({
      weeklyXp: 90,
      breakdown: { workout: 50, exercises: 25, progression: 10, cardio: 5 },
    });
  });
});
