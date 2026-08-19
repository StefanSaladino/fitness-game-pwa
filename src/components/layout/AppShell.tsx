import type { PropsWithChildren } from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileNav } from './MobileNav';
import { primaryNavigation, type AppSection, type NavigationItem } from './navigation';

interface AppShellProps {
  activeItem?: AppSection;
  navigationItems?: NavigationItem[];
  userLabel: string;
  userMeta?: string;
  onNavigate?: (item: AppSection) => void;
  onSignOut?: () => void;
}

export function AppShell({
  children,
  activeItem = 'home',
  navigationItems = primaryNavigation,
  userLabel,
  userMeta,
  onNavigate,
  onSignOut,
}: PropsWithChildren<AppShellProps>) {
  return (
    <div className="product-shell">
      <DesktopSidebar
        activeItem={activeItem}
        items={navigationItems}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        userLabel={userLabel}
        userMeta={userMeta}
      />
      <main className="product-main">{children}</main>
      <MobileNav activeItem={activeItem} items={navigationItems} onNavigate={onNavigate} />
    </div>
  );
}
