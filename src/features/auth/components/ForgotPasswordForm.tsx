import { useState, type FormEvent } from 'react';
import { Button, TextField } from '../../../components/ui';
import { normalizeEmail } from '../authValidation';

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

  return (
    <form className="auth-form auth-form--production" onSubmit={submit} noValidate>
      <TextField
        autoComplete="email"
        error={emailError}
        label="Email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        type="email"
        value={email}
      />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-success" role="status">{message}</p> : null}
      <Button disabled={busy} fullWidth type="submit">{busy ? 'Sending…' : 'Send reset email'}</Button>
      <button className="text-button auth-back-button" type="button" onClick={onBack}>Back to sign in</button>
    </form>
  );
}
