import { activateWaitingServiceWorker, registerServiceWorker, type RegisteredServiceWorker } from './registerServiceWorker';

export type InstallChoice = 'accepted' | 'dismissed' | 'unavailable';
export type StoragePersistenceChoice = 'persistent' | 'best-effort' | 'unavailable';
export type PwaPlatform = 'ios' | 'android' | 'other';
export type PwaStoragePersistence = 'unknown' | 'persistent' | 'best-effort' | 'unsupported';

export interface PwaSnapshot {
  online: boolean;
  standalone: boolean;
  platform: PwaPlatform;
  installAvailable: boolean;
  manualInstallAvailable: boolean;
  updateAvailable: boolean;
  applyingUpdate: boolean;
  serviceWorkerError: boolean;
  storagePersistence: PwaStoragePersistence;
  storagePersistenceRequestAvailable: boolean;
}

export interface PwaService {
  getSnapshot: () => PwaSnapshot;
  subscribe: (listener: () => void) => () => void;
  start: () => () => void;
  requestInstall: () => Promise<InstallChoice>;
  requestPersistentStorage: () => Promise<StoragePersistenceChoice>;
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

function currentPlatform(): PwaPlatform {
  if (typeof navigator === 'undefined') return 'other';
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const touchPoints = navigator.maxTouchPoints || 0;
  if (/iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'other';
}

function hasStoragePersistenceStatus() {
  return typeof navigator !== 'undefined'
    && Boolean(navigator.storage)
    && typeof navigator.storage.persisted === 'function';
}

function canRequestStoragePersistence() {
  return hasStoragePersistenceStatus() && typeof navigator.storage.persist === 'function';
}

function shouldOfferManualInstall(platform: PwaPlatform, standalone: boolean, installAvailable: boolean) {
  return platform === 'ios' && !standalone && !installAvailable;
}

class BrowserPwaService implements PwaService {
  private snapshot: PwaSnapshot = {
    online: currentOnlineState(),
    standalone: isStandalone(),
    platform: currentPlatform(),
    installAvailable: false,
    manualInstallAvailable: shouldOfferManualInstall(currentPlatform(), isStandalone(), false),
    updateAvailable: false,
    applyingUpdate: false,
    serviceWorkerError: false,
    storagePersistence: hasStoragePersistenceStatus() ? 'unknown' : 'unsupported',
    storagePersistenceRequestAvailable: canRequestStoragePersistence(),
  };

  private readonly listeners = new Set<() => void>();
  private installPrompt: BeforeInstallPromptEvent | null = null;
  private serviceWorker: RegisteredServiceWorker | null = null;
  private started = false;
  private startConsumers = 0;
  private cleanup: (() => void) | null = null;
  private storageRefreshSequence = 0;

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

  private refreshStoragePersistence = async () => {
    const sequence = ++this.storageRefreshSequence;
    if (!hasStoragePersistenceStatus()) {
      this.update({ storagePersistence: 'unsupported', storagePersistenceRequestAvailable: false });
      return;
    }
    try {
      const persistent = await navigator.storage.persisted();
      if (sequence !== this.storageRefreshSequence) return;
      this.update({
        storagePersistence: persistent ? 'persistent' : 'best-effort',
        storagePersistenceRequestAvailable: canRequestStoragePersistence(),
      });
    } catch {
      if (sequence !== this.storageRefreshSequence) return;
      this.update({ storagePersistence: 'unsupported', storagePersistenceRequestAvailable: false });
    }
  };

  private refreshRuntimeState = () => {
    const standalone = isStandalone();
    const platform = currentPlatform();
    const installAvailable = standalone ? false : this.snapshot.installAvailable;
    this.update({
      online: currentOnlineState(),
      standalone,
      platform,
      installAvailable,
      manualInstallAvailable: shouldOfferManualInstall(platform, standalone, installAvailable),
    });
    void this.refreshStoragePersistence();
  };

  start = () => {
    this.startConsumers += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      this.startConsumers = Math.max(0, this.startConsumers - 1);
      if (this.startConsumers === 0) this.cleanup?.();
    };
    if (this.started) return release;
    this.started = true;

    const mediaQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)')
      : null;

    const onOnline = () => this.update({ online: true });
    const onOffline = () => this.update({ online: false });
    const onDisplayModeChange = () => this.refreshRuntimeState();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') this.refreshRuntimeState();
    };
    const onPageShow = () => this.refreshRuntimeState();
    const onBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      this.installPrompt = installEvent;
      this.update({ installAvailable: !isStandalone(), manualInstallAvailable: false });
    };
    const onAppInstalled = () => {
      this.installPrompt = null;
      this.update({ standalone: true, installAvailable: false, manualInstallAvailable: false });
      void this.refreshStoragePersistence();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibilityChange);
    mediaQuery?.addEventListener('change', onDisplayModeChange);

    this.refreshRuntimeState();

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
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      mediaQuery?.removeEventListener('change', onDisplayModeChange);
      this.serviceWorker?.dispose();
      this.serviceWorker = null;
      this.started = false;
      this.cleanup = null;
    };

    return release;
  };

  requestInstall = async (): Promise<InstallChoice> => {
    const prompt = this.installPrompt;
    if (!prompt || this.snapshot.standalone) return 'unavailable';

    this.installPrompt = null;
    this.update({ installAvailable: false, manualInstallAvailable: shouldOfferManualInstall(this.snapshot.platform, this.snapshot.standalone, false) });
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') this.update({ standalone: true, manualInstallAvailable: false });
    return choice.outcome;
  };

  requestPersistentStorage = async (): Promise<StoragePersistenceChoice> => {
    if (!canRequestStoragePersistence()) {
      this.update({ storagePersistenceRequestAvailable: false });
      return 'unavailable';
    }
    try {
      await navigator.storage.persist();
      const persistent = await navigator.storage.persisted();
      this.update({
        storagePersistence: persistent ? 'persistent' : 'best-effort',
        storagePersistenceRequestAvailable: false,
      });
      return persistent ? 'persistent' : 'best-effort';
    } catch {
      this.update({ storagePersistence: 'best-effort', storagePersistenceRequestAvailable: false });
      return 'best-effort';
    }
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
