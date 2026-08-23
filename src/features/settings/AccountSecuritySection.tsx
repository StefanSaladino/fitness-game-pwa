import { useState, type FormEvent } from 'react';
import { Button, TextField } from '../../components/ui';
import { MIN_PASSWORD_LENGTH } from '../auth/authValidation';
import { toUserFacingAuthError } from '../auth/authMessages';
import { createAccountSecurityService, type AccountSecurityService } from './accountSecurityService';
import styles from './SettingsScreen.module.css';

interface Props {
  email: string;
  memberSince: string | null;
  service?: AccountSecurityService;
  onSignOut(): void;
}

function formatMemberSince(value: string | null): string {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export function AccountSecuritySection({ email, memberSince, service, onSignOut }: Props) {
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await (service ?? createAccountSecurityService()).changePassword(password);
      setPassword('');
      setConfirmation('');
      setEditing(false);
      setNotice('Password updated.');
    } catch (caught) {
      setError(toUserFacingAuthError('password-update', caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="settings-account-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>ACCOUNT</p>
          <h2 id="settings-account-heading">Security</h2>
        </div>
      </div>
      <dl className={styles.detailList}>
        <div><dt>Email</dt><dd>{email || 'Unavailable'}</dd></div>
        <div><dt>Member since</dt><dd>{formatMemberSince(memberSince)}</dd></div>
      </dl>
      <p className={styles.supportCopy}>Email changes require a verified provider flow and are not exposed as a direct profile edit.</p>
      {editing ? (
        <form className={styles.passwordForm} onSubmit={submit} noValidate>
          <TextField
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
            label="New password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          <TextField
            autoComplete="new-password"
            label="Confirm new password"
            onChange={(event) => setConfirmation(event.target.value)}
            type="password"
            value={confirmation}
          />
          <div className={styles.actions}>
            <Button disabled={busy} type="submit">{busy ? 'Updating…' : 'Update password'}</Button>
            <Button disabled={busy} onClick={() => { setEditing(false); setError(''); }} variant="secondary">Cancel</Button>
          </div>
        </form>
      ) : (
        <div className={styles.actions}>
          <Button onClick={() => { setEditing(true); setNotice(''); }} variant="secondary">Change password</Button>
          <Button onClick={onSignOut} variant="ghost">Sign out</Button>
        </div>
      )}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {notice ? <p className={styles.success} role="status">{notice}</p> : null}
    </section>
  );
}
