import type { AppSection } from '../../../components/layout';
import { DashboardGroupMembership, type GroupService, type GroupSummary } from '../../groups';
import type { OnboardingProfile } from '../../onboarding';
import { TrainingTipSurface, trainingTipForDate } from '../../training-content';
import type { DashboardService } from '../dashboardService';
import { useDashboard } from '../hooks/useDashboard';
import { DashboardError, DashboardLoading, DashboardScreen } from './DashboardScreen';

interface DashboardControllerProps {
  profile: OnboardingProfile;
  group: GroupSummary | null;
  groupCount: number;
  onGroupsChanged: () => Promise<unknown> | unknown;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  service?: DashboardService;
  groupService?: GroupService;
}

export function DashboardController({ profile, group, groupCount, onGroupsChanged, onNavigate, onSignOut, service, groupService }: DashboardControllerProps) {
  const dashboard = useDashboard({
    userId: profile.id,
    timezone: profile.timezone,
    weeklyTarget: profile.weeklyWorkoutTarget,
    groupId: group?.id ?? null,
  }, service);
  const tip = trainingTipForDate(new Date(), profile.id);

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
      groupNotice={(
        <>
          <TrainingTipSurface compact tip={tip} />
          <DashboardGroupMembership
            groupCount={groupCount}
            onGroupsChanged={onGroupsChanged}
            onNavigate={onNavigate}
            service={groupService}
          />
        </>
      )}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      profile={profile}
      snapshot={dashboard.snapshot}
    />
  );
}
