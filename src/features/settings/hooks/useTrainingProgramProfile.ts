import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createTrainingProgramProfileService,
  type TrainingProgramProfile,
  type TrainingProgramProfileService,
  type TrainingProgramProfileUpdate,
} from '../trainingProgramProfileService';

function messageFromError(caught: unknown): string {
  if (caught instanceof Error && caught.message.includes('Training program access profile changed')) {
    return 'Your equipment profile changed elsewhere. Reload it and try again.';
  }
  return 'Couldn’t update your training equipment right now.';
}

export function useTrainingProgramProfile(
  userId: string,
  injectedService?: TrainingProgramProfileService,
) {
  const serviceRef = useRef<TrainingProgramProfileService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = injectedService ?? createTrainingProgramProfileService();
  }

  const [profile, setProfile] = useState<TrainingProgramProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProfile(await serviceRef.current!.load(userId));
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async (
    input: Omit<TrainingProgramProfileUpdate, 'expectedRevision'>,
  ) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = await serviceRef.current!.update({
        ...input,
        expectedRevision: profile?.revision ?? 0,
      });
      setProfile(next);
      setNotice('Training equipment saved.');
      return next;
    } catch (caught) {
      setError(messageFromError(caught));
      return null;
    } finally {
      setBusy(false);
    }
  }, [profile?.revision]);

  return {
    profile,
    loading,
    busy,
    error,
    notice,
    reload: load,
    save,
  };
}
