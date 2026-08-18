import { expect, test } from '@playwright/test';

test('configured app reaches the signed-out authentication shell', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Sign in' }),
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Sign in' }),
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Forgot password?' }),
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Create an account' }),
  ).toBeVisible();
});