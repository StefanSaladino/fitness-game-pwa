import type { ReactNode } from 'react';
import styles from './PlatformAdminShell.module.css';

export type PlatformAdminSection = 'capacity' | 'users' | 'moderation' | 'messages';

interface PlatformAdminShellProps {
  activeSection: PlatformAdminSection;
  children: ReactNode;
  mobileTitle: string;
  onBackToApp: () => void;
  onNavigate: (section: PlatformAdminSection) => void;
}

const destinations: Array<{ id: PlatformAdminSection; label: string }> = [
  { id: 'capacity', label: 'Capacity' },
  { id: 'users', label: 'Users' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'messages', label: 'Messages' },
];

export function PlatformAdminShell({
  activeSection,
  children,
  mobileTitle,
  onBackToApp,
  onNavigate,
}: PlatformAdminShellProps) {
  return (
    <div className={styles.shell}>
      <aside className={styles.rail} aria-label="Platform administration">
        <div className={styles.railBrand}>
          <strong>Workout Game</strong>
          <span>Platform administration</span>
        </div>
        <p className={styles.railLabel}>Operations</p>
        <nav className={styles.railNav} aria-label="Platform administration destinations">
          {destinations.map((destination) => (
            <button
              aria-current={activeSection === destination.id ? 'page' : undefined}
              className={styles.railDestination}
              data-active={activeSection === destination.id}
              key={destination.id}
              onClick={() => onNavigate(destination.id)}
              type="button"
            >
              {destination.label}
            </button>
          ))}
        </nav>
        <button className={styles.railButton} onClick={onBackToApp} type="button">Back to app</button>
      </aside>

      <div className={styles.content}>
        <div className={styles.mobileBar}>
          <button className={styles.mobileBack} onClick={onBackToApp} type="button">Back</button>
          <strong className={styles.mobileTitle}>{mobileTitle}</strong>
          <span aria-hidden="true" />
        </div>
        <nav className={styles.mobileNav} aria-label="Platform administration destinations">
          {destinations.map((destination) => (
            <button
              aria-current={activeSection === destination.id ? 'page' : undefined}
              data-active={activeSection === destination.id}
              key={destination.id}
              onClick={() => onNavigate(destination.id)}
              type="button"
            >
              {destination.label}
            </button>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
