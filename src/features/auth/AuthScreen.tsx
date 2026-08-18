import { useState, type FormEvent } from 'react';
import { requestPasswordReset, signIn, signUp } from './authService';

type Mode = 'signin' | 'signup' | 'forgot';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'forgot') {
        const { error: resetError } = await requestPasswordReset(email.trim());
        if (resetError) throw resetError;
        // Keep the UI response generic; do not reveal whether the account exists.
        setMessage('If an account exists for that email, password-reset instructions have been sent.');
      } else if (mode === 'signup') {
        const { data, error: signupError } = await signUp({ email: email.trim(), password, displayName });
        if (signupError) throw signupError;
        setMessage(data.session ? 'Account created.' : 'Account created. Check your email to confirm your address.');
      } else {
        const { error: signinError } = await signIn(email.trim(), password);
        if (signinError) throw signinError;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">WORKOUT GAME</p>
        <h1 id="auth-title">{mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}</h1>
        <p className="lead auth-lead">
          {mode === 'forgot'
            ? 'Enter your email and we will send recovery instructions.'
            : 'Consistency earns the points. Performance is measured only against your own history.'}
        </p>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              Display name
              <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" />
            </label>
          )}
          <label>
            Email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </label>
          {mode !== 'forgot' && (
            <label>
              Password
              <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            </label>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Working…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'}
          </button>
        </form>

        <div className="auth-actions">
          {mode !== 'signin' && <button className="text-button" type="button" onClick={() => setMode('signin')}>Back to sign in</button>}
          {mode === 'signin' && <button className="text-button" type="button" onClick={() => setMode('forgot')}>Forgot password?</button>}
          {mode === 'signin' && <button className="text-button" type="button" onClick={() => setMode('signup')}>Create an account</button>}
        </div>
      </section>
    </main>
  );
}
