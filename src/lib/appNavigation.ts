import { useEffect, useState } from 'react';

export function currentPathname(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

function notifyNavigation() {
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function navigateToPath(pathname: string): void {
  if (typeof window === 'undefined' || window.location.pathname === pathname) return;
  window.history.pushState({}, '', pathname);
  notifyNavigation();
}

export function replacePath(pathname: string): void {
  if (typeof window === 'undefined' || window.location.pathname === pathname) return;
  window.history.replaceState({}, '', pathname);
  notifyNavigation();
}

export function usePathname(): string {
  const [pathname, setPathname] = useState(currentPathname);

  useEffect(() => {
    const sync = () => setPathname(currentPathname());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  return pathname;
}
