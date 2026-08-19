import { useState, type FormEvent } from 'react';
import { Button, TextField } from '../../../components/ui';
import { hasValidationErrors, validateSignUp, type SignUpCredentials } from '../authValidation';

interface SignUpFormProps {
  busy: boolean;
  error?: string;
  onSubmit: (input: SignUpCredentials) => Promise<void>;
  onBack: () => void;
}

export function SignUpForm({ busy, error, onSubmit, onBack }: SignUpFormProps) {
  const [values, setValues] = useState<SignUpCredentials>({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
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

  return (
    <form className="auth-form auth-form--production" onSubmit={submit} noValidate>
      <TextField
        autoComplete="name"
        error={fieldErrors.displayName}
        label="Display name"
        onChange={(event) => update('displayName', event.target.value)}
        placeholder="Stefan"
        value={values.displayName}
      />
      <TextField
        autoComplete="email"
        error={fieldErrors.email}
        label="Email"
        onChange={(event) => update('email', event.target.value)}
        placeholder="you@example.com"
        type="email"
        value={values.email}
      />
      <TextField
        autoComplete="new-password"
        error={fieldErrors.password}
        hint="At least 8 characters"
        label="Password"
        onChange={(event) => update('password', event.target.value)}
        type="password"
        value={values.password}
      />
      <TextField
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
        label="Confirm password"
        onChange={(event) => update('confirmPassword', event.target.value)}
        type="password"
        value={values.confirmPassword}
      />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <Button disabled={busy} fullWidth type="submit">{busy ? 'Creating account…' : 'Create account'}</Button>
      <button className="text-button auth-back-button" type="button" onClick={onBack}>Back to sign in</button>
    </form>
  );
}
