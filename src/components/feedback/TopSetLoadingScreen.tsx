import { TopSetMark } from '../brand/TopSetMark';
import styles from './TopSetLoadingScreen.module.css';

interface TopSetLoadingScreenProps {
  label?: string;
}

export function TopSetLoadingScreen({ label = 'Loading…' }: TopSetLoadingScreenProps) {
  return (
    <main className={styles.root} data-system-state="loading">
      <div className={styles.content} data-app-state role="status" aria-live="polite">
        <TopSetMark className={styles.mark} size={34} />
        <span className={styles.name}>TOP SET</span>
        <span className={styles.loader} aria-hidden="true" />
        <p>{label}</p>
      </div>
    </main>
  );
}
