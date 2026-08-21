import { expect, test } from '@playwright/test';

test('production app shell boots from cache during an offline navigation', async ({ page, context, browserName }) => {
  test.skip(
    browserName !== 'chromium',
    'Playwright service-worker support is Chromium-only; WebKit/iOS PWA lifecycle validation belongs to Phase 12D.',
  );

  await page.goto('/');

  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service workers are unavailable in this browser.');
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
    });
  });

  const cachedShellPaths = await page.evaluate(async () => {
    const cacheNames = (await caches.keys()).filter((name) => name.startsWith('workout-game-shell-'));
    const paths: string[] = [];
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) paths.push(new URL(request.url).pathname);
    }
    return paths;
  });

  expect(cachedShellPaths.some((path) => /^\/assets\/.*\.js$/.test(path))).toBe(true);
  expect(cachedShellPaths.some((path) => /^\/assets\/.*\.css$/.test(path))).toBe(true);

  await context.setOffline(true);
  try {
    const networkIsActuallyOffline = await page.evaluate(async () => {
      try {
        await fetch(`/__phase12b-network-probe__?t=${Date.now()}`, { cache: 'no-store' });
        return false;
      } catch {
        return true;
      }
    });
    expect(networkIsActuallyOffline).toBe(true);

    await page.evaluate(() => {
      window.location.assign('/?offline-shell=1');
    });
    await expect(page).toHaveURL(/\?offline-shell=1$/);
    await expect(page.locator('#root')).not.toBeEmpty();
  } finally {
    await context.setOffline(false);
  }
});
