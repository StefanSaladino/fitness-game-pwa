import { useState } from 'react';
import type { PwaService } from './pwaService';
import { usePwaLifecycle } from './usePwaLifecycle';
import styles from './PwaStatus.module.css';

interface PwaStatusProps {
  service?: PwaService;
}

export function PwaStatus({ service }: PwaStatusProps) {
  const pwa = usePwaLifecycle(service);
  const [busy, setBusy] = useState<'install' | 'update' | 'storage' | null>(null);

  const install = async () => {
    setBusy('install');
    try {
      await pwa.install();
    } finally {
      setBusy(null);
    }
  };

  const protectStorage = async () => {
    setBusy('storage');
    try {
      await pwa.protectStorage();
    } finally {
      setBusy(null);
    }
  };

  const update = () => {
    setBusy('update');
    const applying = pwa.applyUpdate();
    if (!applying) setBusy(null);
  };

  if (pwa.updateAvailable || pwa.applyingUpdate) {
    return (
      <section className={styles.notice} role="status" aria-live="polite" data-kind="update">
        <div>
          <strong>{pwa.applyingUpdate ? 'Applying update' : 'Update ready'}</strong>
          <span>{pwa.applyingUpdate ? 'The app will reopen on the new version.' : 'Reload when you’re ready. Active lifts recover after reload.'}</span>
        </div>
        {!pwa.applyingUpdate ? (
          <button className={styles.action} disabled={busy !== null} onClick={update} type="button">
            Update app
          </button>
        ) : null}
      </section>
    );
  }

  if (!pwa.online) {
    return (
      <section className={styles.notice} role="status" aria-live="polite" data-kind="offline">
        <div>
          <strong>Offline</strong>
          <span>The app shell is available. Workout changes stay on this device until you reconnect.</span>
        </div>
      </section>
    );
  }

  if (pwa.installAvailable && !pwa.standalone) {
    return (
      <section className={styles.notice} role="status" aria-live="polite" data-kind="install">
        <div>
          <strong>Install Workout Game</strong>
          <span>Open it like an app and keep the workout shell available offline.</span>
        </div>
        <button className={styles.action} disabled={busy !== null} onClick={() => void install()} type="button">
          {busy === 'install' ? 'Opening…' : 'Install'}
        </button>
      </section>
    );
  }

  if (pwa.manualInstallAvailable && !pwa.standalone) {
    return (
      <section className={styles.notice} role="status" aria-live="polite" data-kind="ios-install">
        <div>
          <strong>Add Workout Game to Home Screen</strong>
          <span>Use Share → Add to Home Screen. Keep Open as Web App enabled when that option is shown.</span>
        </div>
      </section>
    );
  }

  if (pwa.standalone && pwa.storagePersistence === 'best-effort' && pwa.storagePersistenceRequestAvailable) {
    return (
      <section className={styles.notice} role="status" aria-live="polite" data-kind="storage">
        <div>
          <strong>Protect offline workout data</strong>
          <span>Storage is currently best effort. Request persistent storage to reduce eviction risk for unsynced changes.</span>
        </div>
        <button className={styles.action} disabled={busy !== null} onClick={() => void protectStorage()} type="button">
          {busy === 'storage' ? 'Checking…' : 'Protect data'}
        </button>
      </section>
    );
  }

  return null;
}
