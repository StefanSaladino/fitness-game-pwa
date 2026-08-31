import { expect, test } from '@playwright/test';

test('badge gallery stays complete, rotatable, and overflow-safe across product shells', async ({ page }) => {
  await page.goto('/badges.e2e.html');

  await expect(page.getByRole('heading', { name: 'Badge gallery' })).toBeVisible();
  await expect(page.getByLabel('3 of 14 badges earned')).toBeVisible();
  await expect(page.locator('[data-badge-gallery-item]')).toHaveCount(14);
  await expect(page.locator('[data-badge-emblem="top-set"]')).toHaveCount(14);
  await expect(page.locator('[data-badge-state="earned"]')).toHaveCount(3);
  await expect(page.locator('[data-badge-state="locked"]')).toHaveCount(11);

  const firstBadge = page.locator('[data-badge-key="FIRST_PR"]');
  await expect(firstBadge).toHaveAttribute('data-rotation', '0');
  await firstBadge.click();
  await expect(firstBadge).toHaveAttribute('data-rotation', '180');
  await expect(firstBadge).toHaveAttribute('aria-pressed', 'true');
  await firstBadge.press('Enter');
  await expect(firstBadge).toHaveAttribute('data-rotation', '360');
  await expect(firstBadge).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('button', { name: 'Earned 3' }).click();
  await expect(page.locator('[data-badge-gallery-item]')).toHaveCount(3);
  await page.getByRole('button', { name: 'Locked 11' }).click();
  await expect(page.locator('[data-badge-gallery-item]')).toHaveCount(11);
  await page.getByRole('button', { name: 'All' }).click();
  await expect(page.locator('[data-badge-gallery-item]')).toHaveCount(14);

  const dimensions = await firstBadge.boundingBox();
  expect(dimensions).not.toBeNull();
  expect(Math.abs((dimensions?.width ?? 0) - (dimensions?.height ?? 0))).toBeLessThanOrEqual(1);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
