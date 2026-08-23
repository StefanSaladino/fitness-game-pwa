import { createRoot } from 'react-dom/client';
import type { PlatformAccountDetail } from '../../src/features/admin/accounts/model';
import type { PlatformAccountAdminService } from '../../src/features/admin/accounts/platformAccountAdminService';
import { UserAdministrationController } from '../../src/features/admin/accounts/components/UserAdministrationController';
import { PlatformAdminShell } from '../../src/features/admin/components/PlatformAdminShell';
import '../../src/styles/global.css';

let account: PlatformAccountDetail = {
  userId: '11111111-1111-4111-8111-111111111111',
  username: 'alpha',
  displayName: 'Alpha User',
  accountStatus: 'SUSPENDED',
  createdAt: '2026-08-20T12:00:00.000Z',
  lastSignInAt: '2026-08-21T12:00:00.000Z',
  isPlatformAdmin: false,
  suspensionReviewAt: '2026-08-29T12:00:00.000Z',
  deletionRequestedAt: null,
  statusReason: 'Policy review',
  statusUpdatedAt: '2026-08-22T12:00:00.000Z',
  deletionRequestedBy: null,
};

const service: PlatformAccountAdminService = {
  async list(query = {}) {
    return {
      items: [{ ...account }],
      total: 1,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 25,
    };
  },
  async get() { return { ...account }; },
  async suspend() { return undefined; },
  async restore(_userId, reason) {
    account = {
      ...account,
      accountStatus: 'ACTIVE',
      statusReason: reason,
      suspensionReviewAt: null,
      statusUpdatedAt: new Date().toISOString(),
    };
  },
  async requestDeletion() { return undefined; },
  async cancelDeletion() { return undefined; },
  async confirmDeletion() { return undefined; },
};

createRoot(document.getElementById('root')!).render(
  <PlatformAdminShell
    activeSection="users"
    mobileTitle="Users"
    onBackToApp={() => undefined}
    onNavigate={() => undefined}
  >
    <UserAdministrationController currentUserId="admin-user-id" service={service} />
  </PlatformAdminShell>,
);
