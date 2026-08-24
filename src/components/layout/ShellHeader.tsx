import { Icon } from '../ui';
import type { AppSection } from './navigation';
import styles from './ShellHeader.module.css';

interface ShellHeaderProps {
  userLabel: string;
  title?: string;
  onNavigate?: (item: AppSection) => void;
}

export function ShellHeader({ userLabel, title, onNavigate }: ShellHeaderProps) {
  if (title) {
    return (
      <header className={`${styles.header} ${styles.titledHeader}`}>
        <span className={styles.titleSpacer} aria-hidden="true" />
        <span className={styles.pageTitle}>{title}</span>
        <button
          aria-label={`Open Profile and Settings for ${userLabel}`}
          className={styles.iconAccount}
          onClick={() => onNavigate?.('profile')}
          type="button"
        >
          <Icon name="settings" size={20} />
        </button>
      </header>
    );
  }

  return (
    <header className={styles.header}>
      <span className={styles.brandName}>Top Set</span>
      <button
        aria-label={`Open Profile and Settings for ${userLabel}`}
        className={styles.iconAccount}
        onClick={() => onNavigate?.('profile')}
        type="button"
      >
        <Icon name="settings" size={20} />
      </button>
    </header>
  );
}
