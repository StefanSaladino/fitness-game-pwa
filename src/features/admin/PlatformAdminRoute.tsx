import { useEffect } from 'react';
import { replacePath, navigateToPath } from '../../lib/appNavigation';
import type { PlatformAccountAdminService } from './accounts/platformAccountAdminService';
import { UserAdministrationController } from './accounts/components/UserAdministrationController';
import type { CapacityDashboardService } from './capacity/capacityDashboardService';
import { CapacityDashboardController } from './capacity/components/CapacityDashboardController';
import { PlatformAdminShell, type PlatformAdminSection } from './components/PlatformAdminShell';
import { usePlatformAccess } from './hooks/usePlatformAccess';
import type { PlatformAccessService } from './platformAccessService';

interface PlatformAdminRouteProps {
  pathname: string;
  currentUserId: string;
  accessService?: PlatformAccessService;
  accountService?: PlatformAccountAdminService;
  capacityService?: CapacityDashboardService;
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
}: PlatformAdminRouteProps) {
  const platformAccess = usePlatformAccess(accessService);
  const authorized = platformAccess.state === 'ready'
    && platformAccess.access?.accountStatus === 'ACTIVE'
    && platformAccess.access.isPlatformAdmin;
  const canonicalCapacityRoute = pathname === '/platform-admin/capacity';
  const canonicalUsersRoute = pathname === '/platform-admin/users';
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
    if (!canonicalCapacityRoute && !canonicalUsersRoute) replacePath('/');
  }, [adminRoot, authorized, canonicalCapacityRoute, canonicalUsersRoute, platformAccess.state]);

  if (!authorized || adminRoot || (!canonicalCapacityRoute && !canonicalUsersRoute)) {
    return <GenericRouteLoading />;
  }

  const activeSection: PlatformAdminSection = canonicalUsersRoute ? 'users' : 'capacity';

  return (
    <PlatformAdminShell
      activeSection={activeSection}
      mobileTitle={activeSection === 'users' ? 'Users' : 'Capacity'}
      onBackToApp={() => navigateToPath('/')}
      onNavigate={(section) => navigateToPath(`/platform-admin/${section}`)}
    >
      {activeSection === 'users'
        ? <UserAdministrationController currentUserId={currentUserId} service={accountService} />
        : <CapacityDashboardController service={capacityService} />}
    </PlatformAdminShell>
  );
}
