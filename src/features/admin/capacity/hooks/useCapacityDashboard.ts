import { useCallback, useEffect, useRef, useState } from 'react';
import { createCapacityDashboardService, type CapacityDashboardService } from '../capacityDashboardService';
import type { CapacityDashboardSnapshot } from '../dashboardModel';

export type CapacityDashboardState = 'loading' | 'ready' | 'error';

export function useCapacityDashboard(injectedService?: CapacityDashboardService) {
  const serviceRef = useRef<CapacityDashboardService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createCapacityDashboardService();

  const [state, setState] = useState<CapacityDashboardState>('loading');
  const [snapshot, setSnapshot] = useState<CapacityDashboardSnapshot | null>(null);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setState('loading');
    setError('');
    try {
      const next = await serviceRef.current!.load();
      setSnapshot(next);
      setState('ready');
      return next;
    } catch {
      setError('Capacity telemetry is unavailable.');
      setState('error');
      return null;
    }
  }, []);

  useEffect(() => { void load(true); }, [load]);

  const captureSnapshot = useCallback(async () => {
    if (capturing) return false;
    setCapturing(true);
    setError('');
    try {
      await serviceRef.current!.captureSnapshot();
      await load(false);
      return true;
    } catch {
      setError('The capacity snapshot could not be recorded.');
      return false;
    } finally {
      setCapturing(false);
    }
  }, [capturing, load]);

  return {
    state,
    snapshot,
    error,
    capturing,
    refresh: () => load(false),
    captureSnapshot,
  };
}
