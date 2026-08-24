import { useState, type FormEvent } from 'react';
import { Button, TextField } from '../../../components/ui';
import { hasValidationErrors, validateSignIn, type SignInCredentials } from '../authValidation';
import { EyeIcon, LockIcon, MailIcon } from './AuthIcons';
import styles from './AuthForm.module.css';

interface SignInFormProps {
  busy: boolean;
  error?: string;
  onSubmit: (input: SignInCredentials) => Promise<boolean>;
  onCreateAccount: () => void;
  onForgotPassword: () => void;
}

export function SignInForm({ busy, error, onSubmit, onCreateAccount, onForgotPassword }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignInCredentials, string>>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateSignIn({ email, password });
    setFieldErrors(result.errors);
    if (hasValidationErrors(result.errors)) return;
    await onSubmit(result.value);
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField
        autoComplete="email"
        className={styles.field}
        error={fieldErrors.email}
        label="Email"
        leadingIcon={<MailIcon />}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@yourmail.com"
        type="email"
        value={email}
      />
      <TextField
        autoComplete="current-password"
        className={styles.field}
        error={fieldErrors.password}
        label="Password"
        leadingIcon={<LockIcon />}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter your password"
        trailingControl={(
          <button
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className={styles.passwordToggle}
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            <EyeIcon hidden={showPassword} />
          </button>
        )}
        type={showPassword ? 'text' : 'password'}
        value={password}
      />
      <div className={styles.forgotRow}>
        <button className={styles.textButton} type="button" onClick={onForgotPassword}>Forgot password?</button>
      </div>
      {error ? <p className={`${styles.feedback} ${styles.error}`} role="alert">{error}</p> : null}
      <Button className={styles.primaryButton} disabled={busy} fullWidth type="submit">
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
      <div className={styles.divider} aria-hidden="true"><span>or</span></div>
      <Button aria-label="Create an account" className={styles.secondaryButton} disabled={busy} fullWidth variant="secondary" onClick={onCreateAccount}>
        Create account
      </Button>
    </form>
  );
}
