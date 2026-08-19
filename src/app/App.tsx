import { LIFTING_WORKOUT_XP, MAX_DAILY_CARDIO_BONUS_XP, MAX_DAILY_EXERCISE_XP, MAX_DAILY_PROGRESSION_XP, MAX_DAILY_XP } from '../domain';
import { AppShell, PageHeader } from '../components/layout';
import { Button, Card, Icon, ProgressBar } from '../components/ui';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { AuthScreen } from '../features/auth/AuthScreen';
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen';
import { signOut } from '../features/auth/authService';
import { GroupGate, type GroupSummary } from '../features/groups';
import { OnboardingScreen, useOnboarding, type OnboardingProfile } from '../features/onboarding';
import { ProfilePictureManager } from '../features/profile-picture';
import { isSupabaseConfigured } from '../lib/supabase';

const week = [
  { day: 'Mon', complete: true },
  { day: 'Tue', complete: true },
  { day: 'Wed', complete: true },
  { day: 'Thu', complete: false },
  { day: 'Fri', complete: false },
  { day: 'Sat', complete: false },
  { day: 'Sun', complete: false },
];

function FoundationDashboard({ profile, groups }: { profile: OnboardingProfile; groups: GroupSummary[] }) {
  const primaryGroup = groups[0];
  return (
    <AppShell
      onSignOut={() => void signOut()}
      userLabel={profile.displayName}
      userMeta={`@${profile.username} · ${profile.weeklyWorkoutTarget}/week`}
    >
      <PageHeader
        action={(
          <Button trailingIcon={<Icon name="arrow-right" size={18} />}>
            Start lift
          </Button>
        )}
        description="Authentication, lifting-first onboarding, group setup, and profile pictures are live. The first real lifting dashboard is the next vertical slice."
        eyebrow="LIFTING-V1 · FOUNDATION"
        title={`Welcome, ${profile.displayName}`}
      />

      <section className="dashboard-grid" aria-label="Foundation dashboard preview">
        <Card className="dashboard-card dashboard-card--weekly" eyebrow="THIS WEEK" title={`${profile.weeklyWorkoutTarget} lifting-day target`}>
          <div className="week-strip" aria-label="Weekly workout progress preview">
            {week.map(({ day, complete }) => (
              <div className="week-day" key={day}>
                <span className={`week-day__marker${complete ? ' week-day__marker--complete' : ''}`}>
                  {complete ? <Icon name="check" size={15} /> : null}
                </span>
                <span>{day}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="dashboard-card dashboard-card--xp" eyebrow="LEVEL PROGRESS" title="XP foundation">
          <div className="xp-summary">
            <strong>{LIFTING_WORKOUT_XP} XP</strong>
            <span>qualifying lifting workout</span>
          </div>
          <ProgressBar label="Foundation XP preview" max={MAX_DAILY_XP} value={LIFTING_WORKOUT_XP} />
          <p className="support-copy">Daily caps: +{MAX_DAILY_EXERCISE_XP} exercise XP, +{MAX_DAILY_PROGRESSION_XP} progression XP, and +{MAX_DAILY_CARDIO_BONUS_XP} cardio bonus XP.</p>
        </Card>

        <Card className="dashboard-card dashboard-card--start" eyebrow="TODAY" title="Ready to train?">
          <p className="support-copy">Lifting capture remains intentionally unwired until the group/dashboard vertical slice is complete.</p>
          <Button fullWidth trailingIcon={<Icon name="arrow-right" size={18} />}>
            Start lift
          </Button>
        </Card>

        <Card className="dashboard-card" eyebrow="GROUPS" title={primaryGroup?.name ?? 'Training crew'}>
          <div className="empty-state">
            <span className="empty-state__icon"><Icon name="groups" size={22} /></span>
            <div>
              <strong>{groups.length === 1 ? `${primaryGroup?.memberCount ?? 0} members · ${primaryGroup?.role ?? 'MEMBER'}` : `${groups.length} active groups`}</strong>
              <p>Your group memberships are live. Leaderboard scoring remains downstream from authoritative lifting-v1 scoring persistence.</p>
            </div>
          </div>
        </Card>

        <Card className="dashboard-card" eyebrow="PROFILE" title={`@${profile.username}`}>
          <ProfilePictureManager
            displayName={profile.displayName}
            userId={profile.id}
          />
          <div className="empty-state">
            <span className="empty-state__icon"><Icon name="calendar" size={22} /></span>
            <div>
              <strong>{profile.timezone}</strong>
              <p>Your scoring dates and Monday–Sunday weekly boundaries use this timezone.</p>
            </div>
          </div>
        </Card>

        <Card className="dashboard-card" eyebrow="ARCHITECTURE" title="Separation of concerns">
          <ul className="architecture-list">
            <li>Forms own presentation and accessible client feedback.</li>
            <li>Hooks/controllers own async UI state and transitions.</li>
            <li>Feature services remain the only Supabase boundary.</li>
          </ul>
        </Card>
      </section>
    </AppShell>
  );
}

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
    <GroupGate userId={userId}>
      {(groups) => <FoundationDashboard groups={groups} profile={onboarding.profile!} />}
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
