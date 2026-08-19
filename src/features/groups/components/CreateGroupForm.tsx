import { useState, type FormEvent } from 'react';
import { Button, TextField } from '../../../components/ui';
import type { CreateGroupInput } from '../model';
import { validateCreateGroupInput } from '../validation';
import styles from './GroupSetup.module.css';

interface CreateGroupFormProps {
  busy?: boolean;
  error?: string;
  onSubmit(input: CreateGroupInput): Promise<unknown> | unknown;
}

export function CreateGroupForm({ busy = false, error = '', onSubmit }: CreateGroupFormProps) {
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateCreateGroupInput({ name });
    const issue = result.issues.find((item) => item.field === 'name');

    if (issue) {
      setFieldError(issue.message);
      return;
    }

    setFieldError('');
    await onSubmit({ name: result.name });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.formIntro}>
        <p className={styles.kicker}>START A CREW</p>
        <h2>Make the group yours.</h2>
        <p>Name it now. Invite controls and deeper group management come after the core setup flow.</p>
      </div>

      <TextField
        autoComplete="off"
        disabled={busy}
        error={fieldError}
        hint="You can change the group name later."
        label="Group name"
        maxLength={80}
        name="groupName"
        onChange={(event) => setName(event.target.value)}
        placeholder="Thursday Night Crew"
        value={name}
      />

      {error && <p className={styles.formError} role="alert">{error}</p>}

      <Button disabled={busy} fullWidth type="submit">
        {busy ? 'Creating group…' : 'Create group'}
      </Button>
    </form>
  );
}
