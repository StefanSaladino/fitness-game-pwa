import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingProfile } from '../../onboarding';
import type { GlobalAllTimeLeaderboard } from '../model';
import { GlobalAllTimeLeaderboardScreen } from './GlobalAllTimeLeaderboardScreen';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00Z', preferredWeightUnit: 'KG',
};
const top10 = Array.from({ length: 10 }, (_, index) => ({
  rank: index + 1,
  userId: index === 1 ? 'user-1' : `user-${index + 2}`,
  username: index === 1 ? 'stefan' : `athlete${index + 1}`,
  displayName: index === 1 ? 'Stefan' : `Athlete ${index + 1}`,
  profilePictureUrl: null,
  xp: 1000 - index * 50,
  liftingDays: 20 - index,
  prCount: 10 - Math.floor(index / 2),
  badgeCount: 5,
  isCurrentUser: index === 1,
}));
const leaderboard: GlobalAllTimeLeaderboard = {
  top10,
  currentUser: { ...top10[1]!, rank: 2, isCurrentUser: true },
};

describe('GlobalAllTimeLeaderboardScreen', () => {
  it('shows exactly the global Top 10 plus a detached current-user row even when duplicated', () => {
    render(<GlobalAllTimeLeaderboardScreen hasGroup leaderboard={leaderboard} onNavigate={vi.fn()} onShowGroup={vi.fn()} onSignOut={vi.fn()} profile={profile} />);

    expect(screen.getByRole('heading', { name: 'Global all-time' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Top 10 across Top Set' })).toBeInTheDocument();
    const board = screen.getByRole('list');
    expect(within(board).getAllByRole('listitem')).toHaveLength(10);
    const detached = screen.getByLabelText('Your global rank');
    expect(detached).toHaveTextContent('#2');
    expect(detached).toHaveTextContent('Stefan');
    expect(screen.getAllByText(/Stefan/).length).toBeGreaterThanOrEqual(2);
  });

  it('has no group-social actions and can return to weekly crew competition', async () => {
    const user = userEvent.setup();
    const onShowGroup = vi.fn();
    render(<GlobalAllTimeLeaderboardScreen hasGroup leaderboard={leaderboard} onNavigate={vi.fn()} onShowGroup={onShowGroup} onSignOut={vi.fn()} profile={profile} />);

    expect(screen.queryByRole('tab', { name: 'Activity' })).not.toBeInTheDocument();
    expect(screen.queryByText(/reactions/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /report/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/chat/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Crew weekly' }));
    expect(onShowGroup).toHaveBeenCalledTimes(1);
  });
});
