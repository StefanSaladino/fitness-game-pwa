import { useState, type FormEvent } from 'react';
import { updatePassword } from './authService';
import { useAuth } from './AuthProvider';

export function ResetPasswordScreen() {
  const { session, loading, passwordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setComplete(true);
  }

  if (loading) return <main className="auth-shell"><p>Checking recovery session…</p></main>;
  if (complete) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <h1>Password updated</h1>
          <p className="lead auth-lead">Your new password is active.</p>
          <a className="primary-button link-button" href="/">Continue</a>
        </section>
      </main>
    );
  }

  if (!session && !passwordRecovery) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <h1>Recovery link unavailable</h1>
          <p className="lead auth-lead">This reset link may be invalid or expired. Request a new password-reset email from the sign-in screen.</p>
          <a className="primary-button link-button" href="/">Return to sign in</a>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="reset-title">
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1 id="reset-title">Choose a new password</h1>
        <form className="auth-form" onSubmit={submit}>
          <label>
            New password
            <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
          </label>
          <label>
            Confirm password
            <input required minLength={8} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={submitting} type="submit">{submitting ? 'Updating…' : 'Update password'}</button>
        </form>
      </section>
    </main>
  );
}
