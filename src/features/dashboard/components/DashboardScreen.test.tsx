import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GroupSummary } from '../../groups';
import type { OnboardingProfile } from '../../onboarding';
import type { DashboardSnapshot } from '../model';
import { DashboardScreen } from './DashboardScreen';

const profile: OnboardingProfile = {
  id: 'user-1',
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-18T00:00:00.000Z',
  preferredWeightUnit: 'KG',
};

const group: GroupSummary = {
  id: 'group-1',
  name: 'The Iron Crew',
  memberCount: 2,
  role: 'OWNER',
  joinedAt: '2026-08-18T00:00:00.000Z',
  createdAt: '2026-08-18T00:00:00.000Z',
};

const snapshot: DashboardSnapshot = {
  weekStart: '2026-08-17',
  weekEnd: '2026-08-23',
  weeklyTarget: 4,
  completedLiftingDays: 2,
  completedLiftingDates: ['2026-08-17', '2026-08-19'],
  weeklyXp: 90,
  xpBreakdown: { workout: 50, exercises: 25, progression: 10, cardio: 5 },
  currentUserProfilePictureUrl: null,
  recentLifts: [{
    id: 'lift-1', title: 'Upper Push', scoringDate: '2026-08-19', startedAt: '2026-08-19T21:00:00.000Z', durationMinutes: 62, exerciseCount: 5, xp: 90,
  }],
  recentPrs: [{
    exerciseId: 'bench', exerciseName: 'Bench Press', metricType: 'E1RM', bestValue: 111, bestWeightKg: 90, bestReps: 7, achievedAt: '2026-08-19T22:00:00.000Z',
  }],
  leaderboard: [
    { rank: 1, userId: 'user-2', username: 'alex', displayName: 'Alex', profilePictureUrl: null, xp: 110, isCurrentUser: false },
    { rank: 2, userId: 'user-1', username: 'stefan', displayName: 'Stefan', profilePictureUrl: null, xp: 90, isCurrentUser: true },
  ],
  consistency: {
    currentWeekStart: '2026-08-17', currentWeekTarget: 4, currentWeekLiftingDays: 2,
    currentCompletedWeekStreak: 2, bestCompletedWeekStreak: 3, completedWeeks: 4, goalsHit: 3,
    recentWeeks: [{ weekStart: '2026-08-10', target: 4, liftingDays: 4, achieved: true }],
    badges: [{ badgeKey: 'GOAL_STREAK_2', earnedAt: '2026-08-17T04:00:00.000Z' }],
  },
};

describe('DashboardScreen', () => {
  it('renders lifting-first progress, PRs, group rank, and secondary cardio without template filler', () => {
    const onNavigate = vi.fn();
    render(<DashboardScreen group={group} onNavigate={onNavigate} onSignOut={() => undefined} profile={profile} snapshot={snapshot} />);

    expect(screen.getByRole('heading', { name: 'Your lifting week' })).toBeInTheDocument();
    expect(screen.getByLabelText('2 of 4 lifting days complete')).toBeInTheDocument();
    expect(screen.getByText('90 XP this week')).toBeInTheDocument();
    expect(screen.getByText('Upper Push')).toBeInTheDocument();
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Stefan (You)')).toBeInTheDocument();
    expect(screen.getByText('Cardio bonus')).toBeInTheDocument();
    expect(screen.getByText('2 wk')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Completed weeks & badges' })).toBeInTheDocument();
    expect(screen.getByText('2-Week Streak')).toBeInTheDocument();
    expect(screen.getByText(/never add XP/i)).toBeInTheDocument();
    expect(screen.queryByText(/unlock your potential/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start Lift' }));
    expect(onNavigate).toHaveBeenCalledWith('workouts');
  });
});
