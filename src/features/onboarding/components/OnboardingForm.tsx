import { useMemo, useState, type FormEvent } from 'react';
import { Button, SelectField, TextField } from '../../../components/ui';
import type { OnboardingField, OnboardingInput, OnboardingProfile } from '../model';
import { getBrowserTimeZone, getTimeZoneOptions } from '../timezones';
import { validateOnboardingInput } from '../validation';
import { WeeklyTargetPicker } from './WeeklyTargetPicker';

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
    <form className="onboarding-form" onSubmit={submit} noValidate>
      <div className="onboarding-form__grid">
        <TextField
          autoCapitalize="none"
          autoComplete="username"
          error={fieldErrors.username}
          hint="3–32 lowercase letters, numbers, or underscores"
          label="Username"
          onChange={(event) => update('username', event.target.value)}
          placeholder="ironwolf_23"
          spellCheck={false}
          value={values.username}
        />
        <TextField
          autoComplete="name"
          error={fieldErrors.displayName}
          hint="This is how friends will see you"
          label="Display name"
          onChange={(event) => update('displayName', event.target.value)}
          value={values.displayName}
        />
        <SelectField
          error={fieldErrors.timezone}
          hint="Your scoring date and weekly reset use this timezone"
          label="Timezone"
          onChange={(event) => update('timezone', event.target.value)}
          value={values.timezone}
        >
          {timezoneOptions.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
        </SelectField>
      </div>

      <WeeklyTargetPicker
        disabled={busy}
        error={fieldErrors.weeklyTarget}
        onChange={(target) => update('weeklyTarget', target)}
        value={values.weeklyTarget}
      />

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="onboarding-summary" aria-live="polite">
        <span className="onboarding-summary__value">{values.weeklyTarget}</span>
        <div>
          <strong>workout days per week</strong>
          <p>You can schedule a different target later; changes apply from the next week rather than rewriting history.</p>
        </div>
      </div>

      <Button disabled={busy} fullWidth type="submit">{busy ? 'Saving profile…' : 'Complete onboarding'}</Button>
    </form>
  );
}
