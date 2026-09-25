/**
 * Maintainer boundary: this file owns top-level authenticated route composition.
 * Top Set intentionally uses the small history/popstate helpers in appNavigation
 * instead of a general router. Deep links such as /program and /settings/training
 * must work on direct refresh as well as in-app navigation.
 */

import { lazy, Suspense, useEffect } from 'react';
import { TopSetLoadingScreen } from '../components/feedback/TopSetLoadingScreen';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { AuthScreen } from '../features/auth/AuthScreen';
import { ConfirmSignupScreen } from '../features/auth/ConfirmSignupScreen';
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen';
import { signOut } from '../features/auth/authService';
import { AuthConfigurationPanel } from '../features/auth/components/AuthConfigurationPanel';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { GroupGate } from '../features/groups/components/GroupGate';
import { PrivacyPolicyPage } from '../features/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from '../features/legal/TermsOfServicePage';
import { OnboardingScreen, OnboardingStatusScreen, useOnboarding } from '../features/onboarding';
import { ProductController } from '../features/product';
import { UserMessageCenter } from '../features/messaging';
import { tutorialIsRequired } from '../features/tutorial/model';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  legacyProductSectionFromLocation,
  productPathForSection,
  productSectionFromPathname,
  replacePath,
  TRAINING_PROGRAM_PATH,
  TRAINING_SETTINGS_PATH,
  usePathname,
  TUTORIAL_PATH,
} from '../lib/appNavigation';

const PlatformAdminRoute = lazy(async () => {
  const module = await import('../features/admin/PlatformAdminRoute');
  return { default: module.PlatformAdminRoute };
});

const SettingsScreen = lazy(async () => {
  const module = await import('../features/settings/SettingsScreen');
  return { default: module.SettingsScreen };
});

const TutorialExperience = lazy(async () => {
  const module = await import('../features/tutorial');
  return { default: module.TutorialExperience };
});

const TrainingProgramController = lazy(async () => {
  const module = await import(
    '../features/training-program/components/TrainingProgramController'
  );
  return { default: module.TrainingProgramController };
});

function RouteLoading() {
  return <TopSetLoadingScreen />;
}

function UnknownAuthenticatedRoute() {
  useEffect(() => { replacePath('/'); }, []);
  return <RouteLoading />;
}

function TutorialStartRedirect({ fromSettings = false }: { fromSettings?: boolean }) {
  useEffect(() => {
    replacePath(`/tutorial?step=0${fromSettings ? '&from=settings' : ''}`);
  }, [fromSettings]);
  return <RouteLoading />;
}

function ProfileGate({ userId, userEmail, memberSince, pathname }: { userId: string; userEmail: string; memberSince: string | null; pathname: string }) {
  const onboarding = useOnboarding(userId);
  const legacyProductSection = legacyProductSectionFromLocation();
  const productSection = productSectionFromPathname(pathname) ?? legacyProductSection;

  useEffect(() => {
    if (legacyProductSection) replacePath(productPathForSection(legacyProductSection));
  }, [legacyProductSection]);

  if (onboarding.status === 'loading') {
    return <OnboardingStatusScreen status="loading" />;
  }

  if (onboarding.status === 'error' || !onboarding.profile) {
    return (
      <OnboardingStatusScreen
        message={onboarding.error || 'Try loading your profile again.'}
        onBackToLogin={signOut}
        onRetry={onboarding.retry}
        status="error"
      />
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

  const needsTutorial = tutorialIsRequired(onboarding.profile);
  const tutorialParams =
    typeof window === 'undefined'
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const tutorialReturnPath =
    tutorialParams.get('from') === 'settings' ? '/settings' : '/';
  const tutorialActive = pathname === TUTORIAL_PATH;

  if (needsTutorial && !tutorialActive) {
    return <TutorialStartRedirect />;
  }

  if (tutorialActive) {
    return (
      <Suspense fallback={<RouteLoading />}>
        <TutorialExperience
          onProfileChanged={onboarding.retry}
          profile={onboarding.profile}
          required={needsTutorial}
          returnPath={tutorialReturnPath}
        />
      </Suspense>
    );
  }

  if (pathname === '/settings' || pathname === TRAINING_SETTINGS_PATH) {
    const programTrainingSettings = pathname === TRAINING_SETTINGS_PATH;

    return (
      <>
        <Suspense fallback={<RouteLoading />}>
          <SettingsScreen
            initialPanel={programTrainingSettings ? 'training' : null}
            memberSince={memberSince}
            onProfileChanged={onboarding.retry}
            profile={onboarding.profile}
            returnPath={programTrainingSettings ? TRAINING_PROGRAM_PATH : null}
            userEmail={userEmail}
          />
        </Suspense>
        <UserMessageCenter />
      </>
    );
  }

  if (pathname === TRAINING_PROGRAM_PATH) {
    return (
      <>
        <Suspense fallback={<RouteLoading />}>
          <TrainingProgramController
            profile={onboarding.profile}
            onNavigate={(section) => {
              if (section === 'profile') {
                replacePath('/settings');
                return;
              }

              replacePath(productPathForSection(section));
            }}
            onSignOut={() => void signOut()}
          />
        </Suspense>
        <UserMessageCenter />
      </>
    );
  }

  if (!productSection) return <UnknownAuthenticatedRoute />;

  return (
    <>
      <GroupGate profileCode={onboarding.profile.profileCode} userId={userId}>
        {(groups, refreshGroups) => (
          <ProductController
            groups={groups}
            onGroupsChanged={refreshGroups}
            profile={onboarding.profile!}
            requestedSection={productSection}
          />
        )}
      </GroupGate>
      <UserMessageCenter />
    </>
  );
}

function AuthenticatedApp({ pathname }: { pathname: string }) {
  const { session, loading } = useAuth();
  if (loading) return <TopSetLoadingScreen label="Loading session…" />;
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
  if (pathname === '/confirm-signup') return <ConfirmSignupScreen />;
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
