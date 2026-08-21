export interface ServiceWorkerLifecycleCallbacks {
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  onControllerChange?: () => void;
  onError?: (error: unknown) => void;
}

export interface RegisteredServiceWorker {
  registration: ServiceWorkerRegistration;
  dispose: () => void;
}

function watchInstallingWorker(
  registration: ServiceWorkerRegistration,
  callbacks: ServiceWorkerLifecycleCallbacks,
) {
  const worker = registration.installing;
  if (!worker) return () => undefined;

  const onStateChange = () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      callbacks.onUpdateAvailable?.(registration);
    }
  };

  worker.addEventListener('statechange', onStateChange);
  return () => worker.removeEventListener('statechange', onStateChange);
}

export async function registerServiceWorker(
  callbacks: ServiceWorkerLifecycleCallbacks = {},
): Promise<RegisteredServiceWorker | null> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    let stopWatchingInstalling: () => void = () => undefined;

    if (registration.waiting && navigator.serviceWorker.controller) {
      callbacks.onUpdateAvailable?.(registration);
    }

    const onUpdateFound = () => {
      stopWatchingInstalling();
      stopWatchingInstalling = watchInstallingWorker(registration, callbacks);
    };

    const onControllerChange = () => callbacks.onControllerChange?.();

    registration.addEventListener('updatefound', onUpdateFound);
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return {
      registration,
      dispose: () => {
        stopWatchingInstalling();
        registration.removeEventListener('updatefound', onUpdateFound);
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      },
    };
  } catch (error) {
    callbacks.onError?.(error);
    return null;
  }
}

export function activateWaitingServiceWorker(registration: ServiceWorkerRegistration | null) {
  if (!registration?.waiting) return false;
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}
