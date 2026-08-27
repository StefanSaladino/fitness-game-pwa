import { createRoot } from 'react-dom/client';
import { AuthLayout } from '../../src/features/auth/components/AuthLayout';
import { SignInForm } from '../../src/features/auth/components/SignInForm';
import { OnboardingScreen } from '../../src/features/onboarding/components/OnboardingScreen';
import { TermsOfServicePage } from '../../src/features/legal/TermsOfServicePage';
import { PlatformAdminShell } from '../../src/features/admin/components/PlatformAdminShell';
import { CapacityDashboard } from '../../src/features/admin/capacity/components/CapacityDashboard';
import type { CapacityDashboardSnapshot } from '../../src/features/admin/capacity/dashboardModel';
import { AppShell } from '../../src/components/layout';
import { UserMessageCenter } from '../../src/features/messaging';
import type { PlatformMessageService } from '../../src/features/messaging/platformMessageService';
import type { PlatformInboxMessage } from '../../src/features/messaging/model';
import '../../src/styles/global.css';

const measuredAt = '2026-08-25T12:00:00.000Z';
const capacity: CapacityDashboardSnapshot = {
  fetchedAt: measuredAt,
  current: [
    { code: 'database_bytes', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'bytes', value: 18_000_000, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
    { code: 'storage_bytes', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'bytes', value: 4_000_000, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
    { code: 'storage_objects', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'count', value: 12, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
    { code: 'postgres_connections', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'count', value: 6, limit: 60, measuredAt, available: true, status: 'NORMAL', utilizationPercent: 10 },
    { code: 'auth_users_total', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'count', value: 36, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
    { code: 'auth_users_30d', source: 'DATABASE_LOCAL', scope: 'PROJECT', unit: 'count', value: 19, limit: null, measuredAt, available: true, status: 'UNCONFIGURED', utilizationPercent: null },
  ],
  history: [],
  supabase: { source: 'SUPABASE_MANAGEMENT', scope: 'ORGANIZATION', fetchedAt: measuredAt, metrics: [] },
  netlify: { source: 'NETLIFY_API', scope: 'ACCOUNT', fetchedAt: measuredAt, metrics: [] },
};

const profile = {
  id: 'fixture-user',
  username: 'u_generated',
  displayName: 'Alex',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 3,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: null,
  preferredWeightUnit: 'KG' as const,
};

const emptyMessageService: PlatformMessageService = {
  list: async () => ({ items: [], unreadCount: 0, total: 0 }),
  markRead: async () => undefined,
  acknowledge: async () => undefined,
  deleteMessage: async () => undefined,
};

const inboxFixture: PlatformInboxMessage = {
  messageId: 'fixture-message', audienceType: 'USER', messageType: 'NOTICE', subject: 'Training update', body: 'A new training block is available.',
  acknowledgementRequired: false, currentRevision: 1, deliveryState: 'READ', deliveredAt: measuredAt,
  readAt: measuredAt, acknowledgedAt: null, sentAt: measuredAt, editedAt: null, expiresAt: null, isExpired: false,
};
let inboxDeleted = false;
const inboxMessageService: PlatformMessageService = {
  list: async () => ({ items: inboxDeleted ? [] : [inboxFixture], unreadCount: 0, total: inboxDeleted ? 0 : 1 }),
  markRead: async () => undefined,
  acknowledge: async () => undefined,
  deleteMessage: async () => { inboxDeleted = true; },
};

function Fixture() {
  const surface = new URLSearchParams(window.location.search).get('surface') ?? 'auth';

  if (surface === 'onboarding') {
    return <OnboardingScreen busy={false} onSubmit={async () => true} profile={profile} />;
  }

  if (surface === 'legal') return <TermsOfServicePage />;

  if (surface === 'header') {
    return (
      <>
        <AppShell activeItem="home" mobileTitle="Home" onNavigate={() => undefined} onSignOut={() => undefined} userLabel="Alex">
          <section data-app-surface="category"><h1>Header action fixture</h1></section>
        </AppShell>
        <UserMessageCenter service={emptyMessageService} />
      </>
    );
  }

  if (surface === 'messages') {
    return (
      <>
        <AppShell activeItem="home" mobileTitle="Home" onNavigate={() => undefined} onSignOut={() => undefined} userLabel="Alex">
          <section data-app-surface="category"><h1>Inbox deletion fixture</h1></section>
        </AppShell>
        <UserMessageCenter service={inboxMessageService} />
      </>
    );
  }

  if (surface === 'admin') {
    return (
      <PlatformAdminShell activeSection="capacity" mobileTitle="Overview" onBackToApp={() => undefined} onNavigate={() => undefined}>
        <CapacityDashboard onCaptureSnapshot={() => undefined} onRefresh={() => undefined} snapshot={capacity} />
      </PlatformAdminShell>
    );
  }

  return (
    <AuthLayout description="Get back to your training." title="Sign in">
      <SignInForm busy={false} onCreateAccount={() => undefined} onForgotPassword={() => undefined} onSubmit={async () => false} />
    </AuthLayout>
  );
}

createRoot(document.getElementById('root')!).render(<Fixture />);
