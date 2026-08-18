import { BASE_WORKOUT_XP, MAX_DAILY_PERFORMANCE_XP } from '../domain';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { AuthScreen } from '../features/auth/AuthScreen';
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen';
import { signOut } from '../features/auth/authService';
import { isSupabaseConfigured } from '../lib/supabase';

function FoundationDashboard() {
  const { session } = useAuth();
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">FOUNDATION v0.2</p>
          <span className="session-label">{session?.user.email}</span>
        </div>
        <button className="secondary-button" type="button" onClick={() => void signOut()}>Sign out</button>
      </header>
      <section className="hero-card" aria-labelledby="app-title">
        <h1 id="app-title">Workout Game</h1>
        <p className="lead">Supabase data/auth foundation is connected. Workout, group, scoring, and badge screens build on this layer.</p>
      </section>
      <section className="grid" aria-label="Scoring foundation">
        <article className="metric-card">
          <span className="metric-label">Daily base</span>
          <strong>{BASE_WORKOUT_XP} XP</strong>
          <p>One qualifying workout day. Additional workouts are still recorded.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Progress bonus</span>
          <strong>0–{MAX_DAILY_PERFORMANCE_XP} XP</strong>
          <p>Personal improvement only after account and benchmark calibration.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Backend</span>
          <strong>Supabase</strong>
          <p>Profiles, expandable groups, workouts, XP ledger, benchmarks, RLS, and recovery-ready auth.</p>
        </article>
      </section>
    </main>
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
        <p className="lead auth-lead">Copy <code>.env.example</code> to <code>.env.local</code>, start the local Supabase stack, and paste the local URL and publishable/anon key. See README.md and docs/SUPABASE-SETUP.md.</p>
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
