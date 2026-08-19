import { Button } from '../../../components/ui';

interface VerifyEmailPanelProps {
  email: string;
  onBackToSignIn: () => void;
}

export function VerifyEmailPanel({ email, onBackToSignIn }: VerifyEmailPanelProps) {
  return (
    <div className="verification-panel" role="status">
      <div className="verification-panel__icon" aria-hidden="true">✓</div>
      <h2>Check your inbox</h2>
      <p>We sent a confirmation link to <strong>{email}</strong>. Confirm the address, then return here to continue.</p>
      <Button fullWidth variant="secondary" onClick={onBackToSignIn}>Back to sign in</Button>
    </div>
  );
}
