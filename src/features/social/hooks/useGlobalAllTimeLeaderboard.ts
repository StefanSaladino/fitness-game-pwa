import { useCallback, useEffect, useRef, useState } from 'react';
import type { GlobalAllTimeLeaderboard } from '../model';
import { toUserFacingSocialError } from '../socialMessages';
import { createGroupSocialService, type GroupSocialService } from '../socialService';

export type GlobalAllTimeStatus = 'loading' | 'ready' | 'error';

export function useGlobalAllTimeLeaderboard(injectedService?: GroupSocialService) {
  const serviceRef = useRef<GroupSocialService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createGroupSocialService();

  const [status, setStatus] = useState<GlobalAllTimeStatus>('loading');
  const [error, setError] = useState('');
  const [leaderboard, setLeaderboard] = useState<GlobalAllTimeLeaderboard | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const next = await serviceRef.current!.loadGlobalAllTimeLeaderboard();
      setLeaderboard(next);
      setStatus('ready');
      return true;
    } catch (caught) {
      setError(toUserFacingSocialError(caught));
      setStatus('error');
      return false;
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { status, error, leaderboard, retry: load };
}
