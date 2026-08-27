import { expect, test } from '@playwright/test';

test('cardio keeps quick logging ahead of its separate accessory history', async ({ page }) => {
  await page.goto('/cardio.e2e.html');

  await expect(page.getByRole('heading', { name: 'Log cardio' })).toBeVisible();
  await expect(page.getByText(/never counts as a lifting day/i)).toBeVisible();
  await expect(page.locator('[data-cardio-surface="quick-log"]')).toBeVisible();
  await expect(page.locator('[data-cardio-surface="summary"]')).toBeVisible();
  await expect(page.locator('[data-cardio-surface="history"]')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Cardio activity' })).toBeVisible();
  await expect(page.getByText('45 XP bonus')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent cardio' })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('progress and cardio remain contained at a 320px app viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });

  await page.goto('/cardio.e2e.html');
  await expect(page.locator('[data-cardio-surface="quick-log"]')).toBeVisible();
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const cardioRows = page.locator('[data-cardio-surface="history"] li');
  await expect(cardioRows.first()).toBeVisible();
  const firstCardioRow = await cardioRows.first().boundingBox();
  expect(firstCardioRow?.width ?? 999).toBeLessThanOrEqual(288);

  await page.goto('/progress.e2e.html');
  await expect(page.locator('[data-progress-surface="history"]')).toBeVisible();
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const chartWidths = await page.locator('[data-progress-surface="trends"] svg').evaluateAll((charts) => (
    charts.map((chart) => ({ clientWidth: chart.clientWidth, parentWidth: chart.parentElement?.clientWidth ?? 0 }))
  ));
  expect(chartWidths.every(({ clientWidth, parentWidth }) => clientWidth <= parentWidth)).toBe(true);
});
