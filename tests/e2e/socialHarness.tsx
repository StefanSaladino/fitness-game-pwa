import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { GroupSummary } from '../../src/features/groups';
import type { OnboardingProfile } from '../../src/features/onboarding';
import type { GroupCompetitionLeaderboard, GroupReactionType, GroupSocialFeedItem } from '../../src/features/social';
import { GroupSocialScreen } from '../../src/features/social';
import '../../src/styles/global.css';

const profile: OnboardingProfile = {
  id: 'user-1', username: 'stefan', displayName: 'Stefan', timezone: 'America/Toronto', weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null, onboardingCompletedAt: '2026-08-18T00:00:00Z', profileCode: 'FG-1111111111',
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
const initialActivity: GroupSocialFeedItem = {
  activityKey: 'PR:e2e-opaque', activityType: 'PR', activityAt: new Date().toISOString(), actorUserId: 'user-2', username: 'alex', displayName: 'Alex', profilePictureUrl: null,
  metadata: { exerciseName: 'Bench Press', metricType: 'E1RM', metricValue: 120, previousBest: 115, weightKg: 100, reps: 6, scoringDate: '2026-08-20' },
  reactions: { FIRE: 2, STRONG: 0, CLAP: 0 }, myReaction: null,
};

function Harness() {
  const [feed, setFeed] = useState<GroupSocialFeedItem[]>([initialActivity]);
  const react = (activityKey: string, reaction: GroupReactionType) => {
    setFeed((current) => current.map((item) => {
      if (item.activityKey !== activityKey) return item;
      const next = item.myReaction === reaction ? null : reaction;
      const reactions = { ...item.reactions };
      if (item.myReaction) reactions[item.myReaction] = Math.max(0, reactions[item.myReaction] - 1);
      if (next) reactions[next] += 1;
      return { ...item, myReaction: next, reactions };
    }));
  };
  return <GroupSocialScreen
    allTime={allTime} busyReactionKey={null} error="" feed={feed} group={group} groups={[group]} hasMore={false}
    loadingMore={false} onLoadMore={() => undefined} onNavigate={() => undefined} onReact={react}
    onSelectGroup={() => undefined} onSignOut={() => undefined} profile={profile} weekly={weekly}
  />;
}

createRoot(document.getElementById('root')!).render(<Harness />);
