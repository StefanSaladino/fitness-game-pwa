import { useRef, useState } from 'react';
import { Button, TextField } from '../../components/ui';
import { createAccountDeletionService, type AccountDeletionService } from './accountDeletionService';
import { toUserFacingDeletionError } from './settingsMessages';
import styles from './SettingsScreen.module.css';

interface Props { service?: AccountDeletionService }

export function AccountDeletionPanel({ service }: Props) {
  const serviceRef = useRef<AccountDeletionService | null>(null);
  if (!serviceRef.current) serviceRef.current = service ?? createAccountDeletionService();
  const [phrase, setPhrase] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState<'request' | 'cancel' | 'confirm' | null>(null);
  const [error, setError] = useState('');

  const request = async () => {
    setBusy('request');
    setError('');
    try {
      setPhrase(await serviceRef.current!.request());
      setTyped('');
    } catch (caught) {
      setError(toUserFacingDeletionError(caught));
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy('cancel');
    setError('');
    try {
      await serviceRef.current!.cancel();
      setPhrase('');
      setTyped('');
    } catch (caught) {
      setError(toUserFacingDeletionError(caught));
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    if (!phrase || typed !== phrase) return;
    setBusy('confirm');
    setError('');
    try {
      await serviceRef.current!.confirm(typed);
    } catch (caught) {
      setError(toUserFacingDeletionError(caught));
      setBusy(null);
    }
  };

  if (!phrase) {
    return (
      <div className={styles.dangerZone}>
        <div>
          <strong>Delete account</strong>
          <p>This permanently removes your profile, workouts, scoring, group memberships, and profile-picture files. It cannot be undone.</p>
          <p>Group owners must transfer ownership in Groups first.</p>
        </div>
        <Button disabled={busy !== null} onClick={() => void request()} variant="secondary">
          {busy === 'request' ? 'Checking account…' : 'Start account deletion'}
        </Button>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={styles.confirmDeletion} role="region" aria-labelledby="confirm-account-deletion-heading">
      <h3 id="confirm-account-deletion-heading">Permanently delete this account?</h3>
      <p>Your account is now pending deletion. Cancel below to restore normal access, or type the exact server-issued phrase to continue.</p>
      <code className={styles.confirmationPhrase}>{phrase}</code>
      <TextField
        autoCapitalize="none"
        autoComplete="off"
        label="Exact confirmation phrase"
        onChange={(event) => setTyped(event.target.value)}
        spellCheck={false}
        value={typed}
      />
      <div className={styles.actions}>
        <button
          className={styles.deleteButton}
          disabled={busy !== null || typed !== phrase}
          onClick={() => void confirm()}
          type="button"
        >
          {busy === 'confirm' ? 'Deleting…' : 'Delete permanently'}
        </button>
        <Button disabled={busy !== null} onClick={() => void cancel()} variant="secondary">
          {busy === 'cancel' ? 'Cancelling…' : 'Cancel deletion request'}
        </Button>
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
