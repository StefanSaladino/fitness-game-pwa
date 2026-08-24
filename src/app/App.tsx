import { lazy, Suspense, useEffect } from 'react';
import { Button } from '../components/ui';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { AuthScreen } from '../features/auth/AuthScreen';
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen';
import { AuthConfigurationPanel } from '../features/auth/components/AuthConfigurationPanel';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { GroupGate } from '../features/groups/components/GroupGate';
import { PrivacyPolicyPage } from '../features/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from '../features/legal/TermsOfServicePage';
import { OnboardingScreen, useOnboarding } from '../features/onboarding';
import { ProductController } from '../features/product';
import { UserMessageCenter } from '../features/messaging';
import { isSupabaseConfigured } from '../lib/supabase';
import { replacePath, usePathname } from '../lib/appNavigation';

const PlatformAdminRoute = lazy(async () => {
  const module = await import('../features/admin/PlatformAdminRoute');
  return { default: module.PlatformAdminRoute };
});

const SettingsScreen = lazy(async () => {
  const module = await import('../features/settings/SettingsScreen');
  return { default: module.SettingsScreen };
});

function RouteLoading() {
  return <main className="auth-shell"><p>Loading…</p></main>;
}

function UnknownAuthenticatedRoute() {
  useEffect(() => { replacePath('/'); }, []);
  return <RouteLoading />;
}

function ProfileGate({ userId, userEmail, memberSince, pathname }: { userId: string; userEmail: string; memberSince: string | null; pathname: string }) {
  const onboarding = useOnboarding(userId);

  if (onboarding.status === 'loading') {
    return <main className="auth-shell"><p>Loading your profile…</p></main>;
  }

  if (onboarding.status === 'error' || !onboarding.profile) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">PROFILE</p>
          <h1>We couldn’t load your profile</h1>
          <p className="lead auth-lead">{onboarding.error || 'Try loading your profile again.'}</p>
          <Button fullWidth onClick={() => void onboarding.retry()}>Try again</Button>
        </section>
      </main>
    );
  }

  if (!onboarding.profile.onboardingCompletedAt) {
    return (
      <OnboardingScreen
        busy={onboarding.submitting}
        error={onboarding.error}
        onSubmit={onboarding.complete}
        profile={onboarding.profile}
      />
    );
  }

  if (pathname === '/settings') {
    return (
      <>
        <Suspense fallback={<RouteLoading />}>
          <SettingsScreen
            memberSince={memberSince}
            onProfileChanged={onboarding.retry}
            profile={onboarding.profile}
            userEmail={userEmail}
          />
        </Suspense>
        <UserMessageCenter />
      </>
    );
  }

  if (pathname !== '/') return <UnknownAuthenticatedRoute />;

  return (
    <>
      <GroupGate profileCode={onboarding.profile.profileCode} userId={userId}>
        {(groups, refreshGroups) => <ProductController groups={groups} onGroupsChanged={refreshGroups} profile={onboarding.profile!} />}
      </GroupGate>
      <UserMessageCenter />
    </>
  );
}

function AuthenticatedApp({ pathname }: { pathname: string }) {
  const { session, loading } = useAuth();
  if (loading) return <main className="auth-shell"><p>Loading session…</p></main>;
  if (!session) return <AuthScreen />;

  if (pathname === '/platform-admin' || pathname.startsWith('/platform-admin/')) {
    return (
      <Suspense fallback={<RouteLoading />}>
        <PlatformAdminRoute currentUserId={session.user.id} pathname={pathname} />
      </Suspense>
    );
  }

  return (
    <ProfileGate
      memberSince={session.user.created_at ?? null}
      pathname={pathname}
      userEmail={session.user.email ?? ''}
      userId={session.user.id}
    />
  );
}

function ConfigurationHelp() {
  return (
    <AuthLayout
      description="This build is missing the public Supabase configuration required to start authentication."
      eyebrow="CONFIGURATION"
      title="Connect Supabase"
    >
      <AuthConfigurationPanel />
    </AuthLayout>
  );
}

function RoutedApp({ pathname }: { pathname: string }) {
  if (pathname === '/reset-password') return <ResetPasswordScreen />;
  return <AuthenticatedApp pathname={pathname} />;
}

export function App() {
  const pathname = usePathname();

  if (pathname === '/terms') return <TermsOfServicePage />;
  if (pathname === '/privacy') return <PrivacyPolicyPage />;
  if (!isSupabaseConfigured()) return <ConfigurationHelp />;

  return (
    <AuthProvider>
      <RoutedApp pathname={pathname} />
    </AuthProvider>
  );
}
