import { describe, expect, it } from 'vitest';
import type { LiftingCalendarSummary } from './model';
import { buildLiftingCalendarAnalytics } from './liftingCalendarAnalytics';

const rows: LiftingCalendarSummary[] = [
  { periodKind: 'MONTH', periodStart: '2026-07-01', periodEnd: '2026-07-31', completedLiftingSessions: 8, exerciseCount: 9, completedWorkingSets: 88, volumeKgReps: 42000, prCount: 3 },
  { periodKind: 'WEEK', periodStart: '2026-08-10', periodEnd: '2026-08-16', completedLiftingSessions: 2, exerciseCount: 6, completedWorkingSets: 24, volumeKgReps: 11200, prCount: 1 },
  { periodKind: 'MONTH', periodStart: '2026-08-01', periodEnd: '2026-08-31', completedLiftingSessions: 10, exerciseCount: 11, completedWorkingSets: 104, volumeKgReps: 48750, prCount: 5 },
  { periodKind: 'WEEK', periodStart: '2026-08-17', periodEnd: '2026-08-23', completedLiftingSessions: 3, exerciseCount: 7, completedWorkingSets: 31, volumeKgReps: 13950, prCount: 2 },
];

describe('lifting calendar analytics', () => {
  it('orders weekly/monthly buckets and derives current-versus-previous trend deltas', () => {
    const analytics = buildLiftingCalendarAnalytics(rows);

    expect(analytics.weekly.map((row) => row.periodStart)).toEqual(['2026-08-10', '2026-08-17']);
    expect(analytics.monthly.map((row) => row.periodStart)).toEqual(['2026-07-01', '2026-08-01']);
    expect(analytics.currentWeek?.completedLiftingSessions).toBe(3);
    expect(analytics.weekDelta).toEqual({
      completedLiftingSessions: 1,
      exerciseCount: 1,
      completedWorkingSets: 7,
      volumeKgReps: 2750,
      prCount: 1,
    });
    expect(analytics.monthDelta.volumeKgReps).toBe(6750);
    expect(analytics.monthDelta.prCount).toBe(2);
  });

  it('returns null deltas when there is no previous calendar bucket', () => {
    const analytics = buildLiftingCalendarAnalytics([rows[3]!]);
    expect(analytics.currentWeek?.periodStart).toBe('2026-08-17');
    expect(analytics.previousWeek).toBeNull();
    expect(analytics.weekDelta.completedLiftingSessions).toBeNull();
    expect(analytics.currentMonth).toBeNull();
  });
});
