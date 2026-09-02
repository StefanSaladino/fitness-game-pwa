import { Button } from '../../../components/ui';
import styles from './AuthForm.module.css';

interface VerifyEmailPanelProps {
  email: string;
  busy: boolean;
  error: string;
  message: string;
  onResend: () => Promise<boolean>;
  onBackToSignIn: () => void;
}

export function VerifyEmailPanel({
  email,
  busy,
  error,
  message,
  onResend,
  onBackToSignIn,
}: VerifyEmailPanelProps) {
  return (
    <div className={styles.completion} role="status">
      <p className={styles.completionText}>
        We sent a confirmation link to <strong>{email}</strong>. Open it, then choose <strong>Confirm email</strong> on the Top Set confirmation page.
      </p>
      <p className={styles.metaLine}>
        If you do not see it, check your spam or junk folder. You can safely request another confirmation email below.
      </p>
      {error ? <p className={`${styles.feedback} ${styles.error}`} role="alert">{error}</p> : null}
      {message ? <p className={`${styles.feedback} ${styles.success}`}>{message}</p> : null}
      <Button className={styles.primaryButton} disabled={busy} fullWidth onClick={() => void onResend()}>
        {busy ? 'Sending…' : 'Resend confirmation email'}
      </Button>
      <Button className={styles.secondaryButton} disabled={busy} fullWidth variant="secondary" onClick={onBackToSignIn}>
        Back to sign in
      </Button>
    </div>
  );
}
