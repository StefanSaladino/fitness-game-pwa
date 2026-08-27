import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test('auth puts the sign-in task in the first mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/app-composition.e2e.html?surface=auth');

  await expect(page.locator('[data-auth-composition]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  const button = await page.getByRole('button', { name: 'Sign in' }).boundingBox();
  expect(button?.y ?? 999).toBeLessThan(740);
  await expectNoHorizontalOverflow(page);
});

test('onboarding exposes one concern at a time with a persistent mobile action', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/app-composition.e2e.html?surface=onboarding');

  await expect(page.getByText('Step 1 of 3')).toBeVisible();
  await page.getByRole('textbox', { name: 'Username' }).fill('alex_lifts');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Step 2 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Step 3 of 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete setup' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('legal and platform operations retain their hierarchy at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/app-composition.e2e.html?surface=legal');
  await expect(page.locator('[data-legal-composition]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto('/app-composition.e2e.html?surface=admin');
  await expect(page.locator('[data-admin-composition]')).toBeVisible();
  await expect(page.locator('[data-admin-surface="telemetry"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Platform overview', level: 1 })).toBeVisible();
  await expect(page.getByText('Supabase connected')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('mobile Messages, Settings, and Sign out remain separate one-tap header actions', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/app-composition.e2e.html?surface=header');

  const controls = [
    page.getByRole('button', { name: 'Messages' }),
    page.getByRole('button', { name: 'Open Profile and Settings for Alex' }),
    page.getByRole('button', { name: 'Sign out' }),
  ];
  for (const control of controls) await expect(control).toBeVisible();

  const boxes = await Promise.all(controls.map((control) => control.boundingBox()));
  expect(boxes.every(Boolean)).toBe(true);
  expect((boxes[0]?.x ?? 0) + (boxes[0]?.width ?? 0)).toBeLessThanOrEqual(boxes[1]?.x ?? 0);
  expect((boxes[1]?.x ?? 0) + (boxes[1]?.width ?? 0)).toBeLessThanOrEqual(boxes[2]?.x ?? 0);
  await expectNoHorizontalOverflow(page);
});

test('recipient inbox deletion is confirmation-gated and contained on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/app-composition.e2e.html?surface=messages');
  await page.getByRole('button', { name: 'Messages' }).click();
  await expect(page.getByText('Training update')).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: 'Delete message?' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('No messages yet.')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
