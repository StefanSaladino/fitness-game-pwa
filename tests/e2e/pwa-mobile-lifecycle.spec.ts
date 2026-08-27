import { expect, test } from '@playwright/test';

test('platform PWA contract stays truthful across desktop, Android Chromium, and iOS-class WebKit', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('#root')).not.toBeEmpty();

  if (testInfo.project.name === 'webkit-mobile') {
    await expect(page.getByText('Add Top Set to Home Screen')).toBeVisible();
    await expect(page.getByText(/Share → Add to Home Screen/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Install' })).toHaveCount(0);
    return;
  }

  const manifest = await page.evaluate(async () => {
    const response = await fetch('/manifest.webmanifest', { cache: 'no-store' });
    return response.json() as Promise<{ id?: string; start_url?: string; scope?: string; display?: string }>;
  });
  expect(manifest).toEqual(expect.objectContaining({ id: '/', start_url: '/', scope: '/', display: 'standalone' }));

  if (testInfo.project.name === 'chromium-android') {
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBeLessThanOrEqual(500);
  }
});
