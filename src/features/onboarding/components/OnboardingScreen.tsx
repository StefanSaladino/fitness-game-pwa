import type { OnboardingInput, OnboardingProfile } from '../model';
import { OnboardingForm } from './OnboardingForm';

interface OnboardingScreenProps {
  profile: OnboardingProfile;
  busy: boolean;
  error?: string;
  onSubmit: (input: OnboardingInput) => Promise<boolean>;
}

export function OnboardingScreen({ profile, busy, error, onSubmit }: OnboardingScreenProps) {
  return (
    <main className="onboarding-shell">
      <section className="onboarding-intro">
        <div className="onboarding-stepper" aria-label="Onboarding progress">
          <span className="onboarding-stepper__step onboarding-stepper__step--active">1</span>
          <span className="onboarding-stepper__line" />
          <span className="onboarding-stepper__step">2</span>
        </div>
        <p className="eyebrow">PROFILE SETUP</p>
        <h1>Build your lifting identity.</h1>
        <p>Your username, timezone, and weekly lifting target become the foundation for fair scoring and group competition.</p>
        <div className="onboarding-rule-card">
          <strong>Scoring stays fair.</strong>
          <span>A qualifying lifting day earns 50 workout XP, with additional capped XP for meaningful exercises and personal progression. Cardio stays a small bonus and never replaces lifting.</span>
        </div>
      </section>

      <section className="onboarding-card" aria-labelledby="onboarding-form-title">
        <p className="eyebrow">STEP 1 OF 2</p>
        <h2 id="onboarding-form-title">Your profile</h2>
        <p className="support-copy">Group creation or joining comes immediately after this profile step in Phase 5.3B.</p>
        <OnboardingForm busy={busy} error={error} onSubmit={onSubmit} profile={profile} />
      </section>
    </main>
  );
}
