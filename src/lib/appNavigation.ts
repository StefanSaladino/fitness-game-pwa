import { useEffect, useState } from 'react';

export type ProductPathSection = 'home' | 'workouts' | 'cardio' | 'groups' | 'progress' | 'compete';

const PRODUCT_SECTION_PATHS: Record<ProductPathSection, string> = {
  home: '/',
  workouts: '/lift',
  cardio: '/cardio',
  groups: '/groups',
  progress: '/progress',
  compete: '/compete',
};

const PRODUCT_PATH_SECTIONS = new Map(
  Object.entries(PRODUCT_SECTION_PATHS).map(([section, pathname]) => [pathname, section as ProductPathSection]),
);

export function currentPathname(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

function notifyNavigation() {
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function currentLocationPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function productPathForSection(section: ProductPathSection): string {
  return PRODUCT_SECTION_PATHS[section];
}

export function productSectionFromPathname(pathname: string): ProductPathSection | null {
  return PRODUCT_PATH_SECTIONS.get(pathname) ?? null;
}

export function legacyProductSectionFromLocation(): ProductPathSection | null {
  if (typeof window === 'undefined' || window.location.pathname !== '/') return null;
  const requested = new URLSearchParams(window.location.search).get('section');
  return requested === 'workouts' || requested === 'cardio' || requested === 'groups'
    || requested === 'progress' || requested === 'compete' ? requested : null;
}

export function navigateToPath(pathname: string): void {
  if (typeof window === 'undefined' || currentLocationPath() === pathname) return;
  window.history.pushState({}, '', pathname);
  notifyNavigation();
}

export function replacePath(pathname: string): void {
  if (typeof window === 'undefined' || currentLocationPath() === pathname) return;
  window.history.replaceState({}, '', pathname);
  notifyNavigation();
}

export function usePathname(): string {
  const [location, setLocation] = useState(() => ({
    pathname: currentPathname(),
    locationPath: typeof window === 'undefined' ? '/' : currentLocationPath(),
  }));

  useEffect(() => {
    const sync = () => setLocation({ pathname: currentPathname(), locationPath: currentLocationPath() });
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  return location.pathname;
}
