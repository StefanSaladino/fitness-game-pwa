import type { AppSection } from '../../../components/layout';
import type { GroupSummary } from '../../groups';
import type { OnboardingProfile } from '../../onboarding';
import { useDashboard } from '../hooks/useDashboard';
import { DashboardError, DashboardLoading, DashboardScreen } from './DashboardScreen';

interface DashboardControllerProps {
  profile: OnboardingProfile;
  group: GroupSummary;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
}

export function DashboardController({ profile, group, onNavigate, onSignOut }: DashboardControllerProps) {
  const dashboard = useDashboard({
    userId: profile.id,
    timezone: profile.timezone,
    weeklyTarget: profile.weeklyWorkoutTarget,
    groupId: group.id,
  });


  if (dashboard.status === 'loading' || !dashboard.snapshot) {
    if (dashboard.status === 'error') {
      return (
        <DashboardError
          message={dashboard.error}
          onRetry={() => void dashboard.retry()}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          profile={profile}
        />
      );
    }
    return <DashboardLoading onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} />;
  }

  return (
    <DashboardScreen
      group={group}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      profile={profile}
      snapshot={dashboard.snapshot}
    />
  );
}
