import { useEffect, useSyncExternalStore } from 'react';
import { browserPwaService, type PwaService } from './pwaService';

export function usePwaLifecycle(service: PwaService = browserPwaService) {
  const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot);

  useEffect(() => service.start(), [service]);

  return {
    ...snapshot,
    install: service.requestInstall,
    protectStorage: service.requestPersistentStorage,
    applyUpdate: service.applyUpdate,
  };
}
