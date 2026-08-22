import { Button } from '../components/ui';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { AuthScreen } from '../features/auth/AuthScreen';
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen';
import { GroupGate } from '../features/groups/components/GroupGate';
import { OnboardingScreen, useOnboarding } from '../features/onboarding';
import { ProductController } from '../features/product';
import { isSupabaseConfigured } from '../lib/supabase';

function ProfileGate({ userId }: { userId: string }) {
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

  return (
    <GroupGate profileCode={onboarding.profile.profileCode} userId={userId}>
      {(groups, refreshGroups) => <ProductController groups={groups} onGroupsChanged={refreshGroups} profile={onboarding.profile!} />}
    </GroupGate>
  );
}

function AuthenticatedApp() {
  const { session, loading } = useAuth();
  if (loading) return <main className="auth-shell"><p>Loading session…</p></main>;
  if (!session) return <AuthScreen />;
  return <ProfileGate userId={session.user.id} />;
}

function ConfigurationHelp() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">SETUP REQUIRED</p>
        <h1>Connect Supabase</h1>
        <p className="lead auth-lead">Copy <code>.env.example</code> to <code>.env.local</code>, add the hosted Supabase project URL and publishable key, and see README.md plus docs/SUPABASE-SETUP.md.</p>
      </section>
    </main>
  );
}

export function App() {
  if (!isSupabaseConfigured()) return <ConfigurationHelp />;
  const resetRoute = typeof window !== 'undefined' && window.location.pathname === '/reset-password';

  return (
    <AuthProvider>
      {resetRoute ? <ResetPasswordScreen /> : <AuthenticatedApp />}
    </AuthProvider>
  );
}
