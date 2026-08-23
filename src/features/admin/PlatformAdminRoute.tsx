import { useEffect } from 'react';
import { replacePath, navigateToPath } from '../../lib/appNavigation';
import type { PlatformAccountAdminService } from './accounts/platformAccountAdminService';
import { UserAdministrationController } from './accounts/components/UserAdministrationController';
import type { CapacityDashboardService } from './capacity/capacityDashboardService';
import { CapacityDashboardController } from './capacity/components/CapacityDashboardController';
import type { ModerationCaseService } from './moderation/moderationCaseService';
import { ModerationWorkspaceController } from './moderation/components/ModerationWorkspaceController';
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
}

function GenericRouteLoading() {
  return <main aria-live="polite" className="auth-shell"><p>Loading…</p></main>;
}

export function PlatformAdminRoute({
  pathname,
  currentUserId,
  accessService,
  accountService,
  capacityService,
  moderationService,
}: PlatformAdminRouteProps) {
  const platformAccess = usePlatformAccess(accessService);
  const authorized = platformAccess.state === 'ready'
    && platformAccess.access?.accountStatus === 'ACTIVE'
    && platformAccess.access.isPlatformAdmin;
  const canonicalCapacityRoute = pathname === '/platform-admin/capacity';
  const canonicalUsersRoute = pathname === '/platform-admin/users';
  const canonicalModerationRoute = pathname === '/platform-admin/moderation';
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
    if (!canonicalCapacityRoute && !canonicalUsersRoute && !canonicalModerationRoute) replacePath('/');
  }, [adminRoot, authorized, canonicalCapacityRoute, canonicalModerationRoute, canonicalUsersRoute, platformAccess.state]);

  if (!authorized || adminRoot || (!canonicalCapacityRoute && !canonicalUsersRoute && !canonicalModerationRoute)) {
    return <GenericRouteLoading />;
  }

  const activeSection: PlatformAdminSection = canonicalModerationRoute ? 'moderation' : canonicalUsersRoute ? 'users' : 'capacity';
  const initialModerationTarget = typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('target');

  return (
    <PlatformAdminShell
      activeSection={activeSection}
      mobileTitle={activeSection === 'moderation' ? 'Moderation' : activeSection === 'users' ? 'Users' : 'Capacity'}
      onBackToApp={() => navigateToPath('/')}
      onNavigate={(section) => navigateToPath(`/platform-admin/${section}`)}
    >
      {activeSection === 'users' ? (
        <UserAdministrationController
          currentUserId={currentUserId}
          onOpenActivityReview={(userId) => navigateToPath(`/platform-admin/moderation?target=${encodeURIComponent(userId)}`)}
          service={accountService}
        />
      ) : activeSection === 'moderation' ? (
        <ModerationWorkspaceController
          currentUserId={currentUserId}
          initialTargetUserId={initialModerationTarget}
          service={moderationService}
        />
      ) : <CapacityDashboardController service={capacityService} />}
    </PlatformAdminShell>
  );
}
