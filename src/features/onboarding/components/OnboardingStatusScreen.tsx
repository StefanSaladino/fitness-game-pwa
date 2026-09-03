import { TopSetLoadingScreen } from '../../../components/feedback/TopSetLoadingScreen';
import { AppStateSurface } from '../../../components/feedback/AppStateSurface';
import { Button } from '../../../components/ui';
import { OnboardingLayout } from './OnboardingLayout';
import styles from './OnboardingStatusScreen.module.css';

interface OnboardingStatusScreenProps {
  status: 'loading' | 'error';
  message?: string;
  onRetry?: () => Promise<unknown> | unknown;
  onBackToLogin?: () => Promise<unknown> | unknown;
}

export function OnboardingStatusScreen({ status, message, onRetry, onBackToLogin }: OnboardingStatusScreenProps) {
  if (status === 'loading') {
    return <TopSetLoadingScreen label="Loading your profile…" />;
  }

  const action = onRetry || onBackToLogin ? (
    <>
      {onRetry ? (
        <Button className={styles.primaryButton} onClick={() => void onRetry()}>
          Try again
        </Button>
      ) : null}
      {onBackToLogin ? (
        <Button onClick={() => void onBackToLogin()} variant="secondary">
          Back to login
        </Button>
      ) : null}
    </>
  ) : undefined;

  return (
    <OnboardingLayout>
      <AppStateSurface
        action={action}
        description={message || 'Try loading your profile again.'}
        eyebrow="Profile unavailable"
        headingLevel={1}
        role="alert"
        title="We couldn’t load your profile."
        tone="error"
      />
    </OnboardingLayout>
  );
}
