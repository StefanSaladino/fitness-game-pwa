import { TopSetMark } from '../brand/TopSetMark';
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
      <div className={styles.brand} aria-label="Top Set">
        <span className={styles.brandMark} aria-hidden="true"><TopSetMark size={17} /></span>
        <span className={styles.brandName}>Top Set</span>
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
