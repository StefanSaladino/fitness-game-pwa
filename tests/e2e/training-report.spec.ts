import { expect, test } from '@playwright/test';

test('completed monthly report preserves exact report copy and UTF-8 navigation symbols', async ({ page }) => {
  await page.goto('/release-visual-audit.e2e.html?surface=training-report');

  await expect(
    page.getByRole('heading', { name: 'What changed. What to do next.' }),
  ).toBeVisible();

  const cadence = page.getByRole('group', { name: 'Report cadence' });

  await expect(
    cadence.getByRole('button', { name: 'Month', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');

  await expect(page.getByText('Completed month', { exact: true })).toBeVisible();
  await expect(page.getByText('August 2026', { exact: true })).toBeVisible();

  const previous = page.getByRole('button', { name: 'Previous report period' });
  const next = page.getByRole('button', { name: 'Next report period' });

  await expect(previous).toHaveText('←');
  await expect(next).toHaveText('→');

  await expect(
    page.getByRole('button', { name: 'Download monthly PDF', exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole('heading', { name: 'Next 7 days', exact: true }),
  ).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('â†');
  expect(bodyText).not.toContain('â€“');
  expect(bodyText).not.toContain('â€”');
  expect(bodyText).not.toContain('â€™');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
