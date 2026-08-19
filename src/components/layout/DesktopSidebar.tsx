import { Icon } from '../ui';
import type { AppSection, NavigationItem } from './navigation';

interface DesktopSidebarProps {
  activeItem: AppSection;
  items: NavigationItem[];
  userLabel: string;
  userMeta?: string;
  onNavigate?: (item: AppSection) => void;
  onSignOut?: () => void;
}

export function DesktopSidebar({ activeItem, items, userLabel, userMeta, onNavigate, onSignOut }: DesktopSidebarProps) {
  return (
    <aside className="desktop-sidebar" aria-label="Primary">
      <div className="brand-lockup" aria-label="Workout Game">
        <span className="brand-mark" aria-hidden="true">W</span>
        <span className="brand-name">Workout Game</span>
      </div>

      <nav className="desktop-sidebar__nav">
        {items.map((item) => {
          const active = item.id === activeItem;
          return (
            <button
              aria-current={active ? 'page' : undefined}
              className={`nav-item${active ? ' nav-item--active' : ''}`}
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

      <div className="desktop-sidebar__account">
        <div className="avatar-fallback" aria-hidden="true">{userLabel.slice(0, 1).toUpperCase()}</div>
        <div className="desktop-sidebar__account-copy">
          <strong>{userLabel}</strong>
          {userMeta && <span>{userMeta}</span>}
        </div>
        {onSignOut && (
          <button aria-label="Sign out" className="icon-button" onClick={onSignOut} type="button">
            <Icon name="logout" size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
