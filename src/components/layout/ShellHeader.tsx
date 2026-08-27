import { Icon } from '../ui';
import type { AppSection } from './navigation';
import styles from './ShellHeader.module.css';

interface ShellHeaderProps {
  userLabel: string;
  title?: string;
  onNavigate?: (item: AppSection) => void;
  onSignOut?: () => void;
}

function HeaderActions({ userLabel, onNavigate, onSignOut }: Pick<ShellHeaderProps, 'userLabel' | 'onNavigate' | 'onSignOut'>) {
  return (
    <div className={styles.actions}>
      <span className={styles.messageSlot} data-app-message-slot="mobile" />
      <button
        aria-label={`Open Profile and Settings for ${userLabel}`}
        className={styles.iconAction}
        onClick={() => onNavigate?.('profile')}
        type="button"
      >
        <Icon name="settings" size={20} />
      </button>
      {onSignOut ? (
        <button aria-label="Sign out" className={`${styles.iconAction} ${styles.signOut}`} onClick={onSignOut} type="button">
          <Icon name="logout" size={19} />
        </button>
      ) : null}
    </div>
  );
}

export function ShellHeader({ userLabel, title, onNavigate, onSignOut }: ShellHeaderProps) {
  if (title) {
    return (
      <header className={`${styles.header} ${styles.titledHeader}`}>
        <span className={styles.titleSpacer} aria-hidden="true" />
        <span className={styles.pageTitle}>{title}</span>
        <HeaderActions onNavigate={onNavigate} onSignOut={onSignOut} userLabel={userLabel} />
      </header>
    );
  }

  return (
    <header className={styles.header}>
      <span className={styles.brandName}>Top Set</span>
      <HeaderActions onNavigate={onNavigate} onSignOut={onSignOut} userLabel={userLabel} />
    </header>
  );
}
