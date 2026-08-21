import { activateWaitingServiceWorker, registerServiceWorker, type RegisteredServiceWorker } from './registerServiceWorker';

export type InstallChoice = 'accepted' | 'dismissed' | 'unavailable';

export interface PwaSnapshot {
  online: boolean;
  standalone: boolean;
  installAvailable: boolean;
  updateAvailable: boolean;
  applyingUpdate: boolean;
  serviceWorkerError: boolean;
}

export interface PwaService {
  getSnapshot: () => PwaSnapshot;
  subscribe: (listener: () => void) => () => void;
  start: () => () => void;
  requestInstall: () => Promise<InstallChoice>;
  applyUpdate: () => boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type StandaloneNavigator = Navigator & { standalone?: boolean };

function isStandalone() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const displayMode = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches;
  return displayMode || Boolean((navigator as StandaloneNavigator).standalone);
}

function currentOnlineState() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

class BrowserPwaService implements PwaService {
  private snapshot: PwaSnapshot = {
    online: currentOnlineState(),
    standalone: isStandalone(),
    installAvailable: false,
    updateAvailable: false,
    applyingUpdate: false,
    serviceWorkerError: false,
  };

  private readonly listeners = new Set<() => void>();
  private installPrompt: BeforeInstallPromptEvent | null = null;
  private serviceWorker: RegisteredServiceWorker | null = null;
  private started = false;
  private cleanup: (() => void) | null = null;

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private update(next: Partial<PwaSnapshot>) {
    const snapshot = { ...this.snapshot, ...next };
    if (Object.keys(next).every((key) => snapshot[key as keyof PwaSnapshot] === this.snapshot[key as keyof PwaSnapshot])) return;
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }

  start = () => {
    if (this.started) return () => undefined;
    this.started = true;

    const mediaQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)')
      : null;

    const onOnline = () => this.update({ online: true });
    const onOffline = () => this.update({ online: false });
    const onDisplayModeChange = () => this.update({ standalone: isStandalone(), installAvailable: isStandalone() ? false : this.snapshot.installAvailable });
    const onBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      this.installPrompt = installEvent;
      this.update({ installAvailable: !isStandalone() });
    };
    const onAppInstalled = () => {
      this.installPrompt = null;
      this.update({ standalone: true, installAvailable: false });
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    mediaQuery?.addEventListener('change', onDisplayModeChange);

    let cancelled = false;
    void registerServiceWorker({
      onUpdateAvailable: (registration) => {
        if (cancelled) return;
        this.serviceWorker = { registration, dispose: this.serviceWorker?.dispose ?? (() => undefined) };
        this.update({ updateAvailable: true, serviceWorkerError: false });
      },
      onControllerChange: () => {
        if (cancelled || !this.snapshot.applyingUpdate) return;
        window.location.reload();
      },
      onError: () => {
        if (!cancelled) this.update({ serviceWorkerError: true });
      },
    }).then((registered) => {
      if (cancelled) {
        registered?.dispose();
        return;
      }
      this.serviceWorker = registered;
      if (registered?.registration.waiting && navigator.serviceWorker.controller) {
        this.update({ updateAvailable: true });
      }
    });

    this.cleanup = () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      mediaQuery?.removeEventListener('change', onDisplayModeChange);
      this.serviceWorker?.dispose();
      this.serviceWorker = null;
      this.started = false;
      this.cleanup = null;
    };

    return this.cleanup;
  };

  requestInstall = async (): Promise<InstallChoice> => {
    const prompt = this.installPrompt;
    if (!prompt || this.snapshot.standalone) return 'unavailable';

    this.installPrompt = null;
    this.update({ installAvailable: false });
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') this.update({ standalone: true });
    return choice.outcome;
  };

  applyUpdate = () => {
    const registration = this.serviceWorker?.registration ?? null;
    const activated = activateWaitingServiceWorker(registration);
    if (activated) this.update({ applyingUpdate: true, updateAvailable: false });
    return activated;
  };
}

export function createPwaService(): PwaService {
  return new BrowserPwaService();
}

export const browserPwaService = createPwaService();
