import { useEffect, useRef, useState } from 'react';
import { createPlatformAccessService, type PlatformAccess, type PlatformAccessService } from '../platformAccessService';

export type PlatformAccessLoadState = 'loading' | 'ready' | 'error';

export function usePlatformAccess(injectedService?: PlatformAccessService) {
  const serviceRef = useRef<PlatformAccessService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createPlatformAccessService();

  const [state, setState] = useState<PlatformAccessLoadState>('loading');
  const [access, setAccess] = useState<PlatformAccess | null>(null);

  useEffect(() => {
    let cancelled = false;
    void serviceRef.current!.load().then((next) => {
      if (cancelled) return;
      setAccess(next);
      setState('ready');
    }).catch(() => {
      if (cancelled) return;
      setAccess(null);
      setState('error');
    });
    return () => { cancelled = true; };
  }, []);

  return { state, access };
}
