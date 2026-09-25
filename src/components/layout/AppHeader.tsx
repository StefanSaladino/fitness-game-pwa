import { Icon } from '../ui';
import { BackButton } from './BackButton';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  title: string;
  userLabel: string;
  titleAsHeading?: boolean;
  backLabel?: string;
  hideOnDesktop?: boolean;
  messageSlot?: 'mobile' | 'settings' | null;
  onBack?: () => void;
  onOpenSettings?: () => void;
  onSignOut?: () => void;
}

export function AppHeader({
  title,
  userLabel,
  titleAsHeading = false,
  backLabel = 'Go back',
  hideOnDesktop = false,
  messageSlot = 'mobile',
  onBack,
  onOpenSettings,
  onSignOut,
}: AppHeaderProps) {
  return (
    <header className={`${styles.header}${hideOnDesktop ? ` ${styles.hideOnDesktop}` : ''}`}>
      <div className={styles.leftActions}>
        {onBack ? <BackButton label={backLabel} onClick={onBack} /> : null}
        {onOpenSettings ? (
          <button
            aria-label={`Open Profile and Settings for ${userLabel}`}
            className={styles.iconAction}
            onClick={onOpenSettings}
            type="button"
          >
            <Icon name="settings" size={20} />
          </button>
        ) : null}
      </div>

      {titleAsHeading ? <h1 className={styles.pageTitle}>{title}</h1> : <strong className={styles.pageTitle}>{title}</strong>}

      <div className={styles.rightActions}>
        {messageSlot ? <span className={styles.messageSlot} data-app-message-slot={messageSlot} /> : null}
        {onSignOut ? (
          <button aria-label="Sign out" className={`${styles.iconAction} ${styles.signOut}`} onClick={onSignOut} type="button">
            <Icon name="logout" size={19} />
          </button>
        ) : null}
      </div>
    </header>
  );
}
