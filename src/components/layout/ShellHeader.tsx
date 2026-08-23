import { Icon } from '../ui';
import type { AppSection } from './navigation';
import styles from './ShellHeader.module.css';

interface ShellHeaderProps {
  userLabel: string;
  onNavigate?: (item: AppSection) => void;
}

export function ShellHeader({ userLabel, onNavigate }: ShellHeaderProps) {
  const initial = userLabel.trim().slice(0, 1).toUpperCase() || 'U';

  return (
    <header className={styles.header}>
      <div className={styles.brand} aria-label="Fitness Game">
        <span className={styles.brandMark} aria-hidden="true">FG</span>
        <span className={styles.brandName}>Fitness Game</span>
      </div>

      <button
        aria-label={`Open Profile and Settings for ${userLabel}`}
        className={styles.account}
        onClick={() => onNavigate?.('profile')}
        type="button"
      >
        <span className={styles.avatar} aria-hidden="true">{initial}</span>
        <span className={styles.accountLabel}>{userLabel}</span>
        <Icon name="settings" size={17} />
      </button>
    </header>
  );
}
