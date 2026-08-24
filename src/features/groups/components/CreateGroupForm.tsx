import { useState, type FormEvent } from 'react';
import { Button, TextField } from '../../../components/ui';
import type { CreateGroupInput } from '../model';
import { validateCreateGroupInput } from '../validation';
import styles from './GroupSetup.module.css';

interface CreateGroupFormProps {
  busy?: boolean;
  error?: string;
  compact?: boolean;
  onSubmit(input: CreateGroupInput): Promise<unknown> | unknown;
}

export function CreateGroupForm({ busy = false, error = '', compact = false, onSubmit }: CreateGroupFormProps) {
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
    <form className={`${styles.form}${compact ? ` ${styles.compactForm}` : ''}`} onSubmit={handleSubmit} noValidate>
      {!compact ? (
        <div className={styles.formIntro}>
          <p className={styles.kicker}>START A CREW</p>
          <h2>Make the group yours.</h2>
          <p>Name it now. You can rename it and invite specific people from Groups afterward.</p>
        </div>
      ) : null}

      <TextField
        autoComplete="off"
        className={compact ? styles.compactField : ''}
        disabled={busy}
        error={fieldError}
        hint={compact ? undefined : 'You can change the group name later.'}
        label="Group name"
        maxLength={80}
        name="groupName"
        onChange={(event) => setName(event.target.value)}
        placeholder="Enter group name"
        value={name}
      />

      {error && <p className={styles.formError} role="alert">{error}</p>}

      <Button className={compact ? styles.compactPrimaryButton : ''} disabled={busy} fullWidth type="submit">
        {busy ? 'Creating group…' : 'Create group'}
      </Button>
    </form>
  );
}
