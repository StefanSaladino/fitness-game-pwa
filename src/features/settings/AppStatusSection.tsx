import appPackage from '../../../package.json';
import { useState } from 'react';
import { Button } from '../../components/ui';
import type { PwaService } from '../../pwa/pwaService';
import { usePwaLifecycle } from '../../pwa/usePwaLifecycle';
import styles from './SettingsScreen.module.css';

interface Props { service?: PwaService }

function storageLabel(value: ReturnType<typeof usePwaLifecycle>['storagePersistence']) {
  if (value === 'persistent') return 'Persistent';
  if (value === 'best-effort') return 'Best effort';
  if (value === 'unsupported') return 'Not reported by this browser';
  return 'Checking…';
}

export function AppStatusSection({ service }: Props) {
  const pwa = usePwaLifecycle(service);
  const [busy, setBusy] = useState<'install' | 'storage' | 'update' | null>(null);

  const install = async () => {
    setBusy('install');
    try { await pwa.install(); } finally { setBusy(null); }
  };
  const protect = async () => {
    setBusy('storage');
    try { await pwa.protectStorage(); } finally { setBusy(null); }
  };
  const update = () => {
    setBusy('update');
    if (!pwa.applyUpdate()) setBusy(null);
  };

  return (
    <section className={styles.section} aria-labelledby="settings-app-heading" data-app-surface="category">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>PWA</p>
          <h2 id="settings-app-heading">App status</h2>
        </div>
      </div>
      <dl className={styles.detailList}>
        <div><dt>Version</dt><dd>{appPackage.version}</dd></div>
        <div><dt>Connectivity</dt><dd>{pwa.online ? 'Online' : 'Offline'}</dd></div>
        <div><dt>Installation</dt><dd>{pwa.standalone ? 'Installed app' : 'Browser tab'}</dd></div>
        <div><dt>Offline storage</dt><dd>{storageLabel(pwa.storagePersistence)}</dd></div>
        <div><dt>Update</dt><dd>{pwa.applyingUpdate ? 'Applying' : pwa.updateAvailable ? 'Ready' : 'Current'}</dd></div>
      </dl>
      <div className={styles.actions}>
        {pwa.installAvailable && !pwa.standalone ? (
          <Button disabled={busy !== null} onClick={() => void install()} variant="secondary">
            {busy === 'install' ? 'Opening…' : 'Install app'}
          </Button>
        ) : null}
        {pwa.manualInstallAvailable && !pwa.standalone ? <p className={styles.supportCopy}>On iPhone or iPad, use Share → Add to Home Screen.</p> : null}
        {pwa.storagePersistence === 'best-effort' && pwa.storagePersistenceRequestAvailable ? (
          <Button disabled={busy !== null} onClick={() => void protect()} variant="secondary">
            {busy === 'storage' ? 'Checking…' : 'Protect offline data'}
          </Button>
        ) : null}
        {pwa.updateAvailable && !pwa.applyingUpdate ? (
          <Button disabled={busy !== null} onClick={update}>{busy === 'update' ? 'Applying…' : 'Update app'}</Button>
        ) : null}
      </div>
      {pwa.serviceWorkerError ? <p className={styles.error} role="status">The offline app update check is temporarily unavailable.</p> : null}
    </section>
  );
}
