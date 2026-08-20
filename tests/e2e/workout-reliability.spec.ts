import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('phone recovery keeps offline set drafts editable while server actions stay gated', async ({ page }) => {
  await page.goto('/reliability.e2e.html?state=offline');

  await expect(page.getByText('Offline workout copy')).toBeVisible();
  await expect(page.getByText('1 workout change queued')).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Set 1 weight in kg' })).toHaveValue('107.5');
  await expect(page.getByRole('spinbutton', { name: 'Set 1 weight in kg' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '+ Working set' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Finish workout' })).toBeDisabled();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('phone conflict locks edits until the user explicitly chooses the server version', async ({ page }) => {
  await page.goto('/reliability.e2e.html?state=conflict');

  await expect(page.getByText('Workout changed elsewhere')).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Set 1 weight in kg' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Use server version' })).toBeVisible();

  await page.getByRole('button', { name: 'Use server version' }).click();

  await expect(page.getByText('Workout changed elsewhere')).not.toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Set 1 weight in kg' })).toBeEnabled();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
