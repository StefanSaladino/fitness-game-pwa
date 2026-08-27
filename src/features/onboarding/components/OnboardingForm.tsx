import { useMemo, useState, type FormEvent } from 'react';
import { Button, SelectField, TextField } from '../../../components/ui';
import type { OnboardingField, OnboardingInput, OnboardingProfile } from '../model';
import { getBrowserTimeZone, getTimeZoneOptions } from '../timezones';
import { validateOnboardingInput } from '../validation';
import { WeeklyTargetPicker } from './WeeklyTargetPicker';
import styles from './OnboardingForm.module.css';

interface OnboardingFormProps {
  profile: OnboardingProfile;
  busy: boolean;
  error?: string;
  onSubmit: (input: OnboardingInput) => Promise<boolean>;
}

type FieldErrors = Partial<Record<OnboardingField, string>>;
type OnboardingStep = 0 | 1 | 2;

const steps: Array<{ label: string; fields: OnboardingField[] }> = [
  { label: 'Identity', fields: ['username', 'displayName'] },
  { label: 'Preferences', fields: ['timezone'] },
  { label: 'Goal', fields: ['weeklyTarget'] },
];

function initialUsername(profile: OnboardingProfile): string {
  return profile.username.startsWith('u_') ? '' : profile.username;
}

export function OnboardingForm({ profile, busy, error, onSubmit }: OnboardingFormProps) {
  const [step, setStep] = useState<OnboardingStep>(0);
  const [values, setValues] = useState<OnboardingInput>({
    username: initialUsername(profile),
    displayName: profile.displayName,
    timezone: profile.timezone || getBrowserTimeZone(),
    weeklyTarget: profile.weeklyWorkoutTarget || 3,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const timezoneOptions = useMemo(() => getTimeZoneOptions(values.timezone), [values.timezone]);

  function update<K extends keyof OnboardingInput>(key: K, value: OnboardingInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function issuesForStep(nextStep: OnboardingStep) {
    const validation = validateOnboardingInput(values);
    const relevantFields = new Set(steps[nextStep].fields);
    return {
      ...validation,
      issues: validation.issues.filter((issue) => relevantFields.has(issue.field)),
    };
  }

  function continueToNextStep() {
    const validation = issuesForStep(step);
    const nextErrors: FieldErrors = {};
    for (const issue of validation.issues) nextErrors[issue.field] = issue.message;
    setFieldErrors(nextErrors);
    if (validation.issues.length > 0) return;
    setStep((current) => Math.min(current + 1, 2) as OnboardingStep);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step < 2) {
      continueToNextStep();
      return;
    }
    const validation = validateOnboardingInput(values);
    const nextErrors: FieldErrors = {};
    for (const issue of validation.issues) nextErrors[issue.field] = issue.message;
    setFieldErrors(nextErrors);
    if (validation.issues.length > 0) return;
    await onSubmit(validation.value);
  }

  return (
    <form className={styles.form} data-onboarding-composition onSubmit={submit} noValidate>
      <ol aria-label="Profile setup progress" className={styles.steps}>
        {steps.map((item, index) => (
          <li aria-current={step === index ? 'step' : undefined} data-complete={index < step} key={item.label}>
            <span aria-hidden="true">{index + 1}</span>
            <small>{item.label}</small>
          </li>
        ))}
      </ol>

      <p className={styles.stepCount}>Step {step + 1} of {steps.length}</p>

      <section className={styles.stepSurface} data-app-surface="primary" key={step}>
        {step === 0 ? (
          <>
            <header className={styles.stepHeader}>
              <h2>Your identity</h2>
              <p>Choose how you appear throughout Top Set and inside your groups.</p>
            </header>
            <TextField
              autoCapitalize="none"
              autoComplete="username"
              className={styles.field}
              error={fieldErrors.username}
              hint="This will be visible to your groups."
              label="Username"
              onChange={(event) => update('username', event.target.value)}
              placeholder="Enter username"
              spellCheck={false}
              value={values.username}
            />
            <TextField
              autoComplete="name"
              className={styles.field}
              error={fieldErrors.displayName}
              hint="This is how others will see you."
              label="Display name"
              onChange={(event) => update('displayName', event.target.value)}
              placeholder="Enter display name"
              value={values.displayName}
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <header className={styles.stepHeader}>
              <h2>Training preferences</h2>
              <p>Your timezone keeps workout days, streaks, and weekly summaries accurate.</p>
            </header>
            <SelectField
              className={styles.field}
              error={fieldErrors.timezone}
              label="Timezone"
              onChange={(event) => update('timezone', event.target.value)}
              value={values.timezone}
            >
              {timezoneOptions.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
            </SelectField>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <header className={styles.stepHeader}>
              <h2>Your weekly goal</h2>
              <p>Set a realistic number of lifting days. You can change it later in Settings.</p>
            </header>
            <WeeklyTargetPicker
              disabled={busy}
              error={fieldErrors.weeklyTarget}
              onChange={(target) => update('weeklyTarget', target)}
              value={values.weeklyTarget}
            />
          </>
        ) : null}
      </section>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <footer className={styles.actions}>
        {step > 0 ? (
          <Button className={styles.backButton} disabled={busy} onClick={() => setStep((current) => Math.max(current - 1, 0) as OnboardingStep)} type="button" variant="secondary">
            Back
          </Button>
        ) : <span aria-hidden="true" />}
        <Button className={styles.primaryButton} disabled={busy} type="submit">
          {busy ? 'Saving profile…' : step === 2 ? 'Complete setup' : 'Continue'}
        </Button>
      </footer>
    </form>
  );
}
