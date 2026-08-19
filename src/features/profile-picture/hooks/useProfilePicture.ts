import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfilePictureRecord } from '../model';
import { toUserFacingProfilePictureError } from '../profilePictureMessages';
import { createProfilePictureService, type ProfilePictureService } from '../profilePictureService';

export type ProfilePictureStatus = 'loading' | 'ready' | 'error';

export function useProfilePicture(userId: string, injectedService?: ProfilePictureService) {
  const serviceRef = useRef<ProfilePictureService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createProfilePictureService();

  const [status, setStatus] = useState<ProfilePictureStatus>('loading');
  const [picture, setPicture] = useState<ProfilePictureRecord>({ path: null, url: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const next = await serviceRef.current!.get(userId);
      setPicture(next);
      setStatus('ready');
      return next;
    } catch (caught) {
      setStatus('error');
      setError(toUserFacingProfilePictureError(caught));
      return null;
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const upload = useCallback(async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const stored = await serviceRef.current!.upload(userId, file, picture.path);
      setPicture(stored);
      setStatus('ready');
      return true;
    } catch (caught) {
      setError(toUserFacingProfilePictureError(caught));
      return false;
    } finally {
      setBusy(false);
    }
  }, [picture.path, userId]);

  const remove = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await serviceRef.current!.remove(userId, picture.path);
      setPicture({ path: null, url: null });
      setStatus('ready');
      return true;
    } catch (caught) {
      setError(toUserFacingProfilePictureError(caught));
      return false;
    } finally {
      setBusy(false);
    }
  }, [picture.path, userId]);

  return { status, picture, busy, error, retry: load, upload, remove };
}
