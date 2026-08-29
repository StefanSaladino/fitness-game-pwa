import { useEffect, useState } from 'react';
import type { AppSection } from '../../../components/layout';
import type { GroupSummary } from '../../groups';
import type { UserReportService } from '../../moderation';
import type { OnboardingProfile } from '../../onboarding';
import type { GroupSocialService } from '../socialService';
import { GlobalAllTimeLeaderboardController } from './GlobalAllTimeLeaderboardController';
import { GroupSocialController } from './GroupSocialController';

type CompetitionScope = 'GROUP' | 'GLOBAL';

interface Props {
  profile: OnboardingProfile;
  groups: GroupSummary[];
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  service?: GroupSocialService;
  reportService?: UserReportService;
}

export function CompetitionController(props: Props) {
  const hasGroup = props.groups.length > 0;
  const [scope, setScope] = useState<CompetitionScope>(hasGroup ? 'GROUP' : 'GLOBAL');

  useEffect(() => {
    if (!hasGroup && scope === 'GROUP') setScope('GLOBAL');
  }, [hasGroup, scope]);

  if (scope === 'GLOBAL' || !hasGroup) {
    return <GlobalAllTimeLeaderboardController hasGroup={hasGroup} onNavigate={props.onNavigate} onShowGroup={() => setScope('GROUP')} onSignOut={props.onSignOut} profile={props.profile} service={props.service} />;
  }

  return <GroupSocialController groups={props.groups} onNavigate={props.onNavigate} onSelectGroup={props.onSelectGroup} onShowGlobal={() => setScope('GLOBAL')} onSignOut={props.onSignOut} profile={props.profile} reportService={props.reportService} selectedGroupId={props.selectedGroupId} service={props.service} />;
}
