import { useEffect, useMemo, useState } from 'react';
import type { AppSection } from '../../components/layout';
import { signOut } from '../auth/authService';
import { DashboardController, type DashboardService } from '../dashboard';
import { GroupAdministrationController, type GroupService, type GroupSummary } from '../groups';
import type { OnboardingProfile } from '../onboarding';

interface ProductControllerProps {
  profile: OnboardingProfile;
  groups: GroupSummary[];
  onGroupsChanged: () => Promise<unknown> | unknown;
  groupService?: GroupService;
  dashboardService?: DashboardService;
}

export function ProductController({ profile, groups, onGroupsChanged, groupService, dashboardService }: ProductControllerProps) {
  const [activeSection, setActiveSection] = useState<AppSection>('home');
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? '');

  useEffect(() => {
    if (!groups.some((group) => group.id === selectedGroupId)) setSelectedGroupId(groups[0]?.id ?? '');
  }, [groups, selectedGroupId]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? groups[0],
    [groups, selectedGroupId],
  );

  const onNavigate = (section: AppSection) => {
    if (section === 'home' || section === 'groups') setActiveSection(section);
  };
  const onSignOut = () => { void signOut(); };

  if (!selectedGroup) return null;

  if (activeSection === 'groups') {
    return (
      <GroupAdministrationController
        groups={groups}
        onGroupsChanged={onGroupsChanged}
        onNavigate={onNavigate}
        onSelectGroup={setSelectedGroupId}
        onSignOut={onSignOut}
        profile={profile}
        selectedGroupId={selectedGroup.id}
        userId={profile.id}
        service={groupService}
      />
    );
  }

  return (
    <DashboardController
      group={selectedGroup}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      profile={profile}
      service={dashboardService}
    />
  );
}
