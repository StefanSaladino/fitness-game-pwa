import { useState, type FormEvent } from 'react';
import { Button, TextField } from '../../components/ui';
import { AuthLayout } from './components/AuthLayout';
import { EyeIcon, LockIcon } from './components/AuthIcons';
import styles from './components/AuthForm.module.css';
import { useAuth } from './AuthProvider';
import { MIN_PASSWORD_LENGTH } from './authValidation';
import { useAuthActions } from './hooks/useAuthActions';

export function ResetPasswordScreen() {
  const { session, loading, passwordRecovery } = useAuth();
  const actions = useAuthActions();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    return (
      <AuthLayout description="We’re checking that this recovery link can update your password." eyebrow="ACCOUNT RECOVERY" title="Checking recovery link">
        <p className={styles.loading} role="status">Checking recovery session…</p>
      </AuthLayout>
    );
  }

  if (complete) {
    return (
      <AuthLayout description="Your new password is active." title="You’re all set">
        <div className={styles.completion} role="status">
          <p className={styles.completionText}>Your password has been changed. You can sign in with it now.</p>
          <a className={`${styles.actionLink} ${styles.primaryActionLink}`} href="/">Continue to sign in</a>
        </div>
      </AuthLayout>
    );
  }

  if (!session && !passwordRecovery) {
    return (
      <AuthLayout description="This recovery session is missing or expired. Request a fresh reset email from the sign-in screen." eyebrow="RECOVERY LINK" title="Link unavailable">
        <a className={`${styles.actionLink} ${styles.secondaryActionLink}`} href="/">Return to sign in</a>
      </AuthLayout>
    );
  }

  const passwordToggle = (
    <button
      aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
      className={styles.passwordToggle}
      onClick={() => setShowPassword((current) => !current)}
      type="button"
    >
      <EyeIcon hidden={showPassword} />
    </button>
  );

  return (
    <AuthLayout description="Choose a new password for this account." eyebrow="ACCOUNT RECOVERY" title="Choose a new password">
      <form className={styles.form} onSubmit={submit} noValidate>
        <TextField autoComplete="new-password" className={styles.field} hint={`At least ${MIN_PASSWORD_LENGTH} characters`} label="New password" leadingIcon={<LockIcon />} onChange={(event) => setPassword(event.target.value)} trailingControl={passwordToggle} type={showPassword ? 'text' : 'password'} value={password} />
        <TextField autoComplete="new-password" className={styles.field} label="Confirm password" leadingIcon={<LockIcon />} onChange={(event) => setConfirmPassword(event.target.value)} type={showPassword ? 'text' : 'password'} value={confirmPassword} />
        {localError ? <p className={`${styles.feedback} ${styles.error}`} role="alert">{localError}</p> : null}
        {actions.error ? <p className={`${styles.feedback} ${styles.error}`} role="alert">{actions.error}</p> : null}
        <Button className={styles.primaryButton} disabled={actions.busy} fullWidth type="submit">{actions.busy ? 'Updating…' : 'Update password'}</Button>
      </form>
    </AuthLayout>
  );
}
