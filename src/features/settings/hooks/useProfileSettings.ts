import { useCallback, useEffect, useRef, useState } from 'react';
import type { OnboardingProfile } from '../../onboarding';
import { createSettingsService, type ProfileSettingsInput, type SettingsService } from '../settingsService';
import { toUserFacingSettingsError } from '../settingsMessages';

export function useProfileSettings(
  initialProfile: OnboardingProfile,
  injectedService?: SettingsService,
  onProfileChanged?: () => Promise<unknown> | unknown,
) {
  const serviceRef = useRef<SettingsService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createSettingsService();
  const [profile, setProfile] = useState(initialProfile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => setProfile(initialProfile), [initialProfile]);

  const save = useCallback(async (input: ProfileSettingsInput) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = await serviceRef.current!.update(input);
      setProfile(next);
      setNotice(next.pendingWeeklyWorkoutTarget === null
        ? 'Profile settings saved.'
        : `Profile settings saved. Your ${next.pendingWeeklyWorkoutTarget}-day target starts next week.`);
      await onProfileChanged?.();
      return next;
    } catch (caught) {
      setError(toUserFacingSettingsError(caught));
      return null;
    } finally {
      setBusy(false);
    }
  }, [onProfileChanged]);

  return { profile, busy, error, notice, save };
}
