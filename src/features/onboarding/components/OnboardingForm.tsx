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

function initialUsername(profile: OnboardingProfile): string {
  return profile.username.startsWith('u_') ? '' : profile.username;
}

export function OnboardingForm({ profile, busy, error, onSubmit }: OnboardingFormProps) {
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateOnboardingInput(values);
    const nextErrors: FieldErrors = {};
    for (const issue of validation.issues) nextErrors[issue.field] = issue.message;
    setFieldErrors(nextErrors);
    if (validation.issues.length > 0) return;
    await onSubmit(validation.value);
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
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

      <SelectField
        className={styles.field}
        error={fieldErrors.timezone}
        label="Timezone"
        onChange={(event) => update('timezone', event.target.value)}
        value={values.timezone}
      >
        {timezoneOptions.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
      </SelectField>

      <WeeklyTargetPicker
        disabled={busy}
        error={fieldErrors.weeklyTarget}
        onChange={(target) => update('weeklyTarget', target)}
        value={values.weeklyTarget}
      />

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <Button className={styles.primaryButton} disabled={busy} fullWidth type="submit">
        {busy ? 'Saving profile…' : 'Complete setup'}
      </Button>
    </form>
  );
}
