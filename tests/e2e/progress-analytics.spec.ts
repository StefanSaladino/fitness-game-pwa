import { expect, test } from '@playwright/test';

test('lifting analytics stays readable and complete across responsive product shells', async ({ page }) => {
  await page.goto('/progress.e2e.html');

  await expect(page.getByRole('heading', { name: 'Know your trend. Beat your last.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Barbell Bench Press' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'e1RM trend' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Volume history' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'PR timeline' })).toBeVisible();
  await expect(page.getByText('128.3 kg', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/8,520 kg·reps/).first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
