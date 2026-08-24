import { useState, type FormEvent } from 'react';
import { Button, TextField } from '../../../components/ui';
import { normalizeEmail } from '../authValidation';
import { MailIcon } from './AuthIcons';
import styles from './AuthForm.module.css';

interface ForgotPasswordFormProps {
  busy: boolean;
  error?: string;
  message?: string;
  onSubmit: (email: string) => Promise<boolean>;
  onBack: () => void;
}

export function ForgotPasswordForm({ busy, error, message, onSubmit, onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeEmail(email);
    if (!normalized || !normalized.includes('@')) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    await onSubmit(normalized);
  }

  if (message) {
    return (
      <div className={styles.completion} role="status">
        <p className={`${styles.feedback} ${styles.success}`}>{message}</p>
        <p className={styles.metaLine}>Use the newest recovery email if you request more than one link.</p>
        <Button className={styles.secondaryButton} fullWidth variant="secondary" onClick={onBack}>Back to sign in</Button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField autoComplete="email" className={styles.field} error={emailError} label="Email" leadingIcon={<MailIcon />} onChange={(event) => setEmail(event.target.value)} placeholder="you@yourmail.com" type="email" value={email} />
      {error ? <p className={`${styles.feedback} ${styles.error}`} role="alert">{error}</p> : null}
      <Button className={styles.primaryButton} disabled={busy} fullWidth type="submit">{busy ? 'Sending…' : 'Send reset email'}</Button>
      <button className={`${styles.textButton} ${styles.backButton}`} type="button" onClick={onBack}>Back to sign in</button>
    </form>
  );
}
