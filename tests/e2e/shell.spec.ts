import { expect, test } from '@playwright/test';

test('root reaches an actionable setup or signed-out authentication state', async ({ page }) => {
  await page.goto('/');

  const setupHeading = page.getByRole('heading', { name: 'Connect Supabase' });
  const signInHeading = page.getByRole('heading', { name: 'Sign in' });

  await expect(setupHeading.or(signInHeading)).toBeVisible();

  if (await signInHeading.isVisible()) {
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create an account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible();
  } else {
    await expect(page.getByText(/docs\/SUPABASE-SETUP\.md/i)).toBeVisible();
  }
});
