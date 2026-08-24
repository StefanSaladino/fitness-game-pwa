import { useState, type FormEvent } from 'react';
import { Button, TextField } from '../../../components/ui';
import { hasValidationErrors, validateSignUp, type SignUpCredentials } from '../authValidation';
import { EyeIcon, LockIcon, MailIcon, UserIcon } from './AuthIcons';
import styles from './AuthForm.module.css';

interface SignUpFormProps {
  busy: boolean;
  error?: string;
  onSubmit: (input: SignUpCredentials) => Promise<void>;
  onBack: () => void;
}

export function SignUpForm({ busy, error, onSubmit, onBack }: SignUpFormProps) {
  const [values, setValues] = useState<SignUpCredentials>({ displayName: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignUpCredentials, string>>>({});

  function update<K extends keyof SignUpCredentials>(key: K, value: SignUpCredentials[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateSignUp(values);
    setFieldErrors(result.errors);
    if (hasValidationErrors(result.errors)) return;
    await onSubmit(result.value);
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
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField autoComplete="name" className={styles.field} error={fieldErrors.displayName} label="Display name" leadingIcon={<UserIcon />} onChange={(event) => update('displayName', event.target.value)} placeholder="Stefan" value={values.displayName} />
      <TextField autoComplete="email" className={styles.field} error={fieldErrors.email} label="Email" leadingIcon={<MailIcon />} onChange={(event) => update('email', event.target.value)} placeholder="you@yourmail.com" type="email" value={values.email} />
      <TextField autoComplete="new-password" className={styles.field} error={fieldErrors.password} hint="At least 8 characters" label="Password" leadingIcon={<LockIcon />} onChange={(event) => update('password', event.target.value)} trailingControl={passwordToggle} type={showPassword ? 'text' : 'password'} value={values.password} />
      <TextField autoComplete="new-password" className={styles.field} error={fieldErrors.confirmPassword} label="Confirm password" leadingIcon={<LockIcon />} onChange={(event) => update('confirmPassword', event.target.value)} type={showPassword ? 'text' : 'password'} value={values.confirmPassword} />
      {error ? <p className={`${styles.feedback} ${styles.error}`} role="alert">{error}</p> : null}
      <Button className={styles.primaryButton} disabled={busy} fullWidth type="submit">
        {busy ? 'Creating account…' : 'Create account'}
      </Button>
      <button className={`${styles.textButton} ${styles.backButton}`} type="button" onClick={onBack}>Back to sign in</button>
    </form>
  );
}
