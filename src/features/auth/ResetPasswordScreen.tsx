import { useState, type FormEvent } from 'react';
import { Button, TextField } from '../../components/ui';
import { AuthLayout } from './components/AuthLayout';
import { useAuth } from './AuthProvider';
import { MIN_PASSWORD_LENGTH } from './authValidation';
import { useAuthActions } from './hooks/useAuthActions';

export function ResetPasswordScreen() {
  const { session, loading, passwordRecovery } = useAuth();
  const actions = useAuthActions();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (await actions.updatePassword(password)) setComplete(true);
  }

  if (loading) {
    return <main className="auth-shell"><p>Checking recovery session…</p></main>;
  }

  if (complete) {
    return (
      <AuthLayout description="Your new password is active." eyebrow="PASSWORD UPDATED" title="You’re all set">
        <a className="ui-button ui-button--primary ui-button--full link-button" href="/">Continue to sign in</a>
      </AuthLayout>
    );
  }

  if (!session && !passwordRecovery) {
    return (
      <AuthLayout
        description="This recovery session is missing or expired. Request a fresh password-reset email from the sign-in screen."
        eyebrow="RECOVERY LINK"
        title="Link unavailable"
      >
        <a className="ui-button ui-button--secondary ui-button--full link-button" href="/">Return to sign in</a>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout description="Choose a new password for this account." eyebrow="ACCOUNT RECOVERY" title="Choose a new password">
      <form className="auth-form auth-form--production" onSubmit={submit} noValidate>
        <TextField
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
          label="New password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
        <TextField
          autoComplete="new-password"
          label="Confirm password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          value={confirmPassword}
        />
        {localError ? <p className="form-error" role="alert">{localError}</p> : null}
        {actions.error ? <p className="form-error" role="alert">{actions.error}</p> : null}
        <Button disabled={actions.busy} fullWidth type="submit">{actions.busy ? 'Updating…' : 'Update password'}</Button>
      </form>
    </AuthLayout>
  );
}
