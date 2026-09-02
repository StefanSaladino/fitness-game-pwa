import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GroupSummary } from '../../groups';
import type { OnboardingProfile } from '../../onboarding';
import type { UserReportService } from '../../moderation';
import type { GroupCompetitionLeaderboard, GroupSocialFeedItem } from '../model';
import { GroupSocialScreen } from './GroupSocialScreen';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00Z', preferredWeightUnit: 'KG',
};
const group: GroupSummary = { id: 'group-1', name: 'Iron Crew', memberCount: 2, role: 'OWNER', joinedAt: '2026-08-18T00:00:00Z', createdAt: '2026-08-18T00:00:00Z' };
const secondGroup: GroupSummary = { id: 'group-2', name: 'Sunday Crew', memberCount: 5, role: 'MEMBER', joinedAt: '2026-08-19T00:00:00Z', createdAt: '2026-08-19T00:00:00Z' };
const weekly: GroupCompetitionLeaderboard = {
  period: 'WEEK', periodStart: '2026-08-17', periodEnd: '2026-08-23',
  entries: [
    { rank: 1, userId: 'user-1', username: 'stefan', displayName: 'Stefan', profilePictureUrl: null, xp: 175, liftingDays: 3, prCount: 2, badgeCount: 4, isCurrentUser: true },
    { rank: 2, userId: 'user-2', username: 'alex', displayName: 'Alex', profilePictureUrl: null, xp: 120, liftingDays: 2, prCount: 1, badgeCount: 3, isCurrentUser: false },
  ],
};
const feed: GroupSocialFeedItem[] = [{
  activityKey: 'PR:opaque', activityType: 'PR', activityAt: new Date().toISOString(), actorUserId: 'user-2', username: 'alex', displayName: 'Alex', profilePictureUrl: null,
  metadata: { exerciseName: 'Bench Press', metricType: 'E1RM', metricValue: 120, previousBest: 115, weightKg: 100, reps: 6, scoringDate: '2026-08-20' },
  reactions: { FIRE: 2, STRONG: 0, CLAP: 0 }, myReaction: null,
}];

function renderScreen(options: { reportService?: UserReportService; onShowGlobal?: () => void; onReact?: (activityKey: string, reaction: 'FIRE' | 'STRONG' | 'CLAP') => void; onSelectGroup?: (id: string) => void } = {}) {
  window.history.replaceState({}, '', '/compete');
  return render(
    <GroupSocialScreen
      busyReactionKey={null} error="" feed={feed} group={group} groups={[group, secondGroup]} hasMore={false}
      loadingMore={false} onLoadMore={vi.fn()} onNavigate={vi.fn()} onReact={options.onReact ?? vi.fn()}
      onSelectGroup={options.onSelectGroup ?? vi.fn()} onShowGlobal={options.onShowGlobal ?? vi.fn()} onSignOut={vi.fn()}
      profile={profile} reportService={options.reportService} weekly={weekly}
    />,
  );
}

describe('GroupSocialScreen', () => {
  it('keeps crew competition weekly-only and delegates global navigation', async () => {
    const user = userEvent.setup();
    const onReact = vi.fn();
    const onSelectGroup = vi.fn();
    const onShowGlobal = vi.fn();
    renderScreen({ onReact, onSelectGroup, onShowGlobal });

    expect(screen.getByRole('heading', { name: 'Crew standings' })).toBeInTheDocument();
    expect(within(screen.getByLabelText('Your leaderboard standing')).getByText('175 XP')).toBeInTheDocument();
    expect(screen.getByText(/Individual sets, workout notes, and full exercise details stay private/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All time' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Competition group' }));
    await user.click(screen.getByRole('option', { name: /Sunday Crew/i }));
    expect(onSelectGroup).toHaveBeenCalledWith('group-2');

    await user.click(screen.getByRole('button', { name: 'Global all-time' }));
    expect(onShowGlobal).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('tab', { name: 'Activity' }));
    expect(screen.getByRole('heading', { name: 'Highlights, not surveillance' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bench Press' })).toBeInTheDocument();
    expect(screen.getByText('100 kg × 6 · e1RM 120 kg')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Fire 2/i }));
    expect(onReact).toHaveBeenCalledWith('PR:opaque', 'FIRE');
  });

  it('offers quiet report controls only within the group social experience', async () => {
    const user = userEvent.setup();
    const reportService: UserReportService = { submit: vi.fn().mockResolvedValue({ caseId: 'case-id' }) };
    renderScreen({ reportService });

    expect(screen.queryByRole('button', { name: /report stefan/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Report Alex' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Activity' }));
    await user.click(screen.getByRole('button', { name: 'Report this activity' }));
    await user.type(screen.getByLabelText('What happened?'), 'This visible group activity needs moderator review.');
    await user.click(screen.getByRole('button', { name: 'Submit report' }));

    expect(reportService.submit).toHaveBeenCalledWith(expect.objectContaining({
      targetUserId: 'user-2',
      reference: { type: 'SOCIAL_ACTIVITY', groupId: 'group-1', activityKey: 'PR:opaque' },
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('private moderation queue');
  });
});
