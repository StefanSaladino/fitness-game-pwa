import { expect, test } from '@playwright/test';

test('competition stays privacy-safe and usable across responsive product shells', async ({ page }) => {
  await page.goto('/competition.e2e.html');

  await expect(page.getByRole('heading', { name: 'Crew standings' })).toBeVisible();
  await expect(page.getByText(/Individual sets, workout notes, and full exercise details stay private/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Highlights, not surveillance' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'All time' }).click();
  await expect(page.getByText('1200 XP')).toBeVisible();

  const fire = page.getByRole('button', { name: /Fire 2/i });
  await fire.click();
  await expect(page.getByRole('button', { name: /Fire 3/i })).toHaveAttribute('aria-pressed', 'true');
});
