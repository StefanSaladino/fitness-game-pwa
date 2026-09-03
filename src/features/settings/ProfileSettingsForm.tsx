import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button, SelectField, TextField } from '../../components/ui';
import type { OnboardingField, OnboardingProfile } from '../onboarding';
import { getTimeZoneOptions } from '../onboarding/timezones';
import { validateOnboardingInput } from '../onboarding/validation';
import { WeeklyTargetPicker } from '../onboarding/components/WeeklyTargetPicker';
import type { WeightDisplayUnit } from '../workout';
import type { ProfileSettingsInput } from './settingsService';
import styles from './SettingsScreen.module.css';

interface Props {
  profile: OnboardingProfile;
  busy: boolean;
  error: string;
  notice: string;
  onSave(input: ProfileSettingsInput): Promise<OnboardingProfile | null>;
  mode?: 'profile' | 'training' | 'both';
}

type FieldErrors = Partial<Record<OnboardingField, string>>;
type CopyState = 'idle' | 'copied' | 'error';

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard copy failed.');
}

export function ProfileSettingsForm({ profile, busy, error, notice, onSave, mode = 'both' }: Props) {
  const [values, setValues] = useState<ProfileSettingsInput>({
    username: profile.username,
    displayName: profile.displayName,
    timezone: profile.timezone,
    weeklyTarget: profile.pendingWeeklyWorkoutTarget ?? profile.weeklyWorkoutTarget,
    preferredWeightUnit: profile.preferredWeightUnit,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const timezoneOptions = useMemo(() => getTimeZoneOptions(values.timezone), [values.timezone]);
  const showProfile = mode === 'profile' || mode === 'both';
  const showTraining = mode === 'training' || mode === 'both';
  const saveLabel = mode === 'profile' ? 'Save profile' : mode === 'training' ? 'Save training preferences' : 'Save profile & training';

  useEffect(() => {
    setValues({
      username: profile.username,
      displayName: profile.displayName,
      timezone: profile.timezone,
      weeklyTarget: profile.pendingWeeklyWorkoutTarget ?? profile.weeklyWorkoutTarget,
      preferredWeightUnit: profile.preferredWeightUnit,
    });
    setCopyState('idle');
  }, [profile]);

  const update = <K extends keyof ProfileSettingsInput>(key: K, value: ProfileSettingsInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateOnboardingInput(values);
    const nextErrors: FieldErrors = {};
    for (const issue of validation.issues) nextErrors[issue.field] = issue.message;
    setFieldErrors(nextErrors);
    if (validation.issues.length > 0) return;
    await onSave({ ...validation.value, preferredWeightUnit: values.preferredWeightUnit });
  };

  const copyInviteId = async () => {
    if (!profile.profileCode) return;
    try {
      await copyText(profile.profileCode);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  return (
    <form className={styles.profileForm} onSubmit={submit} noValidate>
      {showProfile ? <section className={styles.section} aria-labelledby="settings-profile-heading" data-app-surface="category">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>IDENTITY</p>
            <h2 id="settings-profile-heading">Profile</h2>
          </div>
        </div>
        <div className={styles.inviteCodeRow}>
          <div className={styles.inviteCodeValue}>
            <span>Invite ID</span>
            <code>{profile.profileCode ?? 'Unavailable'}</code>
          </div>
          <Button
            aria-label="Copy invite ID"
            disabled={!profile.profileCode}
            onClick={() => void copyInviteId()}
            variant="secondary"
          >
            {copyState === 'copied' ? 'Copied' : 'Copy'}
          </Button>
          {copyState === 'error' ? <p className={styles.copyError} role="alert">Couldn’t copy the invite ID. Press and hold the full code to copy it manually.</p> : null}
        </div>
        <div className={styles.formGrid}>
          <TextField
            autoCapitalize="none"
            autoComplete="username"
            error={fieldErrors.username}
            hint="3–32 lowercase letters, numbers, or underscores"
            label="Username"
            onChange={(event) => update('username', event.target.value)}
            spellCheck={false}
            value={values.username}
          />
          <TextField
            autoComplete="name"
            error={fieldErrors.displayName}
            hint="This is how other members see you"
            label="Display name"
            onChange={(event) => update('displayName', event.target.value)}
            value={values.displayName}
          />
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {notice ? <p className={styles.success} role="status">{notice}</p> : null}
        <Button disabled={busy} type="submit">{busy ? 'Saving…' : saveLabel}</Button>
      </section> : null}

      {showTraining ? <section className={styles.section} aria-labelledby="settings-training-heading" data-app-surface="category">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>PREFERENCES</p>
            <h2 id="settings-training-heading">Training</h2>
          </div>
        </div>
        <div className={styles.formGrid}>
          <SelectField
            error={fieldErrors.timezone}
            hint="Scoring dates and weekly reset use this timezone"
            label="Timezone"
            onChange={(event) => update('timezone', event.target.value)}
            value={values.timezone}
          >
            {timezoneOptions.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
          </SelectField>
          <SelectField
            hint="Workout history stays stored in canonical kilograms"
            label="Preferred weight unit"
            onChange={(event) => update('preferredWeightUnit', event.target.value as WeightDisplayUnit)}
            value={values.preferredWeightUnit}
          >
            <option value="KG">Kilograms (kg)</option>
            <option value="LB">Pounds (lb)</option>
          </SelectField>
        </div>
        <div className={styles.weeklyTarget}>
          <WeeklyTargetPicker
            disabled={busy}
            error={fieldErrors.weeklyTarget}
            onChange={(target) => update('weeklyTarget', target)}
            value={values.weeklyTarget}
          />
          <p className={styles.supportCopy}>
            {profile.pendingWeeklyWorkoutTarget === null
              ? 'A changed target starts next Monday and does not rewrite past weeks.'
              : `${profile.pendingWeeklyWorkoutTarget} days is currently scheduled for next week. Choose ${profile.weeklyWorkoutTarget} to cancel it.`}
          </p>
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {notice ? <p className={styles.success} role="status">{notice}</p> : null}
        <Button disabled={busy} type="submit">{busy ? 'Saving…' : saveLabel}</Button>
      </section> : null}
    </form>
  );
}
