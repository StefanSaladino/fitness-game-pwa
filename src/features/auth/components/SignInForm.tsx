import { useState, type FormEvent } from 'react';
import { Button, TextField } from '../../../components/ui';
import { hasValidationErrors, validateSignIn, type SignInCredentials } from '../authValidation';

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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignInCredentials, string>>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateSignIn({ email, password });
    setFieldErrors(result.errors);
    if (hasValidationErrors(result.errors)) return;
    await onSubmit(result.value);
  }

  return (
    <form className="auth-form auth-form--production" onSubmit={submit} noValidate>
      <TextField
        autoComplete="email"
        error={fieldErrors.email}
        label="Email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        type="email"
        value={email}
      />
      <TextField
        autoComplete="current-password"
        error={fieldErrors.password}
        label="Password"
        onChange={(event) => setPassword(event.target.value)}
        type="password"
        value={password}
      />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <Button disabled={busy} fullWidth type="submit">{busy ? 'Signing in…' : 'Sign in'}</Button>
      <div className="auth-inline-actions">
        <button className="text-button" type="button" onClick={onForgotPassword}>Forgot password?</button>
        <button className="text-button" type="button" onClick={onCreateAccount}>Create an account</button>
      </div>
    </form>
  );
}
