import { BASE_WORKOUT_XP, MAX_DAILY_PERFORMANCE_XP } from '../domain';
import { AppShell, PageHeader } from '../components/layout';
import { Button, Card, Icon, ProgressBar } from '../components/ui';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { AuthScreen } from '../features/auth/AuthScreen';
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen';
import { signOut } from '../features/auth/authService';
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

function FoundationDashboard() {
  const { session } = useAuth();
  const email = session?.user.email ?? 'Signed-in athlete';

  return (
    <AppShell onSignOut={() => void signOut()} userLabel={email} userMeta="Foundation account">
      <PageHeader
        action={(
          <Button trailingIcon={<Icon name="arrow-right" size={18} />}>
            Start workout
          </Button>
        )}
        description="The responsive shell and shared components are ready. Live dashboard data and product screens arrive in the next implementation slices."
        eyebrow="PHASE 5 · UI FOUNDATION"
        title="Today"
      />

      <section className="dashboard-grid" aria-label="Foundation dashboard preview">
        <Card className="dashboard-card dashboard-card--weekly" eyebrow="THIS WEEK" title="3 / 5 workouts">
          <div className="week-strip" aria-label="Weekly workout progress">
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
            <strong>{BASE_WORKOUT_XP} XP</strong>
            <span>base / qualifying day</span>
          </div>
          <ProgressBar label="Foundation XP preview" max={125} value={BASE_WORKOUT_XP} />
          <p className="support-copy">Up to +{MAX_DAILY_PERFORMANCE_XP} XP can come from eligible personal improvement.</p>
        </Card>

        <Card className="dashboard-card dashboard-card--start" eyebrow="TODAY" title="Ready to train?">
          <p className="support-copy">Workout capture is intentionally not wired into this UI shell yet.</p>
          <Button fullWidth trailingIcon={<Icon name="arrow-right" size={18} />}>
            Start workout
          </Button>
        </Card>

        <Card className="dashboard-card" eyebrow="GROUP" title="Friends & leaderboard">
          <div className="empty-state">
            <span className="empty-state__icon"><Icon name="groups" size={22} /></span>
            <div>
              <strong>Group experience comes next</strong>
              <p>Creation, invites, roles, and leaderboard presentation will use the same component system.</p>
            </div>
          </div>
        </Card>

        <Card className="dashboard-card" eyebrow="ACTIVITY" title="Recent activity">
          <div className="empty-state">
            <span className="empty-state__icon"><Icon name="calendar" size={22} /></span>
            <div>
              <strong>No activity rendered yet</strong>
              <p>The shell is presentation-only; the eventual feed will consume feature-level data.</p>
            </div>
          </div>
        </Card>

        <Card className="dashboard-card" eyebrow="ARCHITECTURE" title="Separation of concerns">
          <ul className="architecture-list">
            <li>Shared components own presentation and accessibility.</li>
            <li>Feature hooks/controllers will own async UI state.</li>
            <li>Feature services remain the Supabase boundary.</li>
          </ul>
        </Card>
      </section>
    </AppShell>
  );
}

function AuthenticatedApp() {
  const { session, loading } = useAuth();
  if (loading) return <main className="auth-shell"><p>Loading session…</p></main>;
  if (!session) return <AuthScreen />;
  return <FoundationDashboard />;
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
