import type { GroupSummary } from '../../groups';
import type { OnboardingProfile } from '../../onboarding';
import { signOut } from '../../auth/authService';
import { useDashboard } from '../hooks/useDashboard';
import { DashboardError, DashboardLoading, DashboardScreen } from './DashboardScreen';

interface DashboardControllerProps {
  profile: OnboardingProfile;
  groups: GroupSummary[];
}

export function DashboardController({ profile, groups }: DashboardControllerProps) {
  const group = groups[0];
  const dashboard = useDashboard({
    userId: profile.id,
    timezone: profile.timezone,
    weeklyTarget: profile.weeklyWorkoutTarget,
    groupId: group.id,
  });

  const onSignOut = () => { void signOut(); };

  if (dashboard.status === 'loading' || !dashboard.snapshot) {
    if (dashboard.status === 'error') {
      return (
        <DashboardError
          message={dashboard.error}
          onRetry={() => void dashboard.retry()}
          onSignOut={onSignOut}
          profile={profile}
        />
      );
    }
    return <DashboardLoading onSignOut={onSignOut} profile={profile} />;
  }

  return (
    <DashboardScreen
      group={group}
      onSignOut={onSignOut}
      profile={profile}
      snapshot={dashboard.snapshot}
    />
  );
}
