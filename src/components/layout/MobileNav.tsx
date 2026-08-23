import { Icon } from '../ui';
import type { AppSection, NavigationItem } from './navigation';
import styles from './MobileNav.module.css';

interface MobileNavProps {
  activeItem: AppSection;
  items: NavigationItem[];
  onNavigate?: (item: AppSection) => void;
}

export function MobileNav({ activeItem, items, onNavigate }: MobileNavProps) {
  return (
    <nav className={styles.nav} aria-label="Primary">
      {items.map((item) => {
        const active = item.id === activeItem;
        return (
          <button
            aria-current={active ? 'page' : undefined}
            className={`${styles.item}${active ? ` ${styles.itemActive}` : ''}`}
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            type="button"
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
