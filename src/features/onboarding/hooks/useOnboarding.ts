import { useCallback, useEffect, useRef, useState } from 'react';
import type { OnboardingInput, OnboardingProfile } from '../model';
import { createOnboardingService, type OnboardingService } from '../onboardingService';
import { toUserFacingOnboardingError } from '../onboardingMessages';

export type OnboardingLoadStatus = 'loading' | 'ready' | 'error';

export function useOnboarding(userId: string, injectedService?: OnboardingService) {
  const serviceRef = useRef<OnboardingService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createOnboardingService();

  const [status, setStatus] = useState<OnboardingLoadStatus>('loading');
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const nextProfile = await serviceRef.current!.getProfile(userId);
      setProfile(nextProfile);
      setStatus('ready');
      return nextProfile;
    } catch (caught) {
      setProfile(null);
      setStatus('error');
      setError(toUserFacingOnboardingError(caught));
      return null;
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const complete = useCallback(async (input: OnboardingInput) => {
    setSubmitting(true);
    setError('');
    try {
      await serviceRef.current!.complete(input);
      const nextProfile = await serviceRef.current!.getProfile(userId);
      setProfile(nextProfile);
      setStatus('ready');
      return true;
    } catch (caught) {
      setError(toUserFacingOnboardingError(caught));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [userId]);

  return {
    status,
    profile,
    submitting,
    error,
    retry: load,
    complete,
  };
}
