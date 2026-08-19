import { useCallback, useEffect, useRef, useState } from 'react';
import { toUserFacingGroupError } from '../groupMessages';
import { createGroupService, type GroupService } from '../groupService';
import type { GroupSummary } from '../model';

export type GroupsLoadStatus = 'loading' | 'ready' | 'error';

export function useGroups(userId: string, injectedService?: GroupService) {
  const serviceRef = useRef<GroupService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createGroupService();

  const [status, setStatus] = useState<GroupsLoadStatus>('loading');
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const nextGroups = await serviceRef.current!.listGroups(userId);
      setGroups(nextGroups);
      setStatus('ready');
      return nextGroups;
    } catch (caught) {
      setGroups([]);
      setStatus('error');
      setError(toUserFacingGroupError(caught));
      return null;
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, groups, error, retry: load };
}
