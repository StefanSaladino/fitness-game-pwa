import { TopSetMark } from '../brand/TopSetMark';
import { Icon } from '../ui';
import type { AppSection, NavigationItem } from './navigation';
import styles from './DesktopSidebar.module.css';

interface DesktopSidebarProps {
  activeItem: AppSection;
  items: NavigationItem[];
  userLabel: string;
  userMeta?: string;
  onNavigate?: (item: AppSection) => void;
  onSignOut?: () => void;
}

export function DesktopSidebar({ activeItem, items, userLabel, userMeta, onNavigate, onSignOut }: DesktopSidebarProps) {
  const initial = userLabel.trim().slice(0, 1).toUpperCase() || 'U';

  return (
    <aside className={styles.sidebar} aria-label="Primary">
      <div className={styles.brand} aria-label="Top Set">
        <span className={styles.brandMark} aria-hidden="true"><TopSetMark size={18} /></span>
        <span className={styles.brandName}>Top Set</span>
      </div>

      <nav className={styles.nav}>
        {items.map((item) => {
          const active = item.id === activeItem;
          return (
            <button
              aria-current={active ? 'page' : undefined}
              className={`${styles.navItem}${active ? ` ${styles.navItemActive}` : ''}`}
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              type="button"
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.account}>
        <button
          aria-label={`Open Profile and Settings for ${userLabel}`}
          className={styles.accountButton}
          onClick={() => onNavigate?.('profile')}
          type="button"
        >
          <span className={styles.avatar} aria-hidden="true">{initial}</span>
          <span className={styles.accountCopy}>
            <strong>{userLabel}</strong>
            {userMeta && <span>{userMeta}</span>}
          </span>
        </button>
        {onSignOut && (
          <button aria-label="Sign out" className={styles.signOut} onClick={onSignOut} type="button">
            <Icon name="logout" size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
