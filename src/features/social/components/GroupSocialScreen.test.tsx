import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GroupSummary } from '../../groups';
import type { OnboardingProfile } from '../../onboarding';
import type { GroupCompetitionLeaderboard, GroupSocialFeedItem } from '../model';
import type { UserReportService } from '../../moderation';
import { GroupSocialScreen } from './GroupSocialScreen';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00Z',
  preferredWeightUnit: 'KG',
};
const group: GroupSummary = { id: 'group-1', name: 'Iron Crew', memberCount: 2, role: 'OWNER', joinedAt: '2026-08-18T00:00:00Z', createdAt: '2026-08-18T00:00:00Z' };
const weekly: GroupCompetitionLeaderboard = { period: 'WEEK', periodStart: '2026-08-17', periodEnd: '2026-08-23', entries: [
  { rank: 1, userId: 'user-1', username: 'stefan', displayName: 'Stefan', profilePictureUrl: null, xp: 175, liftingDays: 3, prCount: 2, badgeCount: 4, isCurrentUser: true },
  { rank: 2, userId: 'user-2', username: 'alex', displayName: 'Alex', profilePictureUrl: null, xp: 120, liftingDays: 2, prCount: 1, badgeCount: 3, isCurrentUser: false },
] };
const allTime: GroupCompetitionLeaderboard = { period: 'ALL_TIME', periodStart: null, periodEnd: null, entries: [
  { rank: 1, userId: 'user-2', username: 'alex', displayName: 'Alex', profilePictureUrl: null, xp: 1200, liftingDays: 20, prCount: 8, badgeCount: 7, isCurrentUser: false },
  { rank: 2, userId: 'user-1', username: 'stefan', displayName: 'Stefan', profilePictureUrl: null, xp: 900, liftingDays: 16, prCount: 7, badgeCount: 6, isCurrentUser: true },
] };
const feed: GroupSocialFeedItem[] = [{
  activityKey: 'PR:opaque', activityType: 'PR', activityAt: new Date().toISOString(), actorUserId: 'user-2', username: 'alex', displayName: 'Alex', profilePictureUrl: null,
  metadata: { exerciseName: 'Bench Press', metricType: 'E1RM', metricValue: 120, previousBest: 115, weightKg: 100, reps: 6, scoringDate: '2026-08-20' },
  reactions: { FIRE: 2, STRONG: 0, CLAP: 0 }, myReaction: null,
}];

describe('GroupSocialScreen', () => {
  it('shows privacy-safe competition, toggles periods, and delegates reactions', async () => {
    const user = userEvent.setup();
    const onReact = vi.fn();
    render(<GroupSocialScreen
      allTime={allTime} busyReactionKey={null} error="" feed={feed} group={group} groups={[group]} hasMore={false}
      loadingMore={false} onLoadMore={vi.fn()} onNavigate={vi.fn()} onReact={onReact} onSelectGroup={vi.fn()}
      onSignOut={vi.fn()} profile={profile} weekly={weekly}
    />);

    expect(screen.getByRole('heading', { name: 'Crew standings' })).toBeInTheDocument();
    expect(screen.getByText(/Individual sets, workout notes, and full exercise details stay private/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Highlights, not surveillance' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bench Press' })).toBeInTheDocument();
    expect(screen.getByText('100 kg × 6 · e1RM 120 kg')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All time' }));
    expect(screen.getByText('1200 XP')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Fire 2/i }));
    expect(onReact).toHaveBeenCalledWith('PR:opaque', 'FIRE');
  });

  it('offers report controls for other users and attaches the visible social activity', async () => {
    const user = userEvent.setup();
    const reportService: UserReportService = { submit: vi.fn().mockResolvedValue({ caseId: 'case-id' }) };
    render(<GroupSocialScreen
      allTime={allTime} busyReactionKey={null} error="" feed={feed} group={group} groups={[group]} hasMore={false}
      loadingMore={false} onLoadMore={vi.fn()} onNavigate={vi.fn()} onReact={vi.fn()} onSelectGroup={vi.fn()}
      onSignOut={vi.fn()} profile={profile} reportService={reportService} weekly={weekly}
    />);

    expect(screen.queryByRole('button', { name: /report stefan/i })).not.toBeInTheDocument();
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
