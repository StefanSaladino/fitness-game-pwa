import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LiftingBadgeProgressService } from '../../consistency';
import type { GroupSummary } from '../../groups';
import type { OnboardingProfile } from '../../onboarding';
import type { GroupCompetitionLeaderboard } from '../model';
import { GroupSocialScreen } from './GroupSocialScreen';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00Z', preferredWeightUnit: 'KG',
};

const group: GroupSummary = {
  id: 'group-1', name: 'Iron Crew', memberCount: 2, role: 'OWNER',
  joinedAt: '2026-08-18T00:00:00Z', createdAt: '2026-08-18T00:00:00Z',
};

const weekly: GroupCompetitionLeaderboard = {
  period: 'WEEK', periodStart: '2026-08-17', periodEnd: '2026-08-23',
  entries: [{
    rank: 1, userId: 'user-1', username: 'stefan', displayName: 'Stefan', profilePictureUrl: null,
    xp: 175, liftingDays: 3, prCount: 2, badgeCount: 1, isCurrentUser: true,
  }],
};

const badgeProgressService: LiftingBadgeProgressService = {
  load: vi.fn().mockResolvedValue({
    prCount: 4,
    liftingDayCount: 7,
    goalsHit: 1,
    bestCompletedWeekStreak: 2,
    cardioBonusDayCount: 3,
    badges: [{ badgeKey: 'GOAL_STREAK_2', earnedAt: '2026-08-17T04:00:00.000Z' }],
  }),
};

describe('competition badge placement', () => {
  it('keeps badges in the Compete tabs, updates URL intent, and shows persisted progress', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/compete');

    const { container } = render(
      <GroupSocialScreen
        badgeProgressService={badgeProgressService}
        busyReactionKey={null}
        error=""
        feed={[]}
        group={group}
        groups={[group]}
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        onNavigate={vi.fn()}
        onReact={vi.fn()}
        onSelectGroup={vi.fn()}
        onShowGlobal={vi.fn()}
        onSignOut={vi.fn()}
        profile={profile}
        weekly={weekly}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Standings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Badges' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Badge collection' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Badges' }));

    expect(await screen.findByRole('heading', { name: 'Badge collection' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-badge-key]')).toHaveLength(14);
    expect(screen.getByText('4 / 5 PRs')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '5 PRs progress' })).toHaveAttribute('aria-valuenow', '4');
    expect(window.location.pathname).toBe('/compete');
    expect(window.location.search).toBe('?view=badges');
  });
});
