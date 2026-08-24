import type { OnboardingInput, OnboardingProfile } from '../model';
import { OnboardingForm } from './OnboardingForm';
import { OnboardingLayout } from './OnboardingLayout';
import styles from './OnboardingScreen.module.css';

interface OnboardingScreenProps {
  profile: OnboardingProfile;
  busy: boolean;
  error?: string;
  onSubmit: (input: OnboardingInput) => Promise<boolean>;
}

export function OnboardingScreen({ profile, busy, error, onSubmit }: OnboardingScreenProps) {
  return (
    <OnboardingLayout>
      <header className={styles.header}>
        <h1>Set up your profile.</h1>
        <p>This helps personalize your experience.</p>
      </header>
      <OnboardingForm busy={busy} error={error} onSubmit={onSubmit} profile={profile} />
    </OnboardingLayout>
  );
}
