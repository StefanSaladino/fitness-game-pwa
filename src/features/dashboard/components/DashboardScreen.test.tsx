import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
};

describe('DashboardScreen', () => {
  it('renders lifting-first progress, PRs, group rank, and secondary cardio without template filler', () => {
    render(<DashboardScreen group={group} onSignOut={() => undefined} profile={profile} snapshot={snapshot} />);

    expect(screen.getByRole('heading', { name: 'Your lifting week' })).toBeInTheDocument();
    expect(screen.getByLabelText('2 of 4 lifting days complete')).toBeInTheDocument();
    expect(screen.getByText('90 XP this week')).toBeInTheDocument();
    expect(screen.getByText('Upper Push')).toBeInTheDocument();
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Stefan (You)')).toBeInTheDocument();
    expect(screen.getByText('Cardio bonus')).toBeInTheDocument();
    expect(screen.queryByText(/unlock your potential/i)).not.toBeInTheDocument();
  });
});
