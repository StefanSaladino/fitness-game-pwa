import { useEffect } from 'react';
import { replacePath, navigateToPath } from '../../lib/appNavigation';
import type { CapacityDashboardService } from './capacity/capacityDashboardService';
import { CapacityDashboardController } from './capacity/components/CapacityDashboardController';
import { usePlatformAccess } from './hooks/usePlatformAccess';
import type { PlatformAccessService } from './platformAccessService';

interface PlatformAdminRouteProps {
  pathname: string;
  accessService?: PlatformAccessService;
  capacityService?: CapacityDashboardService;
}

function GenericRouteLoading() {
  return <main aria-live="polite" className="auth-shell"><p>Loading…</p></main>;
}

export function PlatformAdminRoute({ pathname, accessService, capacityService }: PlatformAdminRouteProps) {
  const platformAccess = usePlatformAccess(accessService);
  const authorized = platformAccess.state === 'ready'
    && platformAccess.access?.accountStatus === 'ACTIVE'
    && platformAccess.access.isPlatformAdmin;
  const canonicalCapacityRoute = pathname === '/platform-admin/capacity';
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
    if (!canonicalCapacityRoute) replacePath('/');
  }, [adminRoot, authorized, canonicalCapacityRoute, platformAccess.state]);

  if (!authorized || adminRoot || !canonicalCapacityRoute) return <GenericRouteLoading />;

  return (
    <CapacityDashboardController
      onBackToApp={() => navigateToPath('/')}
      service={capacityService}
    />
  );
}
