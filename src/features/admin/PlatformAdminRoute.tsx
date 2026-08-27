import { useEffect } from 'react';
import { TopSetLoadingScreen } from '../../components/feedback/TopSetLoadingScreen';
import { replacePath, navigateToPath } from '../../lib/appNavigation';
import type { PlatformAccountAdminService } from './accounts/platformAccountAdminService';
import { UserAdministrationController } from './accounts/components/UserAdministrationController';
import type { CapacityDashboardService } from './capacity/capacityDashboardService';
import { CapacityDashboardController } from './capacity/components/CapacityDashboardController';
import type { ModerationCaseService } from './moderation/moderationCaseService';
import { ModerationWorkspaceController } from './moderation/components/ModerationWorkspaceController';
import type { PlatformMessagingService } from './messaging/platformMessagingService';
import { PlatformMessagingController } from './messaging/components/PlatformMessagingController';
import { PlatformAdminShell, type PlatformAdminSection } from './components/PlatformAdminShell';
import { usePlatformAccess } from './hooks/usePlatformAccess';
import type { PlatformAccessService } from './platformAccessService';

interface PlatformAdminRouteProps {
  pathname: string;
  currentUserId: string;
  accessService?: PlatformAccessService;
  accountService?: PlatformAccountAdminService;
  capacityService?: CapacityDashboardService;
  moderationService?: ModerationCaseService;
  messagingService?: PlatformMessagingService;
}

function GenericRouteLoading() {
  return <TopSetLoadingScreen label="Checking administration access…" />;
}

export function PlatformAdminRoute({
  pathname,
  currentUserId,
  accessService,
  accountService,
  capacityService,
  moderationService,
  messagingService,
}: PlatformAdminRouteProps) {
  const platformAccess = usePlatformAccess(accessService);
  const authorized = platformAccess.state === 'ready'
    && platformAccess.access?.accountStatus === 'ACTIVE'
    && platformAccess.access.isPlatformAdmin;
  const canonicalCapacityRoute = pathname === '/platform-admin/capacity';
  const canonicalUsersRoute = pathname === '/platform-admin/users';
  const canonicalModerationRoute = pathname === '/platform-admin/moderation';
  const canonicalMessagesRoute = pathname === '/platform-admin/messages';
  const adminRoot = pathname === '/platform-admin';

  useEffect(() => {
    if (platformAccess.state === 'loading') return;
    if (!authorized) {
      replacePath('/');
      return;
    }
    if (adminRoot) {
      replacePath('/platform-admin/capacity');
      return;
    }
    if (!canonicalCapacityRoute && !canonicalUsersRoute && !canonicalModerationRoute && !canonicalMessagesRoute) replacePath('/');
  }, [adminRoot, authorized, canonicalCapacityRoute, canonicalMessagesRoute, canonicalModerationRoute, canonicalUsersRoute, platformAccess.state]);

  if (!authorized || adminRoot || (!canonicalCapacityRoute && !canonicalUsersRoute && !canonicalModerationRoute && !canonicalMessagesRoute)) {
    return <GenericRouteLoading />;
  }

  const activeSection: PlatformAdminSection = canonicalMessagesRoute ? 'messages' : canonicalModerationRoute ? 'moderation' : canonicalUsersRoute ? 'users' : 'capacity';
  const initialModerationTarget = typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('target');
  const initialMessageTarget = typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('target');

  return (
    <PlatformAdminShell
      activeSection={activeSection}
      mobileTitle={activeSection === 'messages' ? 'Messages' : activeSection === 'moderation' ? 'Moderation' : activeSection === 'users' ? 'Users' : 'Overview'}
      onBackToApp={() => navigateToPath('/')}
      onNavigate={(section) => navigateToPath(`/platform-admin/${section}`)}
    >
      {activeSection === 'users' ? (
        <UserAdministrationController
          currentUserId={currentUserId}
          onMessageUser={(userId) => navigateToPath(`/platform-admin/messages?target=${encodeURIComponent(userId)}`)}
          onOpenActivityReview={(userId) => navigateToPath(`/platform-admin/moderation?target=${encodeURIComponent(userId)}`)}
          service={accountService}
        />
      ) : activeSection === 'moderation' ? (
        <ModerationWorkspaceController
          currentUserId={currentUserId}
          initialTargetUserId={initialModerationTarget}
          service={moderationService}
        />
      ) : activeSection === 'messages' ? (
        <PlatformMessagingController initialTargetUserId={initialMessageTarget} service={messagingService} />
      ) : <CapacityDashboardController service={capacityService} />}
    </PlatformAdminShell>
  );
}
