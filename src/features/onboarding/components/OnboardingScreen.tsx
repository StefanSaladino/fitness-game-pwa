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
        <p className={styles.eyebrow}>WELCOME TO TOP SET</p>
        <h1>Set up your profile</h1>
        <p>Three short steps, then you’re ready to train.</p>
      </header>
      <OnboardingForm busy={busy} error={error} onSubmit={onSubmit} profile={profile} />
    </OnboardingLayout>
  );
}
