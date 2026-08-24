import { Button } from '../../../components/ui';
import styles from './AuthForm.module.css';

interface VerifyEmailPanelProps {
  email: string;
  onBackToSignIn: () => void;
}

export function VerifyEmailPanel({ email, onBackToSignIn }: VerifyEmailPanelProps) {
  return (
    <div className={styles.completion} role="status">
      <p className={styles.completionText}>
        We sent a confirmation link to <strong>{email}</strong>. Confirm the address, then return here to continue.
      </p>
      <p className={styles.metaLine}>If you do not see it, check your spam or junk folder before creating another account.</p>
      <Button className={styles.secondaryButton} fullWidth variant="secondary" onClick={onBackToSignIn}>Back to sign in</Button>
    </div>
  );
}
