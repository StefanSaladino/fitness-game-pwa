import { expect, test } from '@playwright/test';

test('user administration stays responsive and completes an audited restore flow', async ({ page }) => {
  await page.goto('/user-administration.e2e.html');

  await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: /Alpha User/ }).click();
  await expect(page.getByText('11111111-1111-4111-8111-111111111111')).toBeVisible();
  await page.getByRole('button', { name: 'Restore account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Restore account' });
  await dialog.getByRole('textbox', { name: 'Audit reason' }).fill('Review completed');
  await dialog.getByRole('button', { name: 'Restore account' }).click();

  await expect(page.getByText('Account restored.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Suspend account' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
