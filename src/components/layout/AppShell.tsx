import type { PropsWithChildren } from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileNav } from './MobileNav';
import { ShellHeader } from './ShellHeader';
import { primaryNavigation, type AppSection, type NavigationItem } from './navigation';
import styles from './AppShell.module.css';

interface AppShellProps {
  activeItem?: AppSection;
  navigationItems?: NavigationItem[];
  userLabel: string;
  userMeta?: string;
  mobileTitle?: string;
  onNavigate?: (item: AppSection) => void;
  onSignOut?: () => void;
}

const sectionTitles: Record<AppSection, string> = {
  home: 'Home',
  workouts: 'Lift',
  cardio: 'Cardio',
  groups: 'Groups',
  progress: 'Progress',
  compete: 'Compete',
  profile: 'Settings',
};

export function AppShell({
  children,
  activeItem = 'home',
  navigationItems = primaryNavigation,
  userLabel,
  userMeta,
  mobileTitle,
  onNavigate,
  onSignOut,
}: PropsWithChildren<AppShellProps>) {
  const resolvedMobileTitle = mobileTitle
    ?? navigationItems.find((item) => item.id === activeItem)?.label
    ?? sectionTitles[activeItem];

  return (
    <div className={styles.shell}>
      <DesktopSidebar
        activeItem={activeItem}
        items={navigationItems}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        userLabel={userLabel}
        userMeta={userMeta}
      />
      <div className={styles.viewport}>
        <ShellHeader onNavigate={onNavigate} onSignOut={onSignOut} title={resolvedMobileTitle} userLabel={userLabel} />
        <main className={styles.main} data-app-scroll-owner>{children}</main>
      </div>
      <MobileNav activeItem={activeItem} items={navigationItems} onNavigate={onNavigate} />
    </div>
  );
}
