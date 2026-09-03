import { useMemo, useState } from 'react';
import { Button } from '../../components/ui';
import { replacePath } from '../../lib/appNavigation';
import { AuthLayout } from './components/AuthLayout';
import styles from './components/AuthForm.module.css';
import { confirmSignUp } from './authService';
import { toUserFacingAuthError } from './authMessages';

type ConfirmationState = 'ready' | 'confirming' | 'confirmed' | 'error' | 'missing';

function confirmationTokenFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  if (params.get('type') !== 'email') return '';
  return params.get('token_hash')?.trim() ?? '';
}

export function ConfirmSignupScreen() {
  const tokenHash = useMemo(confirmationTokenFromLocation, []);
  const [state, setState] = useState<ConfirmationState>(tokenHash ? 'ready' : 'missing');
  const [error, setError] = useState('');

  async function handleConfirm() {
    if (!tokenHash || state === 'confirming' || state === 'confirmed') return;

    setState('confirming');
    setError('');

    try {
      const { data, error: confirmError } = await confirmSignUp(tokenHash);
      if (confirmError) throw confirmError;

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/confirm-signup');
      }

      // verifyOtp persists the returned session in the shared Supabase client and
      // AuthProvider observes the SIGNED_IN event. Move straight into the normal
      // app gate so a new member reaches onboarding instead of seeing sign-in.
      if (data.session) {
        replacePath('/');
        return;
      }

      setState('confirmed');
    } catch (confirmError) {
      setError(toUserFacingAuthError('confirm-signup', confirmError));
      setState('error');
    }
  }

  if (state === 'confirmed') {
    return (
      <AuthLayout
        description="Your email address is verified and your Top Set account is ready."
        eyebrow="EMAIL VERIFIED"
        title="You’re confirmed"
      >
        <div className={styles.completion} role="status">
          <p className={styles.completionText}>Continue to Top Set to finish your profile and start training.</p>
          <a className={`${styles.actionLink} ${styles.primaryActionLink}`} href="/">Continue to Top Set</a>
        </div>
      </AuthLayout>
    );
  }

  const unusable = state === 'missing' || state === 'error';

  return (
    <AuthLayout
      description={unusable
        ? 'This confirmation link cannot be completed from this page.'
        : 'One final step confirms that this email address belongs to you.'}
      eyebrow="VERIFY EMAIL"
      title={unusable ? 'Confirmation link problem' : 'Confirm your email'}
    >
      <div className={styles.completion}>
        {state === 'missing' ? (
          <p className={`${styles.feedback} ${styles.error}`} role="alert">
            This confirmation link is incomplete. Open the newest confirmation email from Top Set and try again.
          </p>
        ) : null}
        {state === 'error' ? <p className={`${styles.feedback} ${styles.error}`} role="alert">{error}</p> : null}
        {!unusable ? (
          <>
            <p className={styles.completionText}>
              Email apps may preview links automatically. Top Set waits for this button before using the one-time verification token.
            </p>
            <Button
              className={styles.primaryButton}
              disabled={state === 'confirming'}
              fullWidth
              onClick={() => void handleConfirm()}
            >
              {state === 'confirming' ? 'Confirming…' : 'Confirm email'}
            </Button>
          </>
        ) : null}
        <a aria-label="Back to sign in" className={`${styles.actionLink} ${styles.secondaryActionLink}`} href="/">‹ Sign in</a>
      </div>
    </AuthLayout>
  );
}
