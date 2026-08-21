import { expect, test } from '@playwright/test';

test('workout recovery and queued mutations migrate to IndexedDB and survive reload', async ({ page }) => {
  await page.goto('/indexeddb.e2e.html');
  await expect(page.getByText('Recovery: empty')).toBeVisible();
  await expect(page.getByText('Queue: empty')).toBeVisible();

  await page.getByRole('button', { name: 'Seed legacy state' }).click();
  await expect(page.getByText('Recovery: indexeddb-workout-1')).toBeVisible();
  await expect(page.getByText('Queue: ADD_SET')).toBeVisible();
  await expect(page.getByText('Legacy keys: cleared')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Recovery: indexeddb-workout-1')).toBeVisible();
  await expect(page.getByText('Queue: ADD_SET')).toBeVisible();
  await expect(page.getByText('Legacy keys: cleared')).toBeVisible();

  await page.getByRole('button', { name: 'Clear durable state' }).click();
  await expect(page.getByText('Recovery: empty')).toBeVisible();
  await expect(page.getByText('Queue: empty')).toBeVisible();
});
