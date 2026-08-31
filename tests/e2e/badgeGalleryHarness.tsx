import { createRoot } from 'react-dom/client';
import { BadgeGalleryScreen } from '../../src/features/badges';
import type { EarnedLiftingBadge } from '../../src/features/consistency';
import type { OnboardingProfile } from '../../src/features/onboarding';
import '../../src/styles/global.css';

const profile: OnboardingProfile = {
  id: '81111111-1111-4111-8111-111111111111',
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-20T20:00:00Z',
  profileCode: 'FG-8111111111',
  preferredWeightUnit: 'KG',
};

const badges: EarnedLiftingBadge[] = [
  { badgeKey: 'FIRST_PR', earnedAt: '2026-08-02T18:00:00Z' },
  { badgeKey: 'LIFT_DAYS_5', earnedAt: '2026-08-12T18:00:00Z' },
  { badgeKey: 'GOAL_WEEK_1', earnedAt: '2026-08-17T18:00:00Z' },
];

createRoot(document.getElementById('root')!).render(
  <BadgeGalleryScreen
    badges={badges}
    onNavigate={() => undefined}
    onSignOut={() => undefined}
    profile={profile}
  />,
);
