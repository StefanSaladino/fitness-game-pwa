import { useCallback, useEffect, useRef, useState } from 'react';
import { toUserFacingDashboardError } from '../dashboardMessages';
import { createDashboardService, type DashboardService } from '../dashboardService';
import type { DashboardLoadInput, DashboardSnapshot } from '../model';

export type DashboardStatus = 'loading' | 'ready' | 'error';

export function useDashboard(input: DashboardLoadInput, injectedService?: DashboardService) {
  const serviceRef = useRef<DashboardService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createDashboardService();

  const [status, setStatus] = useState<DashboardStatus>('loading');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const next = await serviceRef.current!.load(input);
      setSnapshot(next);
      setStatus('ready');
      return next;
    } catch (caught) {
      setError(toUserFacingDashboardError(caught));
      setStatus('error');
      return null;
    }
  }, [input.groupId, input.timezone, input.userId, input.weeklyTarget]);

  useEffect(() => { void load(); }, [load]);

  return { status, snapshot, error, retry: load };
}
