import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardService } from '../dashboardService';
import type { DashboardSnapshot } from '../model';
import { useDashboard } from './useDashboard';

const snapshot: DashboardSnapshot = {
  weekStart: '2026-08-17',
  weekEnd: '2026-08-23',
  weeklyTarget: 4,
  completedLiftingDays: 2,
  completedLiftingDates: ['2026-08-17', '2026-08-19'],
  weeklyXp: 90,
  xpBreakdown: { workout: 50, exercises: 25, progression: 10, cardio: 5 },
  recentLifts: [],
  recentPrs: [],
  leaderboard: [],
  currentUserProfilePictureUrl: null,
  consistency: {
    currentWeekStart: '2026-08-17', currentWeekTarget: 4, currentWeekLiftingDays: 2,
    currentCompletedWeekStreak: 2, bestCompletedWeekStreak: 3, completedWeeks: 4, goalsHit: 3,
    recentWeeks: [], badges: [],
  },
};

describe('useDashboard', () => {
  it('loads persisted dashboard state through the service boundary', async () => {
    const load = vi.fn(async () => snapshot);
    const service: DashboardService = { load };
    const input = { userId: 'user-1', timezone: 'America/Toronto', weeklyTarget: 4, groupId: 'group-1' };

    const { result } = renderHook(() => useDashboard(input, service));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.snapshot).toEqual(snapshot);
    expect(load).toHaveBeenCalledWith(input);
  });
});
