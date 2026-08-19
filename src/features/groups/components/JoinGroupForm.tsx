import { useState, type FormEvent } from 'react';
import { Button, TextField } from '../../../components/ui';
import { validateInviteToken } from '../validation';
import styles from './GroupSetup.module.css';

interface JoinGroupFormProps {
  busy?: boolean;
  error?: string;
  onSubmit(inviteToken: string): Promise<unknown> | unknown;
}

export function JoinGroupForm({ busy = false, error = '', onSubmit }: JoinGroupFormProps) {
  const [invite, setInvite] = useState('');
  const [fieldError, setFieldError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateInviteToken(invite);

    if (result.issues.length > 0) {
      setFieldError(result.issues[0]?.message ?? 'Enter a valid group invite code or link.');
      return;
    }

    setFieldError('');
    await onSubmit(result.token);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.formIntro}>
        <p className={styles.kicker}>JOIN A CREW</p>
        <h2>Already invited?</h2>
        <p>Paste the invite link or code. Your lifts stay personal; the group shares competition and progress.</p>
      </div>

      <TextField
        autoCapitalize="none"
        autoComplete="off"
        disabled={busy}
        error={fieldError}
        hint="Paste the full invite link or its invite code."
        label="Invite"
        name="groupInvite"
        onChange={(event) => setInvite(event.target.value)}
        placeholder="Paste invite link or code"
        spellCheck={false}
        value={invite}
      />

      {error && <p className={styles.formError} role="alert">{error}</p>}

      <Button disabled={busy} fullWidth type="submit">
        {busy ? 'Joining group…' : 'Join group'}
      </Button>
    </form>
  );
}
