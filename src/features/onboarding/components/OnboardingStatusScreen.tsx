import { TopSetLoadingScreen } from '../../../components/feedback/TopSetLoadingScreen';
import { Button } from '../../../components/ui';
import { OnboardingLayout } from './OnboardingLayout';
import styles from './OnboardingStatusScreen.module.css';

interface OnboardingStatusScreenProps {
  status: 'loading' | 'error';
  message?: string;
  onRetry?: () => Promise<unknown> | unknown;
}

export function OnboardingStatusScreen({ status, message, onRetry }: OnboardingStatusScreenProps) {
  if (status === 'loading') {
    return <TopSetLoadingScreen label="Loading your profile…" />;
  }

  return (
    <OnboardingLayout>
      <section className={styles.state}>
        <p className={styles.eyebrow}>Profile unavailable</p>
        <h1>We couldn’t load your profile.</h1>
        <p role="alert">{message || 'Try loading your profile again.'}</p>
        {onRetry ? (
          <Button className={styles.primaryButton} onClick={() => void onRetry()}>
            Try again
          </Button>
        ) : null}
      </section>
    </OnboardingLayout>
  );
}
